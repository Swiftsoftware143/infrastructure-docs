// ADASwift Webhook Receiver
// Triggers existing widget automation when lead comes from FunnelSwift

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const WEBHOOK_SECRET = process.env.FUNNELSWIFT_WEBHOOK_SECRET || 'whsec_adaswift_secret';

exports.handler = async (event, context) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Verify webhook secret
    const authHeader = event.headers.authorization || '';
    if (!authHeader.includes(WEBHOOK_SECRET)) {
      return { statusCode: 401, body: 'Unauthorized' };
    }

    const { event: eventType, data, tracking_id } = JSON.parse(event.body);

    if (eventType !== 'create_client') {
      return { statusCode: 400, body: 'Unknown event type' };
    }

    // Create DEMO account with 30-day free trial
    const demoResult = await createDemoAccount({
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      company: data.company,
      website_url: data.website_url,
      funnelswift_contact_id: data.contact_id,
      funnelswift_tracking_id: tracking_id,
      referred_by_user_id: data.referred_by_user_id,
    });

    if (!demoResult.success) {
      throw new Error(demoResult.error || 'Demo creation failed');
    }

    // Call the EXISTING widget automation (same as manual input)
    const automationResult = await triggerWidgetAutomation({
      contact_email: data.email,
      contact_name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
      business_name: data.company || data.first_name || 'Business',
      domain: data.website_url || '',
      plan_tier: 'demo', // DEMO plan (not starter)
      trigger_source: 'funnelswift',
      trigger_id: tracking_id,
      funnelswift_contact_id: data.contact_id,
      referred_by_user_id: data.referred_by_user_id,
    });

    if (!automationResult.success) {
      throw new Error(automationResult.error || 'Automation failed');
    }

    // Log success
    await supabase.from('integration_events').insert({
      source: 'funnelswift',
      event_type: 'widget_automation_triggered',
      tracking_id: tracking_id,
      payload: { 
        contact_id: data.contact_id,
        automation_log_id: automationResult.log_id,
        client_id: automationResult.client_id
      },
      status: 'success',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Widget automation triggered successfully',
        client_id: automationResult.client_id,
        log_id: automationResult.log_id,
      }),
    };

  } catch (error) {
    console.error('Webhook error:', error);
    
    // Log error
    await supabase.from('integration_events').insert({
      source: 'funnelswift',
      event_type: 'widget_automation_triggered',
      payload: event.body,
      status: 'failed',
      error_message: error.message,
    });

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// Create DEMO account with 30-day trial
async function createDemoAccount(data) {
  try {
    // Generate demo code
    const demoCode = 'DEMO-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Calculate trial end date (30 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);
    
    // Create demo account
    const { data: demoAccount, error: demoError } = await supabase
      .from('demo_accounts')
      .insert({
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        company: data.company,
        demo_code: demoCode,
        status: 'active',
        trial_days: 30,
        trial_ends_at: trialEndsAt.toISOString(),
        funnelswift_contact_id: data.funnelswift_contact_id,
        funnelswift_tracking_id: data.funnelswift_tracking_id,
        referred_by_user_id: data.referred_by_user_id,
        source: 'funnelswift',
      })
      .select()
      .single();

    if (demoError) throw demoError;

    // Send welcome email with upgrade prompt
    await sendDemoWelcomeEmail({
      to: data.email,
      firstName: data.first_name,
      demoCode: demoCode,
      trialEndsAt: trialEndsAt,
      upgradeUrl: 'https://your-checkout.com/adaswift-upgrade',
    });

    return {
      success: true,
      demo_id: demoAccount.id,
      demo_code: demoCode,
      message: 'Demo account created with 30-day trial',
    };

  } catch (error) {
    console.error('Demo creation error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Send demo welcome email with upgrade prompt
async function sendDemoWelcomeEmail({ to, firstName, demoCode, trialEndsAt, upgradeUrl }) {
  const emailHtml = `
    <h1>Welcome to ADASwift, ${firstName}!</h1>
    <p>Your ADA compliance widget demo is ready.</p>
    
    <h2>Your Demo Details:</h2>
    <ul>
      <li><strong>Demo Code:</strong> ${demoCode}</li>
      <li><strong>Trial Ends:</strong> ${trialEndsAt.toLocaleDateString()}</li>
    </ul>
    
    <h2>What's Included:</h2>
    <ul>
      <li>Full widget functionality</li>
      <li>All accessibility profiles</li>
      <li>30 days free</li>
    </ul>
    
    <h2>Ready to Upgrade?</h2>
    <p>Keep your widget active after the trial:</p>
    <a href="${upgradeUrl}" style="padding: 12px 24px; background: #5B4FFF; color: white; text-decoration: none; border-radius: 5px;">Upgrade Now</a>
    
    <p>Questions? Reply to this email.</p>
  `;

  // TODO: Send via your email provider
  console.log('Demo welcome email would be sent to:', to);
  
  return { success: true };
}

// Trigger the EXISTING widget automation (same code path as manual input)
async function triggerWidgetAutomation(data) {
  try {
    // Validate required fields
    const required = ['contact_email', 'business_name', 'domain'];
    const missing = required.filter(f => !data[f]);
    
    if (missing.length > 0) {
      return { 
        success: false, 
        error: `Missing required fields: ${missing.join(', ')}` 
      };
    }

    // Clean domain
    const domain = data.domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .toLowerCase();

    // Check if automation is enabled
    const { data: enabledData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'automation_enabled')
      .maybeSingle();
    
    const automationEnabled = enabledData?.value === 'true' || enabledData?.value === true;

    // Log the automation request
    const { data: logEntry, error: logError } = await supabase
      .from('widget_automation_log')
      .insert({
        trigger_source: data.trigger_source || 'funnelswift',
        trigger_id: data.trigger_id || null,
        contact_email: data.contact_email.toLowerCase().trim(),
        contact_name: data.contact_name || data.contact_email.split('@')[0],
        business_name: data.business_name,
        domain: domain,
        plan_tier: data.plan_tier || 'starter',
        email_status: automationEnabled ? 'pending' : 'paused',
        funnelswift_contact_id: data.funnelswift_contact_id,
        referred_by_user_id: data.referred_by_user_id,
      })
      .select()
      .single();

    if (logError) throw logError;

    // If automation is disabled, just log and return
    if (!automationEnabled) {
      return {
        success: true,
        message: 'Automation paused - request logged but email not sent',
        log_id: logEntry.id
      };
    }

    // Check if client already exists
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('domain', domain)
      .maybeSingle();

    let clientId = existingClient?.id;

    // Create client if doesn't exist
    if (!clientId) {
      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert({
          name: data.business_name,
          domain: domain,
          contact_email: data.contact_email,
          contact_name: data.contact_name || data.contact_email.split('@')[0],
          plan_tier: data.plan_tier || 'starter',
          active: true,
          agency_name: 'SwiftImpact Solutions',
          cta_url: 'https://swiftimpactsolutions.com/ada',
          widget_position: 'bottom-left',
          primary_color: '#007bff',
          automation_trigger: data.trigger_source,
          automation_trigger_id: data.trigger_id,
          widget_delivery_status: 'pending',
          funnelswift_contact_id: data.funnelswift_contact_id,
          referred_by_user_id: data.referred_by_user_id,
        })
        .select()
        .single();

      if (createError) throw createError;
      clientId = newClient.id;
    }

    // Update log with client ID
    await supabase
      .from('widget_automation_log')
      .update({ client_id: clientId })
      .eq('id', logEntry.id);

    // Get CDN domain from settings
    const { data: cdnData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'cdn_domain')
      .maybeSingle();
    
    const cdnDomain = cdnData?.value || 'https://app.adaswift.com';

    // Generate embed code
    const embedCode = `<script>!function(){var s=document.createElement("script");s.src="${cdnDomain}/loader.js?v=2";s.setAttribute("data-domain","${domain}");s.async=!0;document.body.appendChild(s)}();</script>`;

    // Get SMTP settings
    const { data: smtpData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'automation_settings')
      .maybeSingle();
    
    const smtpSettings = smtpData?.value 
      ? (typeof smtpData.value === 'string' ? JSON.parse(smtpData.value) : smtpData.value)
      : {};

    // Send email via SMTP (using your existing email function)
    const emailResult = await sendWidgetEmail({
      to: data.contact_email,
      contactName: data.contact_name || data.contact_email.split('@')[0],
      businessName: data.business_name,
      domain: domain,
      planTier: data.plan_tier || 'starter',
      embedCode: embedCode,
      smtpSettings: smtpSettings
    });

    // Update log and client based on email result
    if (emailResult.success) {
      await supabase
        .from('widget_automation_log')
        .update({
          client_id: clientId,
          email_sent: true,
          email_sent_at: new Date().toISOString(),
          email_status: 'sent',
          mailgun_message_id: emailResult.messageId
        })
        .eq('id', logEntry.id);

      await supabase
        .from('clients')
        .update({
          widget_delivered_at: new Date().toISOString(),
          widget_delivery_status: 'sent'
        })
        .eq('id', clientId);

      return {
        success: true,
        client_id: clientId,
        log_id: logEntry.id,
        message: 'Widget delivered successfully',
      };
    } else {
      throw new Error(emailResult.error || 'Failed to send email');
    }

  } catch (error) {
    console.error('Widget automation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Send widget email via SMTP (placeholder - use your existing email function)
async function sendWidgetEmail({ to, contactName, businessName, domain, planTier, embedCode, smtpSettings }) {
  // This calls your existing email sending logic
  // Replace with your actual implementation
  console.log('Sending widget email to:', to);
  
  // For now, return success (your existing automation handles this)
  return {
    success: true,
    messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
}
