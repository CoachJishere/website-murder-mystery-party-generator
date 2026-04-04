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
        from: "Mystery Maker <noreply@mysterymaker.party>",
        to: user_email,
        subject: "Welcome to Mystery Maker!",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">

            <!-- Header -->
            <div style="background: #C81400; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #F5F0E8; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">MYSTERY MAKER</h1>
            </div>

            <!-- Content -->
            <div style="background: #111111; padding: 40px 30px; border-radius: 0 0 8px 8px;">
              <h2 style="font-size: 22px; color: #F5F0E8; margin: 0 0 20px 0; font-weight: 700;">Welcome${user_name ? ', ' + user_name : ''}!</h2>

              <p style="font-size: 16px; color: rgba(245,240,232,0.7); margin-bottom: 20px; line-height: 1.6;">
                Your account is ready. Here's what you can do now:
              </p>

              <!-- Feature list -->
              <div style="background: #000000; border-left: 4px solid #C81400; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <p style="margin: 0 0 12px 0; color: #F5F0E8; font-size: 15px;">
                  &#10024; <strong>Create custom mysteries</strong> in minutes using AI
                </p>
                <p style="margin: 0 0 12px 0; color: #F5F0E8; font-size: 15px;">
                  &#127917; <strong>Choose any theme</strong> — from Victorian mansions to space stations
                </p>
                <p style="margin: 0 0 12px 0; color: #F5F0E8; font-size: 15px;">
                  &#128231; <strong>Send character assignments</strong> directly to your guests
                </p>
                <p style="margin: 0; color: #F5F0E8; font-size: 15px;">
                  &#128229; <strong>Download everything you need</strong> — host guides, clue cards, and more
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="https://www.mysterymaker.party/mystery/create?utm_source=welcome_email&utm_medium=email&utm_campaign=onboarding" style="display: inline-block; background: #C81400; color: #F5F0E8; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Create Your First Mystery
                </a>
              </div>

              <!-- Helpful tip -->
              <p style="color: rgba(245,240,232,0.5); font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(245,240,232,0.1); line-height: 1.6;">
                <strong style="color: rgba(245,240,232,0.7);">Pro tip:</strong> You can explore and create as many mystery drafts as you like. You only pay ($24.99) when you're ready to generate the complete party package with all materials.
              </p>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 20px; color: rgba(245,240,232,0.35); font-size: 12px;">
              <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.5); text-decoration: none;">mysterymaker.party</a>
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
