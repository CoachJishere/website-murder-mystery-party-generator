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
    const { guest_email, guest_name, character_name, character_details, access_token, mystery_title } = await req.json();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const characterUrl = `https://www.mysterymaker.party/character/${access_token}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">
  <div style="background: #FF6B6B; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #F5F0E8; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">MYSTERY MAKER</h1>
  </div>

  <div style="background: #111111; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-bottom: 20px; color: #F5F0E8;">Hi ${guest_name},</p>

    <p style="margin-bottom: 20px; color: rgba(245,240,232,0.7);">You've been assigned a character for <strong style="color: #F5F0E8;">${mystery_title}</strong>!</p>

    <div style="background: #000000; border-left: 4px solid #FF6B6B; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <h2 style="color: #FF6B6B; margin-top: 0; font-size: 22px;">Your Character: ${character_name}</h2>
      <p style="margin-bottom: 0; color: rgba(245,240,232,0.7);">${character_details}</p>
    </div>

    <p style="margin-bottom: 25px; color: rgba(245,240,232,0.7);">Click the button below to view your complete character guide:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${characterUrl}" style="display: inline-block; background: #FF6B6B; color: #F5F0E8; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View My Character</a>
    </div>

    <p style="color: rgba(245,240,232,0.5); font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(245,240,232,0.1);">
      <strong style="color: rgba(245,240,232,0.7);">Tip:</strong> Save this email or bookmark the link so you can access your character anytime!
    </p>
  </div>

  <div style="text-align: center; padding: 20px; font-size: 11px; color: rgba(245,240,232,0.3);">
    <p style="margin: 0 0 8px 0;">Your email was provided by the host of this mystery party via <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.4); text-decoration: none;">mysterymaker.party</a>.</p>
    <p style="margin: 0;">We may send you one follow-up email to ask about your experience. That's it - no mailing lists, no marketing.</p>
  </div>
</body>
</html>
    `.trim();

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mystery Maker <noreply@mysterymaker.party>",
        to: [guest_email],
        subject: `Your Character: ${character_name} for ${mystery_title}`,
        html: htmlBody,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      throw new Error(`Failed to send email: ${resendResponse.status}`);
    }

    const data = await resendResponse.json();

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
