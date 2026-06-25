// Netlify Function: Monthly Automated Scan Cron Job
// Runs 1st of every month at 9 AM
// Scans all clients and emails reports automatically

const { createClient } = require('@supabase/supabase-js');
const pa11y = require('pa11y');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const nodemailer = require('nodemailer');

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

exports.handler = async (event, context) => {
  // Verify cron secret to prevent unauthorized calls
  const cronSecret = event.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, error: 'Unauthorized' })
    };
  }

  try {
    console.log('Starting monthly automated scans...');

    // Get all clients with scanning enabled
    const { data: clients, error: clientsError } = await supabase
      .from('client_scan_settings')
      .select(`
        *,
        clients:client_id (*)
      `)
      .eq('monthly_scan_enabled', true);

    if (clientsError) throw clientsError;

    console.log(`Found ${clients?.length || 0} clients to scan`);

    const results = [];

    // Scan each client
    for (const setting of clients || []) {
      const client = setting.clients;
      
      try {
        console.log(`Scanning ${client.domain}...`);
        
        const scanResult = await scanClient(client);
        
        if (scanResult.success) {
          // Email the report
          await emailReport(client, scanResult);
          
          results.push({
            client: client.name,
            domain: client.domain,
            status: 'success',
            score: scanResult.score
          });
        } else {
          results.push({
            client: client.name,
            domain: client.domain,
            status: 'failed',
            error: scanResult.error
          });
        }
      } catch (err) {
        console.error(`Error scanning ${client.domain}:`, err);
        results.push({
          client: client.name,
          domain: client.domain,
          status: 'error',
          error: err.message
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        scanned: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status !== 'success').length,
        results: results
      })
    };

  } catch (error) {
    console.error('Monthly scan cron error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

async function scanClient(client) {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless
  });

  try {
    const scanUrl = `https://${client.domain}`;
    const results = await pa11y(scanUrl, {
      browser: browser,
      standard: 'WCAG2AA',
      timeout: 60000,
      wait: 2000,
      ignore: ['notice']
    });

    const errorCount = results.issues.filter(i => i.type === 'error').length;
    const warningCount = results.issues.filter(i => i.type === 'warning').length;
    const noticeCount = results.issues.filter(i => i.type === 'notice').length;
    
    let overallScore = Math.max(0, Math.round(100 - (errorCount * 5) - (warningCount * 2) - (noticeCount * 0.5)));

    // Get previous scan
    const { data: previousScan } = await supabase
      .from('scan_reports')
      .select('*')
      .eq('client_id', client.id)
      .order('scan_date', { ascending: false })
      .limit(1)
      .single();

    // Store scan results
    const { data: scanReport } = await supabase
      .from('scan_reports')
      .insert({
        client_id: client.id,
        domain: client.domain,
        overall_score: overallScore,
        error_count: errorCount,
        warning_count: warningCount,
        notice_count: noticeCount,
        scan_results: results,
        previous_scan_id: previousScan?.id || null,
        improvement_score: previousScan ? overallScore - previousScan.overall_score : null
      })
      .select()
      .single();

    // Update client settings
    await supabase
      .from('client_scan_settings')
      .upsert({
        client_id: client.id,
        last_scan_at: new Date().toISOString(),
        last_scan_score: overallScore,
        scan_count: supabase.rpc('increment_scan_count', { client_id: client.id })
      }, { onConflict: 'client_id' });

    return {
      success: true,
      scanId: scanReport.id,
      score: overallScore,
      errors: errorCount,
      warnings: warningCount,
      improvement: previousScan ? overallScore - previousScan.overall_score : null,
      results: results
    };

  } finally {
    await browser.close();
  }
}

