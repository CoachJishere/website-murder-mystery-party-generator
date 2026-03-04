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
    const { user_email, user_name } = await req.json();

    if (!user_email) {
      throw new Error("user_email is required");
    }

    // Send welcome email via Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Murder Mystery Party <noreply@mysterymaker.party>",
        to: user_email,
        subject: "🎭 Welcome to Mystery Maker!",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #8B1538 0%, #6B0F28 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Welcome to Mystery Maker! 🎭</h1>
            </div>

            <!-- Content -->
            <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="font-size: 18px; color: #333; margin-bottom: 20px; line-height: 1.6;">
                Hi ${user_name || 'there'}! 👋
              </p>

              <p style="font-size: 16px; color: #333; margin-bottom: 20px; line-height: 1.6;">
                Your account is ready. Here's what you can do now:
              </p>

              <!-- Feature list -->
              <div style="background: #F7F3E9; border-left: 4px solid #8B1538; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <p style="margin: 0 0 12px 0; color: #2A2A2A; font-size: 15px;">
                  ✨ <strong>Create custom mysteries</strong> in minutes using AI
                </p>
                <p style="margin: 0 0 12px 0; color: #2A2A2A; font-size: 15px;">
                  🎭 <strong>Choose from multiple themes</strong> - from Victorian mansions to space stations
                </p>
                <p style="margin: 0 0 12px 0; color: #2A2A2A; font-size: 15px;">
                  📧 <strong>Send character assignments</strong> directly to your guests
                </p>
                <p style="margin: 0; color: #2A2A2A; font-size: 15px;">
                  📥 <strong>Download everything you need</strong> - host guides, clue cards, and more
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="https://www.mysterymaker.party/mystery/create?utm_source=welcome_email&utm_medium=email&utm_campaign=onboarding" style="display: inline-block; background: #8B1538; color: white; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  Create Your First Mystery
                </a>
              </div>

              <!-- Helpful tip -->
              <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; line-height: 1.6;">
                <strong>💡 Pro tip:</strong> You can explore and create as many mystery drafts as you like. You only pay ($24.99) when you're ready to generate the complete party package with all materials.
              </p>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
              <p style="margin: 0;">Mystery Maker Party Generator</p>
              <p style="margin: 5px 0 0 0;">
                <a href="https://www.mysterymaker.party" style="color: #8B1538; text-decoration: none;">mysterymaker.party</a>
              </p>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const data = await response.json();
    console.log("Welcome email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, message: "Welcome email sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
