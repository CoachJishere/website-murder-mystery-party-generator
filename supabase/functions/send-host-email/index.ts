import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { host_email, mystery_title, access_token } = await req.json();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const guideUrl = `https://murder-mystery.party/host/${access_token}#guide`;
    const detectiveUrl = `https://murder-mystery.party/host/${access_token}#detective`;

    // Email 1: Host Guide
    const guideHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #8B1538 0%, #6B0F28 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Host Guide</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-bottom: 20px;">Your host guide for <strong>${mystery_title}</strong> is ready!</p>

    <div style="background: #F7F3E9; border-left: 4px solid #8B1538; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; color: #2A2A2A;">Everything you need to prepare for your mystery party: game overview, timeline, materials list, and hosting tips.</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${guideUrl}" style="display: inline-block; background: #8B1538; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View Host Guide</a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      <strong>Tip:</strong> Bookmark this link so you can easily access it on your phone during the party!
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>Murder Mystery Party Generator</p>
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
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #8B1538 0%, #6B0F28 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Detective & Evidence Kit</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-bottom: 20px;">Your detective kit for <strong>${mystery_title}</strong> is ready!</p>

    <div style="background: #F7F3E9; border-left: 4px solid #8B1538; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; color: #2A2A2A;">Your detective script and evidence cards for running the game. Use this during the party to guide the investigation.</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${detectiveUrl}" style="display: inline-block; background: #8B1538; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View Detective Kit</a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      <strong>Tip:</strong> Bookmark this link so you can easily access it on your phone during the party!
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>Murder Mystery Party Generator</p>
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
          from: "Murder Mystery Party <noreply@mysterymaker.party>",
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
