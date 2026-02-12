// api/process-followup-emails.js
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RESEND_API_KEY = process.env.RESEND_API_KEY;

function buildFeedbackEmailHtml(mysteryTitle, conversationId) {
  const feedbackUrl = `https://www.mysterymaker.party/feedback/${conversationId}`;
  const unsubscribeUrl = `https://www.mysterymaker.party/feedback/${conversationId}?unsubscribe=true`;

  const starButtons = [1, 2, 3, 4, 5].map(n => {
    const url = `${feedbackUrl}?rating=${n}`;
    const stars = '★'.repeat(n) + '☆'.repeat(5 - n);
    return `<a href="${url}" style="display: inline-block; padding: 8px 12px; margin: 0 4px; background: ${n >= 4 ? '#8B1538' : '#F7F3E9'}; color: ${n >= 4 ? 'white' : '#8B1538'}; text-decoration: none; border-radius: 6px; font-size: 16px; border: 1px solid #8B1538;">${stars}</a>`;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #8B1538 0%, #6B0F28 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">How Did Your Mystery Go?</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-bottom: 20px;">We hope you had an amazing time with <strong>${mysteryTitle}</strong>!</p>

    <div style="background: #F7F3E9; border-left: 4px solid #8B1538; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; color: #2A2A2A;">We'd love to hear how your mystery party went. Your feedback helps us create better mysteries and helps other hosts decide.</p>
    </div>

    <p style="font-size: 16px; font-weight: 600; text-align: center; margin-bottom: 10px;">How would you rate your experience?</p>

    <div style="text-align: center; margin: 20px 0;">
      ${starButtons}
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${feedbackUrl}" style="display: inline-block; background: #8B1538; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Tell Us About Your Party</a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      <strong>Tip:</strong> If you haven't hosted your party yet, no worries! You can come back to this email when you're ready.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>Murder Mystery Party Generator</p>
    <p><a href="${unsubscribeUrl}" style="color: #999; text-decoration: underline;">Unsubscribe from follow-up emails</a></p>
  </div>
</body>
</html>
  `.trim();
}

async function sendEmail(to, subject, html) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Murder Mystery Party <noreply@mysterymaker.party>',
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export default async function handler(req) {
  // Allow GET for health checks and Vercel cron
  if (req.method === 'GET' || req.method === 'POST') {
    try {
      console.log('Processing follow-up emails...');

      if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY not configured');
        return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Fetch pending emails that are due
      const { data: pendingEmails, error: fetchError } = await supabaseAdmin
        .from('followup_emails')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .limit(50);

      if (fetchError) {
        console.error('Error fetching pending emails:', fetchError);
        throw fetchError;
      }

      if (!pendingEmails || pendingEmails.length === 0) {
        console.log('No pending emails to process');
        return new Response(JSON.stringify({
          success: true,
          processed: 0,
          message: 'No pending emails'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.log(`Found ${pendingEmails.length} pending emails to process`);

      let sent = 0;
      let skipped = 0;
      let failed = 0;

      for (const email of pendingEmails) {
        try {
          // Get conversation data (including unsubscribe check)
          const { data: conversation, error: convError } = await supabaseAdmin
            .from('conversations')
            .select('title, unsubscribed_from_followups')
            .eq('id', email.conversation_id)
            .single();

          if (convError || !conversation) {
            console.error(`Conversation not found for ${email.conversation_id}`);
            await supabaseAdmin
              .from('followup_emails')
              .update({ status: 'skipped', skipped_reason: 'conversation_not_found' })
              .eq('id', email.id);
            skipped++;
            continue;
          }

          // Check unsubscribe
          if (conversation.unsubscribed_from_followups) {
            console.log(`User unsubscribed for conversation ${email.conversation_id}`);
            await supabaseAdmin
              .from('followup_emails')
              .update({ status: 'skipped', skipped_reason: 'unsubscribed' })
              .eq('id', email.id);
            skipped++;
            continue;
          }

          // Get user email
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(email.user_id);

          if (authError || !authUser?.user?.email) {
            console.error(`User email not found for ${email.user_id}`);
            await supabaseAdmin
              .from('followup_emails')
              .update({ status: 'skipped', skipped_reason: 'user_email_not_found' })
              .eq('id', email.id);
            skipped++;
            continue;
          }

          const userEmail = authUser.user.email;
          const mysteryTitle = conversation.title || 'your mystery';

          // Build and send email
          const html = buildFeedbackEmailHtml(mysteryTitle, email.conversation_id);
          const subject = `How did your mystery party go?`;

          console.log(`Sending feedback email to ${userEmail} for "${mysteryTitle}"`);
          await sendEmail(userEmail, subject, html);

          // Mark as sent
          await supabaseAdmin
            .from('followup_emails')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', email.id);

          sent++;
          console.log(`Successfully sent feedback email for conversation ${email.conversation_id}`);

        } catch (emailError) {
          console.error(`Failed to process email ${email.id}:`, emailError.message);
          await supabaseAdmin
            .from('followup_emails')
            .update({ status: 'failed', skipped_reason: emailError.message })
            .eq('id', email.id);
          failed++;
        }
      }

      const summary = { success: true, processed: pendingEmails.length, sent, skipped, failed };
      console.log('Follow-up email processing complete:', summary);

      return new Response(JSON.stringify(summary), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Error in process-followup-emails:', error);
      return new Response(JSON.stringify({
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
}
