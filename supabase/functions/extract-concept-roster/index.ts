
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  extractRosterFromMessage,
  findLatestConceptMessage,
  mergeRosterContinuations,
} from "../_shared/rosterExtraction.ts";

/**
 * ADR-0125: backs the pre-purchase preview page's character count/list.
 *
 * Runs the exact same roster extraction `mystery-webhook-trigger` uses for
 * real generation (imported from `_shared/rosterExtraction.ts`, not a
 * separate copy) so the preview can never show a different roster than what
 * generation will actually produce. Replaces `MysteryPurchase.tsx`'s own
 * client-side parser, which drifted from the server three times (ADR-0044
 * addendum, ADR-0110 Addenda 1-2) before this consolidation.
 *
 * Read-only, no generation triggered, no LLM spend - just a Supabase read
 * plus a regex pass. The only thing worth gating is whose conversation can
 * be read, so unlike `mystery-webhook-trigger` this has no payment gate,
 * only an ownership check.
 */

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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Same auth pattern as generate-chatbot-token: this function has
    // verify_jwt=false at the platform level, so it does its own check.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { conversationId } = await req.json();
    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: "conversationId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from("conversations")
      .select("id, user_id, player_count, messages!fk_messages_conversation_id(id, content, is_ai, role, created_at)")
      .eq("id", conversationId)
      .maybeSingle();

    if (conversationError) {
      console.error("Error fetching conversation:", conversationError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch conversation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!conversation) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    // Ownership check - this function has no payment gate to lean on (the
    // conversation may well be unpaid, that's the whole point of a preview),
    // so confirming the caller owns it is the only thing standing between an
    // unauthenticated stranger and someone else's unpublished mystery concept.
    if (conversation.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Not authorized to view this conversation" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const messages = mergeRosterContinuations(conversation.messages || []);
    const latestMessage = findLatestConceptMessage(messages, conversation.player_count);
    const characters = latestMessage
      ? extractRosterFromMessage(latestMessage.content || '')
      : [];

    return new Response(
      JSON.stringify({
        characters,
        sourceMessageId: latestMessage?.id ?? null,
        playerCount: conversation.player_count ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("extract-concept-roster error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error extracting roster" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
