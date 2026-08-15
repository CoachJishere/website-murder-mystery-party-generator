import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// target=denonext (not the deno target stripe-webhook/index.ts uses) --
// verified locally that ?target=deno triggers a brotli module-graph boot
// error against supabase/edge-runtime:v1.74.3 for this specific package;
// denonext is also the more current esm.sh target for recent Deno versions.
import Stripe from "https://esm.sh/stripe@14.17.0?target=denonext";

/**
 * adapt-mystery-create — ADR-0036/0082/0088, "Recast".
 *
 * STAGING ONLY. Validates that every requested character can be safely
 * removed, creates one `pending` mystery_adaptations row per character
 * (sharing one batch_id, ordered by batch_sequence), and opens a single
 * Stripe TEST-mode Checkout Session for a FLAT $5 charge covering the whole
 * batch regardless of how many characters are included — this is priced per
 * submission, not per character (ADR-0088).
 *
 * Eligibility (server-side; the frontend gate is a UX convenience only, not a
 * security boundary — this is the real check):
 *   - mystery_style='character' (slip-mechanic): ANY character is eligible.
 *     Confirmed via docs/generation-guardrails.md G8 — no character's stored
 *     content is guilt-specific in these games (the culprit is drawn at the
 *     table), so nothing is protected here.
 *   - mystery_style='detective': 'redHerring' or 'suspect' are eligible for a
 *     plain removal, same as Phase B. 'murderer'/'accomplice' are now ALSO
 *     eligible, but flagged requiresReassignment — removing them means a
 *     different remaining character must take over that role (handled by
 *     adapt-mystery-apply's rewrite call, not here).
 *   - Only one Recast batch may be in flight per package at a time (owner
 *     decision) — rejected if ANY non-terminal (pending/paid/processing) row
 *     exists for this package_id, not just for the requested characters.
 *   - Removing every requested character can't drop the cast below
 *     MIN_REMAINING_CHARACTERS.
 *
 * POST body: {
 *   package_id, requested_by_email?, success_url?, cancel_url?,
 *   characters: [{ character_id, replacement_character_id? }, ...]
 * }
 * replacement_character_id is only meaningful for a requiresReassignment
 * character; ignored otherwise. Omit it (or send null) to let the system
 * choose during apply.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16", httpClient: Stripe.createFetchHttpClient() })
  : null;

// Staging-only gate, independent of the frontend's VITE_ flag — a direct curl
// against a deployed-but-unflagged function must not bypass the visibility gate.
const ENABLED = Deno.env.get("ENABLE_GUEST_DROPOUT_ADAPTATION") === "true";

// Flat price per submission (ADR-0088) — NOT per character. Also duplicated
// in adapt-mystery-apply/index.ts; these two functions deliberately don't
// share code (see that file's header comment), same precedent as
// MIN_REMAINING_CHARACTERS below.
const ADAPTATION_PRICE_USD = 5.0;
// Real Stripe Product/Price (owner-provided, not a secret — a price/product
// id can't move money on its own, that still requires an actual secret key,
// which is never wired into any environment this code runs in yet). Mode
// (test vs. live) not confirmed — Stripe itself enforces that a Checkout
// Session's price must be in the same mode as the API key used to create it,
// so a mismatch fails loudly rather than silently succeeding; still worth
// confirming this is the TEST-mode price before a real key is ever wired in
// (see ADR-0088's promote-to-prod checklist).
const STRIPE_PRICE_ID = "price_1U4h9wKgSd73ikMWh0U3P5r8"; // product: prod_V4qrXB1FOwSi6Q

// Duplicated from adapt-mystery-apply/index.ts's verify-step constant of the
// same name — kept in sync by hand, not shared, matching this codebase's
// existing precedent of not sharing code between these two functions. This
// copy is the create-time guard (so a doomed batch is rejected before any
// Stripe session exists); apply's copy is the final backstop.
const MIN_REMAINING_CHARACTERS = 4;

interface RequestedCharacter {
  character_id?: string;
  replacement_character_id?: string | null;
}

interface RequestBody {
  package_id?: string;
  characters?: RequestedCharacter[];
  requested_by_email?: string;
  success_url?: string;
  cancel_url?: string;
}

interface CharacterRow {
  id: string;
  character_name: string;
  character_role: string | null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!ENABLED) return jsonResponse({ error: "not_enabled" }, 404);
  if (req.method !== "POST") return jsonResponse({ error: "POST only" }, 405);

  try {
    const body: RequestBody = await req.json();
    const { package_id, requested_by_email, success_url, cancel_url } = body;
    const requested = body.characters ?? [];

    if (!package_id || requested.length === 0) {
      return jsonResponse({ error: "package_id and a non-empty characters[] are required" }, 400);
    }

    // Dedupe by character_id — an accidental double-submit shouldn't create
    // two rows racing to delete/rewrite the same target.
    const seen = new Set<string>();
    const dedupedRequests: RequestedCharacter[] = [];
    for (const r of requested) {
      if (!r.character_id || seen.has(r.character_id)) continue;
      seen.add(r.character_id);
      dedupedRequests.push(r);
    }
    if (dedupedRequests.length === 0) {
      return jsonResponse({ error: "no valid character_id entries in characters[]" }, 400);
    }
    const requestedIds = dedupedRequests.map((r) => r.character_id as string);

    const { data: pkg, error: pkgErr } = await supabase
      .from("mystery_packages")
      .select("id, conversation_id, mystery_style")
      .eq("id", package_id)
      .maybeSingle();
    if (pkgErr) throw new Error(`package lookup failed: ${pkgErr.message}`);
    if (!pkg) return jsonResponse({ error: "package_not_found" }, 404);

    const style = pkg.mystery_style === "character" ? "character" : "detective";

    // Full current cast (not just the requested ids) — needed for the
    // headcount guard and to validate replacement_character_id choices.
    const { data: allCharacters, error: allCharErr } = await supabase
      .from("mystery_characters")
      .select("id, character_name, character_role")
      .eq("package_id", package_id);
    if (allCharErr) throw new Error(`cast lookup failed: ${allCharErr.message}`);
    const castById = new Map<string, CharacterRow>((allCharacters ?? []).map((c) => [c.id, c as CharacterRow]));

    if (allCharacters && allCharacters.length - dedupedRequests.length < MIN_REMAINING_CHARACTERS) {
      return jsonResponse({
        error: "not_eligible",
        reason: "would_drop_below_minimum_cast",
        min_remaining: MIN_REMAINING_CHARACTERS,
      }, 409);
    }

    // Validate every requested character: exists in this package, eligible
    // per the revised rule, and (if murderer/accomplice) has a valid
    // replacement choice when one was specified. ANY single failure rejects
    // the whole batch — no silent partial-batch fallback (the frontend
    // already showed eligibility, so a mismatch here means stale client
    // state and should force a re-check, not silently charge for less than
    // requested).
    const validated: {
      character: CharacterRow;
      requiresReassignment: boolean;
      replacementCharacterId: string | null;
    }[] = [];

    for (const r of dedupedRequests) {
      const character = castById.get(r.character_id as string);
      if (!character) {
        return jsonResponse({ error: "character_not_found", character_id: r.character_id }, 404);
      }

      const role = character.character_role;
      let eligible = false;
      let requiresReassignment = false;
      let ineligibleReason: string | null = null;

      if (style === "character") {
        // G8 (docs/generation-guardrails.md): no character's stored content
        // is guilt-specific in random-slip games — nothing is protected.
        eligible = true;
      } else if (role === "redHerring" || role === "suspect") {
        eligible = true;
      } else if (role === "murderer" || role === "accomplice") {
        eligible = true;
        requiresReassignment = true;
      } else {
        ineligibleReason = "role_unknown";
      }

      if (!eligible) {
        return jsonResponse({ error: "not_eligible", character_id: r.character_id, reason: ineligibleReason }, 409);
      }

      let replacementCharacterId: string | null = null;
      if (requiresReassignment && r.replacement_character_id) {
        const replacement = castById.get(r.replacement_character_id);
        if (!replacement) {
          return jsonResponse({
            error: "invalid_replacement",
            character_id: r.character_id,
            reason: "replacement_not_found_in_package",
          }, 400);
        }
        if (replacement.id === character.id) {
          return jsonResponse({
            error: "invalid_replacement",
            character_id: r.character_id,
            reason: "replacement_same_as_target",
          }, 400);
        }
        if (requestedIds.includes(replacement.id)) {
          return jsonResponse({
            error: "invalid_replacement",
            character_id: r.character_id,
            reason: "replacement_also_being_removed_this_batch",
          }, 400);
        }
        replacementCharacterId = replacement.id;
      }

      validated.push({ character, requiresReassignment, replacementCharacterId });
    }

    // Package-wide, not just per-character: only one Recast batch may be in
    // flight for a given package at a time (owner decision — simpler for the
    // host to reason about than tracking multiple concurrent batches, and it
    // shrinks the realistic surface for the cross-batch package-claim
    // contention adapt-mystery-apply already guards against server-side —
    // that guard stays regardless, this is UX-level prevention, not the only
    // line of defense, matching this codebase's "frontend gate is a
    // convenience, not a security boundary" convention).
    const { data: existing, error: existingErr } = await supabase
      .from("mystery_adaptations")
      .select("id, batch_id, character_id, status")
      .eq("package_id", package_id)
      .in("status", ["pending", "paid", "processing"]);
    if (existingErr) throw new Error(`in-flight lookup failed: ${existingErr.message}`);
    if (existing && existing.length > 0) {
      return jsonResponse({
        error: "already_in_progress",
        batch_id: existing[0].batch_id,
        conflicts: existing.map((e) => ({ character_id: e.character_id, adaptation_id: e.id, status: e.status })),
      }, 409);
    }

    const batchId = crypto.randomUUID();
    const rowsToInsert = validated.map((v, index) => ({
      batch_id: batchId,
      batch_sequence: index,
      package_id,
      conversation_id: pkg.conversation_id,
      character_id: v.character.id,
      character_name: v.character.character_name,
      character_role: v.character.character_role,
      requested_replacement_character_id: v.replacementCharacterId,
      requested_by_email: requested_by_email ?? null,
      amount_usd: ADAPTATION_PRICE_USD,
    }));

    const { data: insertedRows, error: insErr } = await supabase
      .from("mystery_adaptations")
      .insert(rowsToInsert)
      .select("id, batch_sequence");
    if (insErr) throw new Error(`insert failed: ${insErr.message}`);

    const adaptationIds = (insertedRows ?? [])
      .sort((a, b) => a.batch_sequence - b.batch_sequence)
      .map((r) => r.id as string);
    const clientReferenceId = `adaptation-batch:${batchId}`;

    if (!stripe) {
      // Staging convenience: no STRIPE_SECRET_KEY configured yet in this
      // local env. Return the ids so curl-based / SQL-simulated-payment
      // testing can exercise adapt-mystery-apply without blocking on real
      // Stripe wiring.
      console.warn("STRIPE_SECRET_KEY not set — returning batch without a checkout_url");
      return jsonResponse({
        batch_id: batchId,
        adaptation_ids: adaptationIds,
        client_reference_id: clientReferenceId,
        checkout_url: null,
        note: "STRIPE_SECRET_KEY not configured in this environment — simulate payment directly for local testing (see verification plan).",
      });
    }

    try {
      const characterNames = validated.map((v) => v.character.character_name).join(", ");
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: clientReferenceId,
        customer_email: requested_by_email || undefined,
        // ONE line item, flat $5, regardless of how many characters are in
        // this batch (ADR-0088) — priced per submission, not per character.
        // References the real pre-created Stripe Price/Product rather than
        // inline price_data, per owner request — which character(s) this
        // particular checkout covers still travels with the transaction via
        // payment_intent_data.description below, since a referenced Price's
        // own product description is fixed, not settable per-session.
        line_items: [{
          quantity: 1,
          price: STRIPE_PRICE_ID,
        }],
        payment_intent_data: {
          description: `Recast: ${characterNames}`,
        },
        // __BATCH_ID__ is a placeholder the caller embeds (see
        // adaptationService.ts) because the frontend doesn't know this
        // batch's id until this call returns — substitute it now that we do.
        success_url: (success_url || `${SUPABASE_URL}/functions/v1/adapt-mystery-create?batch_id=__BATCH_ID__&result=success`)
          .replace("__BATCH_ID__", batchId),
        cancel_url: (cancel_url || `${SUPABASE_URL}/functions/v1/adapt-mystery-create?batch_id=__BATCH_ID__&result=cancel`)
          .replace("__BATCH_ID__", batchId),
      });

      await supabase
        .from("mystery_adaptations")
        .update({ stripe_session_id: session.id, stripe_client_reference_id: clientReferenceId })
        .eq("batch_id", batchId);

      return jsonResponse({ batch_id: batchId, adaptation_ids: adaptationIds, checkout_url: session.url });
    } catch (stripeError) {
      await supabase
        .from("mystery_adaptations")
        .update({ status: "failed", error_message: `stripe session create failed: ${(stripeError as Error).message}` })
        .eq("batch_id", batchId);
      throw stripeError;
    }
  } catch (error) {
    console.error("adapt-mystery-create error:", (error as Error).message);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
