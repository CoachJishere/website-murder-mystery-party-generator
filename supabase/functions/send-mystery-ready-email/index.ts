import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserLanguage } from "../_shared/email-i18n.ts";
import { detectLanguage, languageSample } from "../_shared/languageDetect.ts";
import { buildReadyEmail, pickReadyLocale } from "../_shared/readyEmail.ts";

// ADR-0106: single source of truth for the "your mystery is ready" email.
// Called exclusively by the notify_package_ready() DB trigger, which already
// guarantees exactly one call per package (BEFORE trigger, atomic claim via
// ready_email_sent_at). This function does not need its own dedup -- if it's
// running, the trigger has already decided this is the one legitimate send.
//
// 2026-08-27: dropped the "reply for feedback" ask (was in the subject and
// a closing paragraph). Only 6 sends existed at the time so this wasn't a
// data-driven kill, it was a mechanism problem -- reply-to-email is the
// highest-friction way to ask, and it was conflating "how was signing up"
// with "how was the mystery" (a question that belongs at Day+14/21, after
// the party, where it already lives via mystery_feedback/guest_feedback).
// This email's job is just the ready notification now.
//
// ADR-0152 follow-up (2026-10-13): the email is written in the language of the package itself (detected from the characters'
// introductions, because a package's language follows the conversation, not profiles.language), falling back to the profile language and
// then English. Before this it was English only, even for a Danish package. `preview: true` returns the subject, html and locale without sending.

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

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { package_id, preview } = await req.json();
    if (!package_id) {
      throw new Error("package_id is required");
    }

    const { data: pkg, error: pkgError } = await supabase
      .from("mystery_packages")
      .select("id, title, conversation_id")
      .eq("id", package_id)
      .single();
    if (pkgError || !pkg) {
      throw new Error(`Package not found: ${pkgError?.message ?? package_id}`);
    }

    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("title, user_id")
      .eq("id", pkg.conversation_id)
      .single();
    if (convError || !conversation) {
      throw new Error(`Conversation not found: ${convError?.message ?? pkg.conversation_id}`);
    }

    const mysteryTitle = pkg.title || conversation.title || "Your Mystery";

    let userEmail: string | null = null;
    let nameForEmail: string | null = null;
    if (conversation.user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(conversation.user_id);
      userEmail = authUser?.user?.email ?? null;
      nameForEmail = authUser?.user?.user_metadata?.name || userEmail?.split('@')[0] || null;
    }
    if (!userEmail) {
      throw new Error(`No email on file for conversation ${pkg.conversation_id}`);
    }

    // Language: what the customer will read (the package), then their profile language, then English.
    const { data: chars } = await supabase.from("mystery_characters").select("introduction").eq("package_id", package_id).limit(4);
    const detected = detectLanguage(languageSample((chars ?? []) as Record<string, unknown>[]));
    const locale = pickReadyLocale(detected, await getUserLanguage(supabase, conversation.user_id));
    const mail = buildReadyEmail(locale, { name: nameForEmail, title: mysteryTitle, conversationId: pkg.conversation_id });

    if (preview === true) {
      return new Response(JSON.stringify({ success: true, preview: true, locale, detected, subject: mail.subject, html: mail.html }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mystery Maker <support@mysterymaker.party>",
        to: [userEmail],
        subject: mail.subject,
        html: mail.html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API error: ${response.status} ${errorText}`);
    }

    console.log(`Ready email sent for package ${package_id} to ${userEmail} (locale ${locale}, detected ${detected ?? "none"})`);

    return new Response(
      JSON.stringify({ success: true, message: "Ready email sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending mystery-ready email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
