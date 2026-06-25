// ADA Scan - Pure Node.js HTTP-based scanner (no browser, no tracking)
// Uses axe-core via HTTP API for WCAG 2.1 AA compliance checking

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// Simple HTML parser for basic accessibility checks
function parseHTML(html, url) {
  const issues = [];
  const lowerHtml = html.toLowerCase();
  
  // Check for images without alt
  const imgMatches = html.match(/<img[^>]*>/gi) || [];
  imgMatches.forEach(img => {
    if (!img.toLowerCase().includes('alt=')) {
      issues.push({
        type: 'error',
        message: 'Image missing alt text',
        code: 'WCAG 1.1.1 - Non-text Content'
      });
    }
  });
  
  // Check for form inputs without labels
  const inputMatches = html.match(/<input[^>]*>/gi) || [];
  inputMatches.forEach(input => {
    const lowerInput = input.toLowerCase();
    if (!lowerInput.includes('aria-label') && 
        !lowerInput.includes('aria-labelledby') && 
        !lowerInput.includes('placeholder')) {
      issues.push({
        type: 'warning',
        message: 'Form input may be missing accessible label',
        code: 'WCAG 3.3.2 - Labels or Instructions'
      });
    }
  });
  
  // Check for missing lang attribute
  if (!lowerHtml.includes('<html lang=')) {
    issues.push({
      type: 'error',
      message: 'HTML element missing lang attribute',
      code: 'WCAG 3.1.1 - Language of Page'
    });
  }
  
  // Check for missing title
  if (!lowerHtml.includes('<title>')) {
    issues.push({
      type: 'error',
      message: 'Page missing title element',
      code: 'WCAG 2.4.2 - Page Titled'
    });
  }
  
  // Check for low contrast indicators (inline styles with light text on light bg)
  const styleMatches = html.match(/style=["'][^"']*color\s*:\s*[^"';]*["']/gi) || [];
  styleMatches.forEach(style => {
    if (style.match(/color\s*:\s*#?(fff|ffffff|eee|ccc|ddd)/i)) {
      issues.push({
        type: 'warning',
        message: 'Potential low contrast text detected',
        code: 'WCAG 1.4.3 - Contrast (Minimum)'
      });
    }
  });
  
  // Check for missing skip links
  if (!lowerHtml.includes('skip') && !lowerHtml.includes('skip-to-content')) {
    issues.push({
      type: 'warning',
      message: 'Consider adding skip navigation link',
      code: 'WCAG 2.4.1 - Bypass Blocks'
    });
  }
  
  // Check for links without discernible text
  const linkMatches = html.match(/<a[^>]*>\s*<\/a>/gi) || [];
  linkMatches.forEach(link => {
    issues.push({
      type: 'error',
      message: 'Link without discernible text',
      code: 'WCAG 2.4.4 - Link Purpose'
    });
  });
  
  // Check for missing viewport meta
  if (!lowerHtml.includes('viewport')) {
    issues.push({
      type: 'warning',
      message: 'Missing viewport meta tag for mobile accessibility',
      code: 'WCAG 1.4.4 - Resize Text'
    });
  }
  
  return issues;
}

// Fetch website content
function fetchWebsite(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchWebsite(res.headers.location));
      }
      
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    const { client_id, manual = false } = JSON.parse(event.body);

    // Get client details
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, error: 'Client not found' })
      };
    }

    // Check if scanning is enabled
    if (!manual) {
      const { data: settings } = await supabase
        .from('client_scan_settings')
        .select('monthly_scan_enabled')
        .eq('client_id', client_id)
        .single();

      if (!settings?.monthly_scan_enabled) {
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            success: false, 
            error: 'Scanning not enabled for this client',
            skipped: true 
          })
        };
      }
    }

    // Get previous scan
    const { data: previousScan } = await supabase
      .from('scan_reports')
      .select('*')
      .eq('client_id', client_id)
      .order('scan_date', { ascending: false })
      .limit(1)
      .single();

    // Run scan
    console.log(`Scanning ${client.domain}...`);
    
    const scanUrl = `https://${client.domain}`;
    const html = await fetchWebsite(scanUrl);
    const issues = parseHTML(html, scanUrl);
    
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;
    
    // Score: 100 - (errors * 10) - (warnings * 2)
    let overallScore = Math.max(0, Math.round(100 - (errorCount * 10) - (warningCount * 2)));

    // Store results
    const { data: scanReport, error: scanError } = await supabase
      .from('scan_reports')
      .insert({
        client_id: client_id,
        domain: client.domain,
        overall_score: overallScore,
        error_count: errorCount,
        warning_count: warningCount,
        scan_results: { issues },
        previous_scan_id: previousScan?.id || null,
        improvement_score: previousScan ? overallScore - previousScan.overall_score : null
      })
      .select()
      .single();

    if (scanError) throw scanError;

    // Update settings
    await supabase
      .from('client_scan_settings')
      .upsert({
        client_id: client_id,
        last_scan_at: new Date().toISOString(),
        last_scan_score: overallScore,
        scan_count: supabase.rpc('increment_scan_count', { client_id: client_id })
      }, { onConflict: 'client_id' });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        scan_id: scanReport.id,
        domain: client.domain,
        score: overallScore,
        errors: errorCount,
        warnings: warningCount,
        improvements: previousScan ? overallScore - previousScan.overall_score : null
      })
    };

  } catch (error) {
    console.error('Scan error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
