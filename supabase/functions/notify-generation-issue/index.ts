import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { conversation_id } = await req.json();

    if (!conversation_id) {
      throw new Error("conversation_id is required");
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Fetch context about the stuck generation
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let mysteryTitle = "Unknown";
    let userEmail = "Unknown";
    let packageStatus = "Unknown";
    let generationStarted = "Unknown";
    let characterCount = 0;
    let expectedCharacters = 0;
    let emptyCharacters: string[] = [];

    // Get conversation + user info
    const { data: conversation } = await supabase
      .from("conversations")
      .select("title, user_id")
      .eq("id", conversation_id)
      .single();

    if (conversation) {
      mysteryTitle = conversation.title || mysteryTitle;
      if (conversation.user_id) {
        const { data: userData } = await supabase.auth.admin.getUserById(conversation.user_id);
        userEmail = userData?.user?.email || "Unknown";
      }
    }

    // Get package info
    const { data: pkg } = await supabase
      .from("mystery_packages")
      .select("id, title, generation_status, generation_started_at, extracted_characters")
      .eq("conversation_id", conversation_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pkg) {
      mysteryTitle = pkg.title || mysteryTitle;
      packageStatus = JSON.stringify(pkg.generation_status);
      generationStarted = pkg.generation_started_at
        ? new Date(pkg.generation_started_at).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })
        : "Unknown";

      // Parse expected characters
      if (pkg.extracted_characters) {
        try {
          const extracted = typeof pkg.extracted_characters === "string"
            ? JSON.parse(pkg.extracted_characters)
            : pkg.extracted_characters;
          expectedCharacters = Array.isArray(extracted) ? extracted.length : 0;
        } catch { /* ignore */ }
      }

      // Check for empty characters
      if (pkg.id) {
        const { data: chars } = await supabase
          .from("mystery_characters")
          .select("character_name, character_role, description")
          .eq("package_id", pkg.id);

        if (chars) {
          characterCount = chars.length;
          emptyCharacters = chars
            .filter((c: any) => !c.description || !c.character_role)
            .map((c: any) => c.character_name);
        }
      }
    }

    const emptyCharsHtml = emptyCharacters.length > 0
      ? `<tr>
          <td style="padding: 8px 0; color: #6b7280;">Empty Characters:</td>
          <td style="padding: 8px 0; color: #dc2626; font-weight: 600;">${emptyCharacters.join(", ")}</td>
        </tr>`
      : "";

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">⚠️ Generation Display Issue</h1>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 16px 0;">A customer's mystery generation appears stuck or has display issues. The user has been shown a message that the team has been notified.</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 160px;">Mystery Title:</td>
              <td style="padding: 8px 0; font-weight: 600;">${mysteryTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Customer Email:</td>
              <td style="padding: 8px 0;">${userEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Conversation ID:</td>
              <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${conversation_id}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Generation Started:</td>
              <td style="padding: 8px 0;">${generationStarted}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Characters:</td>
              <td style="padding: 8px 0;">${characterCount} generated / ${expectedCharacters} expected</td>
            </tr>
            ${emptyCharsHtml}
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Package Status:</td>
              <td style="padding: 8px 0; font-family: monospace; font-size: 11px; word-break: break-all;">${packageStatus}</td>
            </tr>
          </table>
          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
            Triggered: ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}
          </div>
        </div>
      </div>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mystery Maker Alerts <noreply@mysterymaker.party>",
        to: ["support@mysterymaker.party"],
        subject: `🚨 Generation Issue - ${mysteryTitle} (${userEmail})`,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Resend API error: ${emailResponse.status} ${errorText}`);
    }

    console.log("Generation issue notification sent successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending generation issue notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
