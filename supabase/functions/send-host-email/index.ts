import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  'https://www.mysterymaker.party',
  'https://mysterymaker.party',
  'http://localhost:5173',
  'http://localhost:3000',
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
    const { host_email, mystery_title, access_token } = await req.json();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const guideUrl = `https://www.mysterymaker.party/host/${access_token}#guide`;
    const detectiveUrl = `https://www.mysterymaker.party/host/${access_token}#detective`;

    // Email 1: Host Guide
    const guideHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">
  <div style="background: #FF6B6B; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #F5F0E8; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">HOST GUIDE</h1>
  </div>

  <div style="background: #111111; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-bottom: 20px; color: #F5F0E8;">Your host guide for <strong>${mystery_title}</strong> is ready!</p>

    <div style="background: #000000; border-left: 4px solid #FF6B6B; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; color: rgba(245,240,232,0.7);">Everything you need to prepare for your mystery party: game overview, timeline, materials list, and hosting tips.</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${guideUrl}" style="display: inline-block; background: #FF6B6B; color: #F5F0E8; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View Host Guide</a>
    </div>

    <p style="color: rgba(245,240,232,0.5); font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(245,240,232,0.1);">
      <strong style="color: rgba(245,240,232,0.7);">Tip:</strong> Bookmark this link so you can easily access it on your phone during the party!
    </p>
  </div>

  <div style="text-align: center; padding: 20px; font-size: 12px;">
    <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.5); text-decoration: none;">mysterymaker.party</a>
  </div>
</body>
</html>
    `.trim();

    // Email 2: Detective & Evidence Kit
    const detectiveHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">
  <div style="background: #FF6B6B; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #F5F0E8; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">DETECTIVE &amp; EVIDENCE KIT</h1>
  </div>

  <div style="background: #111111; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-bottom: 20px; color: #F5F0E8;">Your detective kit for <strong>${mystery_title}</strong> is ready!</p>

    <div style="background: #000000; border-left: 4px solid #FF6B6B; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; color: rgba(245,240,232,0.7);">Your detective script and evidence cards for running the game. Use this during the party to guide the investigation.</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${detectiveUrl}" style="display: inline-block; background: #FF6B6B; color: #F5F0E8; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View Detective Kit</a>
    </div>

    <p style="color: rgba(245,240,232,0.5); font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(245,240,232,0.1);">
      <strong style="color: rgba(245,240,232,0.7);">Tip:</strong> Bookmark this link so you can easily access it on your phone during the party!
    </p>
  </div>

  <div style="text-align: center; padding: 20px; font-size: 12px;">
    <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.5); text-decoration: none;">mysterymaker.party</a>
  </div>
</body>
</html>
    `.trim();

    // Send both emails
    const sendEmail = async (subject: string, html: string) => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Mystery Maker <noreply@mysterymaker.party>",
          to: [host_email],
          subject,
          html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send email: ${response.status} - ${errorText}`);
      }

      return response.json();
    };

    await Promise.all([
      sendEmail(`Host Guide: ${mystery_title}`, guideHtml),
      sendEmail(`Detective Kit: ${mystery_title}`, detectiveHtml),
    ]);

    return new Response(
      JSON.stringify({ success: true, message: "Host emails sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
