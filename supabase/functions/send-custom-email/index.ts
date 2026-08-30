import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ADR-0114: generic ad hoc customer/operational email, sent via the same
// Resend account and "Mystery Maker <support@mysterymaker.party>" sender
// every other send-*-email function already uses. Deliberately NOT
// triggered by any DB event or cron -- every call is a direct, one-off
// request (Jonathan asking Claude to send a specific email he's reviewed,
// or a manual admin action), never an automated pipeline. Do not wire this
// into a trigger/cron without a fresh ADR -- that changes it from "sent on
// explicit request" to "sent automatically," a different risk profile the
// standing paid-API/no-autonomous-customer-contact rule doesn't cover.
//
// Body content (subject/html) is entirely caller-supplied -- this function
// does no drafting or templating of its own. The brand shell (header/
// footer) below is applied around whatever `bodyHtml` the caller passes so
// every send still looks like it came from Mystery Maker.

const ALLOWED_ORIGINS = [
  'https://www.mysterymaker.party',
  'https://mysterymaker.party',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, bodyHtml, replyTo } = await req.json();
    if (!to || !subject || !bodyHtml) {
      throw new Error("to, subject, and bodyHtml are required");
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">
        <div style="background: #C81400; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <img src="https://www.mysterymaker.party/email-assets/wordmark-cream.png" alt="Mystery Maker" width="232" height="40" style="display: block; max-width: 232px; height: auto; margin: 0 auto; border: 0; outline: none; text-decoration: none;" />
        </div>
        <div style="background: #111111; padding: 40px 30px; border-radius: 0 0 8px 8px; color: rgba(245,240,232,0.85); font-size: 16px; line-height: 1.6;">
          ${bodyHtml}
        </div>
        <div style="text-align: center; padding: 20px; color: rgba(245,240,232,0.35); font-size: 12px;">
          <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.5); text-decoration: none;">mysterymaker.party</a>
        </div>
      </body>
      </html>
    `;

    const payload: Record<string, unknown> = {
      from: "Mystery Maker <support@mysterymaker.party>",
      to: [to],
      subject,
      html,
    };
    if (replyTo) payload.reply_to = replyTo;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log(`Custom email sent to ${to}: "${subject}" (Resend id: ${result.id})`);

    return new Response(
      JSON.stringify({ success: true, resendId: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending custom email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