async function emailReport(client, scanResult) {
  // Get SMTP settings
  const { data: smtpData } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'automation_settings')
    .maybeSingle();
  
  const smtpSettings = smtpData?.value 
    ? (typeof smtpData.value === 'string' ? JSON.parse(smtpData.value) : smtpData.value)
    : {};

  if (!smtpSettings.smtpHost || !smtpSettings.smtpUser || !smtpSettings.smtpPass) {
    console.log('SMTP not configured, skipping email');
    return;
  }

  // Build email
  const transporter = nodemailer.createTransport({
    host: smtpSettings.smtpHost,
    port: parseInt(smtpSettings.smtpPort) || 587,
    secure: (parseInt(smtpSettings.smtpPort) || 587) === 465,
    auth: {
      user: smtpSettings.smtpUser,
      pass: smtpSettings.smtpPass
    }
  });

  const scoreColor = scanResult.score >= 90 ? '#22c55e' : 
                     scanResult.score >= 70 ? '#eab308' : 
                     scanResult.score >= 50 ? '#f97316' : '#ef4444';

  const improvementText = scanResult.improvement !== null 
    ? (scanResult.improvement > 0 ? `+${scanResult.improvement} from last month` :
       scanResult.improvement < 0 ? `${scanResult.improvement} from last month` :
       'Same as last month')
    : 'First scan';

  const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #007bff; color: white; padding: 30px; text-align: center; }
    .score-box { background: ${scoreColor}20; border: 3px solid ${scoreColor}; border-radius: 10px; padding: 30px; text-align: center; margin: 20px 0; }
    .score-number { font-size: 72px; font-weight: bold; color: ${scoreColor}; }
    .score-label { font-size: 18px; color: #666; }
    .content { background: #f8f9fa; padding: 30px; }
    .stats { display: flex; justify-content: space-around; margin: 20px 0; }
    .stat { text-align: center; }
    .stat-number { font-size: 32px; font-weight: bold; }
    .stat-label { color: #666; }
    .error { color: #ef4444; }
    .warning { color: #eab308; }
    .button { display: inline-block; background: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Your Monthly ADA Compliance Report</h1>
      <p>${client.name} - ${client.domain}</p>
    </div>
    
    <div class="content">
      <div class="score-box">
        <div class="score-number">${scanResult.score}</div>
        <div class="score-label">Accessibility Score / 100</div>
        <p style="margin-top: 10px; color: ${scoreColor};">${improvementText}</p>
      </div>
      
      <h2>📈 This Month's Findings</h2>
      <div class="stats">
        <div class="stat">
          <div class="stat-number error">${scanResult.errors}</div>
          <div class="stat-label">Errors</div>
        </div>
        <div class="stat">
          <div class="stat-number warning">${scanResult.warnings}</div>
          <div class="stat-label">Warnings</div>
        </div>
      </div>
      
      <h3>🎯 What This Means</h3>
      <p>Your website was scanned for WCAG 2.1 AA compliance. ${scanResult.score >= 90 
        ? 'Excellent work! Your site is highly accessible.' 
        : scanResult.score >= 70 
        ? 'Good progress! There are some improvements to make.' 
        : 'Your site needs accessibility improvements to meet compliance standards.'}</p>
      
      <h3>🔧 Need Help Fixing Issues?</h3>
      <p>As part of your ADA widget subscription, you receive these monthly compliance reports at no additional cost.</p>
      
      <p style="text-align: center;">
        <a href="https://swiftimpactsolutions.com/contact" class="button">Request Help</a>
      </p>
      
      <p style="font-size: 12px; color: #666; margin-top: 30px;">
        This automated report is generated monthly as part of your ADA compliance monitoring service. 
        Next scan: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
      </p>
    </div>
    
    <div class="footer">
      <p>Powered by SwiftImpact Solutions</p>
      <p>Making the web accessible for everyone</p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"${smtpSettings.fromName || 'SwiftImpact Solutions'}" <${smtpSettings.fromEmail || smtpSettings.smtpUser}>`,
    to: client.contact_email,
    subject: `📊 Your Monthly ADA Compliance Report - ${client.domain}`,
    html: emailHtml
  });

  // Mark as emailed
  await supabase
    .from('scan_reports')
    .update({
      email_sent: true,
      email_sent_at: new Date().toISOString()
    })
    .eq('id', scanResult.scanId);

  console.log(`Report emailed to ${client.contact_email}`);
}
