import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * adapt-mystery-apply — "Remove a Character" (renamed from "Recast" —
 * ADR-0091), ADR-0036/0082/0088/0098. Live in production since at least
 * 2026-08-20 (processed a real cs_live_... charge) — the "STAGING ONLY"
 * marker here was stale.
 *
 * Service-role only (called by stripe-webhook's adaptation branch, chained by
 * this function itself, and directly via curl for local testing — never
 * customer-reachable). One invocation processes ONE character removal:
 *
 *   snapshot -> scan+transform -> (reassign, if murderer/accomplice) ->
 *   delete rows -> verify -> accept or revert
 *
 * This is the SAME accept-or-revert invariant regenerate-child-content's
 * revertAll() and auto-remediate-packages's runGatedAttempt() already use —
 * re-implemented here (not shared) because this unit of repair also DELETES
 * rows, which neither existing helper does; the safety property is identical
 * (worst case degrades to a clean revert, never a half-applied package).
 *
 * --- Batching (ADR-0088) ---
 * A purchase can cover N characters (mystery_adaptations rows sharing one
 * batch_id, ordered by batch_sequence). Each invocation is otherwise
 * self-contained — it re-queries fresh state by package_id every time, holds
 * nothing in memory across invocations — but N of them for the SAME package
 * must never run concurrently: two invocations racing a blind
 * read-modify-write on conversations.player_count lose an update, and two
 * removed characters both mentioned in a third character's `rumors` field
 * can silently clobber each other's edit while BOTH legitimately report
 * 'verified' (a race-condition sibling of the evidence_cards shape bug this
 * function already caught and fixed once). Two independent mechanisms
 * prevent this:
 *   1. Chain-dispatch: on completion (verified, rolled_back, OR failed —
 *      see the single `finally` block below), this invocation looks up and
 *      fires the NEXT batch_sequence itself. Strictly sequential by
 *      construction: nothing ever starts the (n+1)th row except the nth
 *      row's own completion.
 *   2. Package-scoped claim (claim_package_for_adaptation /
 *      release_package_adaptation_claim, mirroring claim_package_for_
 *      remediation exactly — see 20260814_mystery_adaptations_batching.sql):
 *      chain-dispatch alone only serializes WITHIN one batch_id, not across
 *      two different batches racing the same package_id. This is the second
 *      line of defense for that case. If the claim can't be acquired (a
 *      different batch is genuinely mid-flight), this row reverts to 'paid'
 *      (not 'failed', so it stays retryable) and does NOT chain forward —
 *      dispatching the next character would skip this one.
 * When a chain finishes (no next batch_sequence AND zero non-terminal rows
 * remain in the batch), this invocation fires the completion email exactly
 * once — chain-dispatch's sequential guarantee means only the single
 * invocation that finishes the batch's last row will ever observe that.
 *
 * --- Murderer/accomplice reassignment (ADR-0088) ---
 * Phase B blocked murderer/accomplice outright. Now: removing one is
 * allowed, but requires a different remaining character to take over that
 * role — a real content-generation problem (round scripts, final_statement,
 * the detective_script reveal, evidence_cards' host-only significance notes
 * all encode guilt in prose, there is no canonical "solution" field to just
 * flip). See reassignWithClaude below. This runs in ADDITION to the normal
 * deterministic scrub (the removed character still needs scrubbing from
 * everyone else's content exactly like any other removal) — scrub first,
 * THEN reassignment writes on top of the already-scrubbed, already-polished
 * package text. Unlike a plain removal, there's no mechanical check for "did
 * this read as a convincing confession" — every reassignment row is flagged
 * host_review_recommended regardless of whether its mechanical checks pass,
 * never given the same silent full-confidence 'verified' a plain removal
 * gets.
 *
 * The removal itself is still a deterministic string/regex transform, not an
 * LLM call — this stays reliable regardless of AI availability. Two classes
 * of edit:
 *   - LIST fields (rumors, round2-4_questions, relationships): removed
 *     character's own block is dropped outright.
 *   - PROSE fields: every mention of the removed character is substituted
 *     with a present guest's name, chosen via a deterministic hash so
 *     mentions spread across the cast. The murderer is never chosen as a
 *     substitute. Anything this pass can't confidently rewrite is left
 *     untouched and flagged in transform_result.needs_review.
 *
 * A Claude Sonnet 5 polish pass runs AFTER the deterministic transform,
 * smoothing already-substituted text before anything is written. Its output
 * goes through the exact same verify-or-revert gate as everything else here
 * — no new trust boundary.
 *
 * POST body: { adaptation_id }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const ENABLED = Deno.env.get("ENABLE_GUEST_DROPOUT_ADAPTATION") === "true";

// No existing constant governs a minimum viable real-package headcount today —
// this is invented for this slice pending explicit product sign-off (see
// ADR-0082 Ambiguities). Matches the house "keep test mysteries small" floor.
// Duplicated in adapt-mystery-create/index.ts (create-time pre-check); these
// two functions deliberately don't share code (see below).
const MIN_REMAINING_CHARACTERS = 4;

// A dead 'processing' row (invocation crashed/killed after claiming but
// before finishing) is reclaimable after this TTL — mirrors the
// claim_package_for_remediation / claim_package_for_adaptation TTL pattern,
// applied here to the row-level claim too.
const CLAIM_TTL_MINUTES = 10;

// ---------------------------------------------------------------------------
// Field classification
// ---------------------------------------------------------------------------

// LIST fields: each removed-character mention lives in its own discrete,
// blank-line-separated block (a numbered question/rumor, or a relationship
// entry) — the whole block is dropped, matching the manual precedent exactly
// ("removed every Round 2 question to Pemberton and rumor about Pemberton",
// "deleted Pemberton relationship blocks").
const LIST_FIELDS = ["rumors", "round2_questions", "round3_questions", "round4_questions"];
const LIST_JSONB_FIELDS = ["relationships"]; // jsonb-wrapped markdown string, same block shape

// PROSE fields: free-flowing narrative where line/paragraph deletion would
// break sentence structure — every removed-character mention is substituted
// with a present guest's name instead. Includes every *_pointform twin so
// they never drift from their prose counterpart (a real, named requirement
// from the manual precedent: "kept every point-form twin in sync").
const PROSE_CHARACTER_FIELDS = [
  "description", "background", "introduction", "secret", "accusations",
  "quick_reference", "final_statement",
  "round2_script", "round3_script", "round4_script",
  "round2_innocent", "round2_guilty", "round2_accomplice",
  "round3_innocent", "round3_guilty", "round3_accomplice",
  "round4_innocent", "round4_guilty", "round4_accomplice",
  "final_innocent", "final_guilty", "final_accomplice",
  "reveal_confession_guilty", "reveal_confession_accomplice",
  "introduction_pointform", "rumors_pointform", "accusations_pointform",
  "round2_script_pointform", "round3_script_pointform", "round4_script_pointform",
  "final_statement_pointform",
  "round2_innocent_pointform", "round2_guilty_pointform", "round2_accomplice_pointform",
  "round3_innocent_pointform", "round3_guilty_pointform", "round3_accomplice_pointform",
  "round4_innocent_pointform", "round4_guilty_pointform", "round4_accomplice_pointform",
  "final_innocent_pointform", "final_guilty_pointform", "final_accomplice_pointform",
  "reveal_confession_guilty_pointform", "reveal_confession_accomplice_pointform",
];
// jsonb-wrapped, prose-substitution treatment IF it holds a plain string (see
// isJsonbString below) — same conservative "only rewrite a string-shaped
// jsonb column" posture as remediation_write_field, to avoid corrupting a
// column that turns out to hold a real object/array.
const PROSE_JSONB_FIELDS = ["secrets"];

const PACKAGE_PROSE_FIELDS = [
  "game_overview", "host_guide", "materials", "timeline",
  "hosting_tips", "preparation_instructions",
];
const PACKAGE_JSONB_FIELDS = ["evidence_cards"];
// detective_script gets prose substitution PLUS an appended "absent, cleared"
// paragraph (see applyDetectiveScriptPatch) — never a ledger-line rewrite for
// the deterministic pass, since parsing an arbitrary ledger's structure
// reliably isn't safe for a non-LLM pass. The reassignment pass (below) DOES
// rewrite detective_script's reveal section in place, via Claude, when
// applicable.

// Fields on the promoted character that a reassignment actually rewrites —
// kept intentionally small (ADR-0088: "bounded, not a full regeneration").
// Everything else about the promoted character (name, relationships, rumors,
// every OTHER field) is untouched.
const REASSIGN_CHARACTER_FIELDS = [
  "character_role", "round2_script", "round3_script", "round4_script",
  "final_statement", "secret", "background",
] as const;

// ---------------------------------------------------------------------------
// Name-variant matching — mirrors the exact regex approach already proven in
// supabase/migrations/20260802_detect_victim_is_playable_character.sql
// (gender-variant expansion for "Reginald/Regina Pemberton"-style names).
// ---------------------------------------------------------------------------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nameVariants(fullName: string): string[] {
  const variants = new Set<string>();
  const trimmed = fullName.trim();
  variants.add(trimmed);

  const slashMatch = trimmed.match(/^(.*?)\/(\S+)( .*)$/);
  if (slashMatch) {
    const [, before, altToken, rest] = slashMatch;
    variants.add(`${before}${rest}`.trim());
    variants.add(`${altToken}${rest}`.trim());
  }

  // Bare-surname fallback (the precedent note refers to "Pemberton" alone in
  // places) — last whitespace token, slash resolved, guarded by a minimum
  // length so it doesn't collide with common short words (mirrors the SQL
  // detector's own `length(btrim(v)) >= 6` guard, relaxed slightly to 4 since
  // this is a removal, not a fuzzy victim-detector, and false positives here
  // just mean an extra harmless substitution).
  const tokens = trimmed.replace("/", " ").split(/\s+/).filter(Boolean);
  const surname = tokens[tokens.length - 1];
  if (surname && surname.length >= 4) variants.add(surname);

  return [...variants].filter((v) => v.length >= 3);
}

function buildVariantRegex(variants: string[]): RegExp {
  // Word-boundary guarded (fix, incident 2026-08-20 / ADR-0098): without \b,
  // a short bare-surname fallback (e.g. "Cross") matches as a raw substring
  // inside unrelated words -- confirmed live against real customer content:
  // "across department meetings" and "p-hacking across multiple studies"
  // both matched variant "Cross" for removed character Dr. Finley/Fiona
  // Cross. That's a silent false positive in substituteVariants (garbles an
  // unrelated word) and a false verify failure in dropBlocksTargeting's
  // caller, which rolls back an otherwise-correct removal.
  const sorted = [...variants].sort((a, b) => b.length - a.length);
  return new RegExp(sorted.map((v) => `\\b${escapeRegex(v)}\\b`).join("|"), "gi");
}

// ---------------------------------------------------------------------------
// Deterministic substitute-name selection — a stable hash of
// (package, removed, source character, field) mod remaining-cast size, so
// mentions spread across the cast (matching the manual precedent's per-line
// variety) without a real LLM or true randomness. The murderer is never
// selected, so a removal can never draw extra scrutiny toward the culprit.
// ---------------------------------------------------------------------------

async function hashIndex(seed: string, mod: number): Promise<number> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed));
  const bytes = new Uint8Array(digest);
  let n = 0;
  for (let i = 0; i < 4; i++) n = (n * 256 + bytes[i]) >>> 0;
  return n % mod;
}

async function pickSubstitute(
  packageId: string, removedId: string, sourceId: string, field: string,
  pool: { id: string; character_name: string }[],
): Promise<string> {
  const candidates = pool.filter((c) => c.id !== sourceId);
  if (candidates.length === 0) return "another guest";
  const idx = await hashIndex(`${packageId}:${removedId}:${sourceId}:${field}`, candidates.length);
  return candidates[idx].character_name;
}

// ---------------------------------------------------------------------------
// Transform primitives
// ---------------------------------------------------------------------------

/** Drops any blank-line-separated block whose "To/About <Name>:" question
 *  target or "**Name** - " relationship subject matches a removed-character
 *  variant. Header-only blocks (no name-block shape) are always kept. */
function dropBlocksTargeting(text: string, variants: string[]): { result: string; droppedCount: number } {
  if (!text) return { result: text, droppedCount: 0 };
  const blocks = text.split(/\n\s*\n/);
  const nameShape = /^(?:\d+\.\s*)?\*\*(?:To|About)\s+([^:*]+):\*\*|^\*\*([^*]+)\*\*\s*-/;
  const variantsLower = variants.map((v) => v.toLowerCase());
  let dropped = 0;
  const kept = blocks.filter((block) => {
    const m = block.match(nameShape);
    const target = m ? (m[1] || m[2] || "").trim().toLowerCase() : null;
    if (!target) return true;
    const hit = variantsLower.some((v) => target.includes(v) || v.includes(target));
    if (hit) { dropped++; return false; }
    return true;
  });
  return { result: kept.join("\n\n"), droppedCount: dropped };
}

function substituteVariants(text: string, variantRegex: RegExp, substituteName: string): { result: string; count: number } {
  if (!text) return { result: text, count: 0 };
  let count = 0;
  const result = text.replace(variantRegex, () => { count++; return substituteName; });
  return { result, count };
}

function isJsonbString(value: unknown): value is string {
  return typeof value === "string";
}

/** evidence_cards' real shape (verified live): a jsonb ARRAY holding ONE
 *  markdown string per package, not a jsonb-wrapped string like relationships/
 *  host_guide -- distinct enough from every other jsonb field here to need
 *  its own transform rather than reusing isJsonbString. */
function isSingleStringArray(value: unknown): value is [string] {
  return Array.isArray(value) && value.length >= 1 && typeof value[0] === "string";
}

/** Scans a jsonb value for a variant match regardless of its shape (plain
 *  string, array, or object) -- used by verify so a field whose real shape
 *  diverges from what the transform step assumed can never silently pass. */
function jsonbValueMatches(value: unknown, variantRegex: RegExp): boolean {
  if (value == null) return false;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const hit = variantRegex.test(text);
  variantRegex.lastIndex = 0;
  return hit;
}

/** Unconditional append (never a structural ledger rewrite for the
 *  deterministic pass — see file header) acknowledging the removed character
 *  is absent and cleared, mirroring the manual precedent's detective_script
 *  edit in spirit if not exact form. For a reassignment row, the
 *  reassignment pass rewrites the REVEAL section separately, on top of this
 *  — the absent-note still applies (a real person is still gone from the
 *  party), it's just no longer the ONLY change to this field. */
function absentParagraph(characterName: string): string {
  return `\n\n---\n\n**Note (host only):** ${characterName} could not attend and has been cleared of suspicion ahead of time (never in the house, no opportunity) — proceed without them; no other character's script should reference them.`;
}

// ---------------------------------------------------------------------------
// Prose-smoothing pass (ADR-0082) — Claude Sonnet 5, matching the model the
// rest of this pipeline was upgraded to (ADR-0074), not the Haiku baseline
// other remediation functions in this codebase use for cheaper field-rewrite
// calls. Runs AFTER the deterministic transform, on already-substituted
// text, so it is strictly a polish pass, not a rewrite from scratch — and its
// output goes through the exact same verify-or-revert gate as the
// deterministic pass (see the caller), so a bad response is caught and rolled
// back the same way a deterministic bug would be. No new trust boundary.
//
// Uses structured outputs (output_config.format) instead of the
// parse-then-repair pattern regenerate-child-content needs for Haiku, since
// a json_schema response is guaranteed valid JSON — see project memory on
// Sonnet 5 occasionally emitting raw unescaped newlines in free-form JSON
// output; constraining the shape server-side avoids that class of bug
// entirely rather than adding a repair regex for it.
// ---------------------------------------------------------------------------

const ANTHROPIC_MODEL = "claude-sonnet-5";
// Sonnet 5 introductory pricing through 2026-08-31 ($2/$10 per MTok vs the
// standard $3/$15) — flat per-call estimate in the same style as
// regenerate-child-content's CLAUDE_CALL_COST_USD, not metered actual spend.
// One call, ~10-15 short fields in and out, well under 4000 output tokens.
const POLISH_CALL_COST_USD_ESTIMATE = 0.05;
// The reassignment call is a much bigger generation (new round scripts, a
// full confession, two package-level rewrites) — rough estimate, same
// "flat per-call, not metered" style, pending a real key to measure against.
const REASSIGN_CALL_COST_USD_ESTIMATE = 0.35;

// Incident 2026-08-20: an Anthropic call with no timeout hung indefinitely
// mid-invocation, past the point the code's own try/catch/finally can ever
// run — no error logged, no chain-dispatch, the whole batch silently
// orphaned (a batch's only forward progress comes from this invocation
// reaching finally). AbortSignal.timeout bounds every call here so a slow/
// stalled response always resolves into the existing catch-and-degrade
// (polish) or throw-and-chain-forward (reassign) paths instead of hanging.
// Incident 2026-08-22 (same day as the reassign max_tokens fix below): this
// call also truncated ("Unterminated string in JSON") on both of Eduardo's
// real reassignment runs, at a consistent ~9,250-character offset under the
// old max_tokens:4000 — same ~2.3 chars/token ratio as reassignWithClaude's
// truncation, scaled to this call's smaller output schema. Non-blocking
// (degrades to deterministic-only on any error, by design), so this was
// never customer-visible, but it's the same class of bug. max_tokens
// doubled to 8000 alongside it; timeout bumped proportionally.
const ANTHROPIC_TIMEOUT_MS = 60_000;
// reassignWithClaude specifically generates much more (3 round scripts, a
// full confession, a full detective_script, full evidence_cards_text —
// max_tokens 8000, the same size regenerate-child-content generates with NO
// client-side timeout at all). Incident 2026-08-22: the shared 45s budget
// above is sized for polishWithClaude's small targeted edits and made every
// live murderer/accomplice reassignment fail with "Signal timed out" before
// the call could finish — confirmed 100% reproducing (3 of 3 attempts same
// day, real customer). Kept well under Supabase's edge function wall-clock
// ceiling so a genuinely stalled call still resolves into the throw-and-
// chain-forward path instead of hanging the batch.
const REASSIGN_TIMEOUT_MS = 120_000;

interface PolishTarget { id: string; field: string; before: string; current: string }
interface PolishedField { id: string; field: string; text: string }
interface PolishReviewItem { id: string; field: string; reason: string }

const POLISH_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    polished_fields: {
      type: "array",
      description: "Only fields that genuinely read awkwardly after the mechanical edit. Omit fields that already read naturally — do not rewrite for its own sake.",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "The character id, or the literal string 'package' for package-level fields." },
          field: { type: "string" },
          text: { type: "string", description: "The full replacement field value, not a diff or excerpt." },
        },
        required: ["id", "field", "text"],
        additionalProperties: false,
      },
    },
    needs_human_review: {
      type: "array",
      description: "Anything you noticed that reads oddly but you're not confident enough to rewrite yourself.",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          field: { type: "string" },
          reason: { type: "string" },
        },
        required: ["id", "field", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["polished_fields", "needs_human_review"],
  additionalProperties: false,
};

function buildPolishPrompt(removedCharacterName: string, targets: PolishTarget[]): string {
  const fieldBlocks = targets.map((t) =>
    `[id=${t.id} field=${t.field}]\nORIGINAL (before removal): ${t.before}\nCURRENT (after mechanical edit): ${t.current}`
  ).join("\n\n---\n\n");

  return `<role>
You are copy-editing a murder-mystery party script after a character was surgically removed. A deterministic script already deleted list-item references and substituted the removed character's name with a present guest's name wherever it appeared in prose. Your job is ONLY to smooth the CURRENT text where that mechanical edit reads awkwardly — not to rewrite freely, not to change the plot, not to reintroduce the removed character.
</role>

<removed_character>
${removedCharacterName}
</removed_character>

<hard_rules>
- Never mention "${removedCharacterName}" or any variant of that name in your output — the character has been fully removed from this mystery.
- Preserve every fact, clue, and relationship that isn't specifically about the removed character. Do not add new plot content.
- Only touch a field if the CURRENT text reads mechanically or awkwardly BECAUSE of the substitution (e.g. an odd repetition of the substituted name, a sentence that no longer makes grammatical sense). If it already reads naturally, leave it out of your response entirely.
- Keep the same approximate length and tone as CURRENT — you are smoothing, not expanding or condensing.
- If a field needs a real content decision you're not confident making (e.g. a possessive phrase like "X's fortune" that needs a different noun entirely), do NOT guess — list it in needs_human_review instead.
</hard_rules>

<fields_to_review>
${fieldBlocks}
</fields_to_review>

Output a single JSON object matching the required schema. Do not include any field in polished_fields unless you are actually changing its text.`;
}

async function polishWithClaude(
  removedCharacterName: string,
  targets: PolishTarget[],
): Promise<{ fields: PolishedField[]; reviewItems: PolishReviewItem[]; costUsd: number } | null> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey || targets.length === 0) return null;

  const prompt = buildPolishPrompt(removedCharacterName, targets);

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 8000,
      // Bounded rewrite task, no tools — disabled thinking keeps cost/latency
      // down. Allowed: disabling thinking requires effort <= "high", and
      // "medium" is well below that ceiling.
      thinking: { type: "disabled" },
      // No temperature/top_p/top_k: Sonnet 5 rejects non-default sampling
      // params outright (400) — steer via the prompt instead.
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: POLISH_OUTPUT_SCHEMA },
      },
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Anthropic API ${resp.status}: ${errText}`);
  }
  const data = await resp.json();
  if (data.stop_reason === "refusal") {
    // Safety classifier declined — degrade to deterministic-only rather than
    // failing the whole removal. The caller's verify gate still runs either way.
    console.warn("polishWithClaude: model refused, falling back to deterministic-only output");
    return { fields: [], reviewItems: [], costUsd: 0 };
  }
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("polishWithClaude: no content in Anthropic response");

  // Guaranteed valid JSON by output_config.format — no repair pass needed
  // (contrast regenerate-child-content's parseJsonResponse, which needs one
  // because it takes free-form, not schema-constrained, output).
  const parsed = JSON.parse(text) as { polished_fields: PolishedField[]; needs_human_review: PolishReviewItem[] };
  return {
    fields: parsed.polished_fields ?? [],
    reviewItems: parsed.needs_human_review ?? [],
    costUsd: POLISH_CALL_COST_USD_ESTIMATE,
  };
}

// ---------------------------------------------------------------------------
// Reassignment pass (ADR-0088) — Claude Sonnet 5, structured outputs, same
// API-call shape as polishWithClaude above, but a genuinely different task:
// this one INVENTS new guilt-bearing content for a specific existing
// character, rather than smoothing already-substituted text. Only invoked
// when the removed character was murderer/accomplice.
// ---------------------------------------------------------------------------

interface ReassignCandidate {
  id: string;
  character_name: string;
  character_role: string | null;
  description: string | null;
  background: string | null;
  introduction: string | null;
  secret: string | null;
  round2_script: string | null;
  round3_script: string | null;
  round4_script: string | null;
  final_statement: string | null;
}

interface ReassignResult {
  promotedCharacterId: string;
  fields: Record<(typeof REASSIGN_CHARACTER_FIELDS)[number], string>;
  detectiveScript: string;
  evidenceCardsText: string;
  costUsd: number;
}

const REASSIGN_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    promoted_character_id: {
      type: "string",
      description: "The character id taking over the removed character's role. If the host already specified who, echo that same id back unchanged.",
    },
    round2_script: { type: "string" },
    round3_script: { type: "string" },
    round4_script: { type: "string" },
    final_statement: {
      type: "string",
      description: "A full confession (if promoting to murderer) or an admission of the role played in helping the murderer (if promoting to accomplice) — revealing motive, method, and timing. This is the reveal moment, not a denial.",
    },
    secret: {
      type: "string",
      description: "Adjusted, not fully replaced — keep this character's established personality and backstory facts; adjust only what's needed so their existing motive genuinely coheres with actually being guilty.",
    },
    background: {
      type: "string",
      description: "Adjusted, not fully replaced — same principle as secret.",
    },
    detective_script: {
      type: "string",
      description: "The FULL detective_script text, with ONLY the reveal/solution section rewritten to name the promoted character instead of the removed one. Every other section must be copied through unchanged from the CURRENT text provided.",
    },
    evidence_cards_text: {
      type: "string",
      description: "The FULL evidence card markdown text, with ONLY host-only 'SIGNIFICANCE' section(s) rewritten to point to the promoted character instead of the removed one — but only where the evidence's fixed physical description can plausibly support that connection (see hard_rules). Player-facing description sections must never name a culprit and must be copied through unchanged.",
    },
  },
  required: [
    "promoted_character_id", "round2_script", "round3_script", "round4_script",
    "final_statement", "secret", "background", "detective_script", "evidence_cards_text",
  ],
  additionalProperties: false,
};

function buildReassignPrompt(params: {
  removedName: string;
  removedRole: string;
  forcedReplacementId: string | null;
  candidates: ReassignCandidate[];
  currentDetectiveScript: string;
  currentEvidenceCardsText: string;
}): string {
  const { removedName, removedRole, forcedReplacementId, candidates, currentDetectiveScript, currentEvidenceCardsText } = params;

  const candidateBlocks = candidates.map((c) => `[id=${c.id}] ${c.character_name} (currently: ${c.character_role ?? "unassigned"})
description: ${c.description ?? ""}
background: ${c.background ?? ""}
introduction: ${c.introduction ?? ""}
secret: ${c.secret ?? ""}
round2_script (current, innocent-toned): ${c.round2_script ?? ""}
round3_script (current, innocent-toned): ${c.round3_script ?? ""}
round4_script (current, innocent-toned): ${c.round4_script ?? ""}
final_statement (current, innocent-toned): ${c.final_statement ?? ""}`).join("\n\n---\n\n");

  const selectionInstruction = forcedReplacementId
    ? `The host has already chosen who takes over: character id ${forcedReplacementId}. Use that character. Echo their id back as promoted_character_id.`
    : `No specific replacement was chosen — pick whichever candidate below makes the most narratively coherent culprit given their established secret/background/motive, and set promoted_character_id to their id.`;

  return `<role>
You are the story editor for a murder-mystery party game. The character who was originally the ${removedRole} — "${removedName}" — can no longer attend and has been removed from the story entirely. Someone else who is still attending must become the ${removedRole} instead, so the mystery still has a real, solvable answer.
</role>

<task>
${selectionInstruction}

For the promoted character, rewrite round2_script, round3_script, round4_script, and final_statement so they read as the ${removedRole} would — deflecting suspicion in the early rounds, and (for final_statement specifically) a genuine confession/admission in the reveal moment, not another denial. Adjust their secret and background just enough that their existing motive genuinely supports having done it — keep everything about their established personality and backstory that isn't specifically about guilt. Do not invent a new person; this is still the same character, now guilty.

Then rewrite the CURRENT detective_script and evidence card text below so the reveal/solution names the promoted character instead of "${removedName}" — change ONLY the sections that name the culprit, copy every other section through unchanged.
</task>

<hard_rules>
- Never leave "${removedName}" (or any close variant) anywhere in your output.
- The promoted character's core identity (name, who they are as a person) does not change — only their guilt-relevant content does.
- final_statement must read as a real confession/admission, not a hedge or another denial.
- detective_script and evidence_cards_text: reproduce every section you are not changing byte-for-byte from the CURRENT text given below. Only the culprit-naming sections should differ.
- Evidence significance must stay physically plausible: each evidence item's physical description is fixed and cannot change, only its SIGNIFICANCE explanation can. Before rewriting a SIGNIFICANCE section, check whether this specific physical item could plausibly reveal a fact about the promoted character's actual motive/method/opportunity (a financial ledger can plausibly show a bribe, payoff, or paper trail, but not a physical struggle; a torn photograph can place someone at a scene, but not prove a financial motive). If a genuine connection exists, use it — do not force an implausible one just to keep the culprit-naming pattern. If no plausible connection exists for a given item, keep its significance general (e.g. what it still proves about the crime, or that it doesn't clearly implicate anyone) rather than asserting a link that doesn't logically follow from what the item actually is.
</hard_rules>

<candidates>
${candidateBlocks}
</candidates>

<current_detective_script>
${currentDetectiveScript}
</current_detective_script>

<current_evidence_cards_text>
${currentEvidenceCardsText}
</current_evidence_cards_text>

Output a single JSON object matching the required schema.`;
}

async function reassignWithClaude(params: {
  removedName: string;
  removedRole: string;
  forcedReplacementId: string | null;
  candidates: ReassignCandidate[];
  currentDetectiveScript: string;
  currentEvidenceCardsText: string;
}): Promise<ReassignResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("reassignWithClaude: ANTHROPIC_API_KEY not configured — cannot reassign without it");
  if (params.candidates.length === 0) throw new Error("reassignWithClaude: no eligible remaining candidate to promote");

  const prompt = buildReassignPrompt(params);

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      // Incident 2026-08-22: 8000 was never validated against a real key
      // (ADR-0088 shipped this call untested against live Anthropic — "no
      // Anthropic key has been used anywhere in this feature yet"). It must
      // hold the ENTIRE detective_script and evidence_cards_text verbatim
      // (byte-for-byte reproduction is the whole point of the "only rewrite
      // the naming sections" instruction) plus all the new content — for
      // this real 16-character package that's ~9600 + ~1900 raw chars of
      // markdown before a single new word is generated, and JSON-escaping
      // every newline in that markdown inflates the wire size further. Both
      // live attempts truncated ("Unterminated string in JSON") at a
      // consistent ~19,000-character offset under the old 8000-token cap —
      // 16000 is sized off that measurement with real headroom, not another
      // guess. Non-streaming raw fetch (not the SDK) stays safe up to
      // ~16000 output tokens per Anthropic's own guidance; a package still
      // too large for this budget is exactly the case for a patch-based
      // rewrite (send only the reveal section, not the full document) —
      // worth building if this ceiling is ever hit again, not preemptively
      // here.
      max_tokens: 16000,
      thinking: { type: "disabled" },
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: REASSIGN_OUTPUT_SCHEMA },
      },
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(REASSIGN_TIMEOUT_MS),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Anthropic API ${resp.status}: ${errText}`);
  }
  const data = await resp.json();
  if (data.stop_reason === "refusal") {
    throw new Error("reassignWithClaude: model refused — cannot proceed without a real reassignment (unlike the polish pass, there is no safe deterministic-only fallback for inventing guilt content)");
  }
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("reassignWithClaude: no content in Anthropic response");

  const parsed = JSON.parse(text) as {
    promoted_character_id: string;
    round2_script: string; round3_script: string; round4_script: string; final_statement: string;
    secret: string; background: string;
    detective_script: string; evidence_cards_text: string;
  };

  const promotedId = params.forcedReplacementId ?? parsed.promoted_character_id;
  if (!params.candidates.some((c) => c.id === promotedId)) {
    throw new Error(`reassignWithClaude: promoted_character_id '${parsed.promoted_character_id}' is not one of the offered candidates`);
  }

  return {
    promotedCharacterId: promotedId,
    fields: {
      character_role: params.removedRole,
      round2_script: parsed.round2_script,
      round3_script: parsed.round3_script,
      round4_script: parsed.round4_script,
      final_statement: parsed.final_statement,
      secret: parsed.secret,
      background: parsed.background,
    },
    detectiveScript: parsed.detective_script,
    evidenceCardsText: parsed.evidence_cards_text,
    costUsd: REASSIGN_CALL_COST_USD_ESTIMATE,
  };
}

// ---------------------------------------------------------------------------
// DB row shapes (partial — only fields this function touches)
// ---------------------------------------------------------------------------

interface AdaptationRow {
  id: string; package_id: string; conversation_id: string; character_id: string;
  character_name: string; character_role: string | null; status: string;
  batch_id: string; batch_sequence: number;
  requested_replacement_character_id: string | null;
}

interface CharacterRow {
  id: string; package_id: string; character_name: string; character_role: string | null;
  [field: string]: unknown;
}

interface FieldChange { field: string; before: unknown; after: unknown; kind: "list" | "prose" }
interface CharacterChangeSet { id: string; character_name: string; changes: FieldChange[] }

function isReassignRole(role: string | null): boolean {
  return role === "murderer" || role === "accomplice";
}

// Fire-and-forget dispatches (chain-dispatch, the completion email) need the
// isolate to survive past the response being returned. EdgeRuntime.waitUntil
// is the documented way to guarantee that
// (https://supabase.com/docs/guides/functions/background-tasks) — used here
// when available. Not declared as a TS ambient global (this project's pinned
// local edge-runtime, v1.74.3, predates it, and there's no guarantee it's
// present at all versions) — checked defensively at runtime instead, falling
// back to a plain un-awaited fetch (today's behavior) when it's absent, so
// this never breaks on a runtime that doesn't have it.
function fireAndForget(promise: Promise<unknown>): void {
  const settled = promise.catch((e) => console.error("background dispatch failed:", e));
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (runtime?.waitUntil) {
    runtime.waitUntil(settled);
  }
  // If waitUntil isn't available, `settled` is still a live, non-blocking
  // promise doing its best-effort work — same guarantee this code already
  // had before this change, just without the extra survival guarantee.
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!ENABLED) {
    return new Response(JSON.stringify({ error: "not_enabled" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Captured outside the try block so both the catch handler AND the finally
  // block (chain-dispatch / completion email / claim release) can act
  // without depending on values only bound deep inside the try. This is the
  // ADR-0088 "single choke point" — every exit path (verified, rolled_back,
  // an ordinary thrown error, or the package-claim-contention early return)
  // passes through this one finally, so none of them can silently forget to
  // release the claim or chain forward.
  let adaptationIdForCatch: string | undefined;
  let packageIdForCleanup: string | undefined;
  let packageClaimAcquired = false;
  let batchInfoForChain: { batchId: string; batchSequence: number } | undefined;

  try {
    const { adaptation_id } = await req.json();
    adaptationIdForCatch = adaptation_id;
    if (!adaptation_id) {
      return new Response(JSON.stringify({ error: "adaptation_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atomic claim: proceed if this row is currently 'paid', OR if it's
    // 'processing' but has been stuck there past the TTL (a prior invocation
    // crashed after claiming but before finishing). Guards against both
    // double-invocation (a retried webhook dispatch) and a dead invocation
    // silently orphaning this row forever.
    const claimAttemptStartedAt = new Date();
    const ttlCutoff = new Date(claimAttemptStartedAt.getTime() - CLAIM_TTL_MINUTES * 60_000).toISOString();
    const { data: claimed, error: claimErr } = await supabase
      .from("mystery_adaptations")
      .update({ status: "processing", processing_started_at: claimAttemptStartedAt.toISOString() })
      .eq("id", adaptation_id)
      .or(`status.eq.paid,and(status.eq.processing,processing_started_at.lt.${ttlCutoff})`)
      .select("*")
      .maybeSingle();
    if (claimErr) throw new Error(`claim failed: ${claimErr.message}`);

    let adaptation: AdaptationRow;
    if (claimed) {
      adaptation = claimed as AdaptationRow;
    } else {
      // Incident 2026-08-20/21 (ADR-0098): reproduced live — the UPDATE
      // above can commit in Postgres while its acknowledgement (the
      // returned row) never makes it back to this code, so `claimed` reads
      // null even though the write actually happened and this invocation
      // really does own the row. Distinguishable from a genuinely different
      // claimant (another real invocation, or a stale TTL-expired row)
      // because THAT case can't produce a processing_started_at newer than
      // the moment this attempt started — only our own just-committed,
      // lost-acknowledgement write can. A tight recency window (well under
      // CLAIM_TTL_MINUTES) keeps this from ever mistaking a truly separate
      // claimant for our own lost ack.
      const { data: current } = await supabase.from("mystery_adaptations").select("*").eq("id", adaptation_id).maybeSingle();
      const recentSelfClaim = current
        && current.status === "processing"
        && current.completed_at == null
        && current.processing_started_at != null
        && new Date(current.processing_started_at) >= claimAttemptStartedAt;
      if (recentSelfClaim) {
        console.warn(`adapt-mystery-apply: claim UPDATE for ${adaptation_id} returned no acknowledgement but the row is already 'processing' as of this attempt — proceeding as the owner (lost-ack recovery, see ADR-0098)`);
        adaptation = current as AdaptationRow;
      } else {
        return new Response(JSON.stringify({
          outcome: "noop", adaptation_id,
          note: current ? `row is '${current.status}', not claimable — no-op (already processed, not yet paid, or another invocation currently owns it)` : "adaptation_id not found",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
    packageIdForCleanup = adaptation.package_id;
    batchInfoForChain = { batchId: adaptation.batch_id, batchSequence: adaptation.batch_sequence };

    // Package-scoped concurrency claim (ADR-0088) — second line of defense
    // beyond chain-dispatch's ordering guarantee, protecting against a
    // DIFFERENT batch racing this same package. Mirrors
    // claim_package_for_remediation exactly (see migration header comment
    // for why a bare pg_advisory_lock doesn't work over PostgREST here).
    const { data: packageClaimed, error: pkgClaimErr } = await supabase
      .rpc("claim_package_for_adaptation", { _pkg_id: adaptation.package_id, _ttl_minutes: CLAIM_TTL_MINUTES });
    if (pkgClaimErr) throw new Error(`package claim RPC failed: ${pkgClaimErr.message}`);
    if (!packageClaimed) {
      // Another batch is genuinely mid-flight against this package. Revert
      // this row to 'paid' (not 'failed') so it stays cleanly retryable.
      // Deliberately clear batchInfoForChain so the finally block does NOT
      // chain-dispatch forward — dispatching the next character now would
      // skip this one entirely.
      await supabase.from("mystery_adaptations").update({ status: "paid" }).eq("id", adaptation_id);
      batchInfoForChain = undefined;
      return new Response(JSON.stringify({ outcome: "deferred", adaptation_id, reason: "package_busy_with_another_batch" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    packageClaimAcquired = true;

    const { data: target, error: targetErr } = await supabase
      .from("mystery_characters").select("*").eq("id", adaptation.character_id).maybeSingle();
    if (targetErr) throw new Error(`target character lookup failed: ${targetErr.message}`);
    if (!target) throw new Error(`target character ${adaptation.character_id} not found — cannot proceed`);
    const targetRow = target as CharacterRow;

    const { data: others, error: othersErr } = await supabase
      .from("mystery_characters").select("*").eq("package_id", adaptation.package_id).neq("id", adaptation.character_id);
    if (othersErr) throw new Error(`other characters lookup failed: ${othersErr.message}`);
    const otherRowsRaw = (others ?? []) as CharacterRow[];

    // Sibling-batch exclusion (ADR-0088): a character still targeted by a
    // non-terminal sibling row in this SAME batch is scheduled for removal
    // moments from now — exclude them from both the "other characters to
    // scan" set and the substitute pool. Not a correctness requirement
    // (that sibling's own later pass would re-scrub whatever this pass
    // writes into their fields), just avoids a wasted polish call and a
    // confusing substitution chain (X→Y→Y's-own-replacement instead of
    // X→final-name directly).
    const { data: siblingRows } = await supabase
      .from("mystery_adaptations")
      .select("character_id")
      .eq("batch_id", adaptation.batch_id)
      .neq("id", adaptation.id)
      .not("status", "in", "(verified,rolled_back,failed)");
    const siblingIds = new Set((siblingRows ?? []).map((s) => s.character_id as string));
    const otherRows = otherRowsRaw.filter((c) => !siblingIds.has(c.id));

    const { data: pkg, error: pkgErr } = await supabase
      .from("mystery_packages")
      .select("id, mystery_style, detective_script, game_overview, host_guide, materials, timeline, hosting_tips, preparation_instructions, evidence_cards")
      .eq("id", adaptation.package_id).maybeSingle();
    if (pkgErr || !pkg) throw new Error(`package lookup failed: ${pkgErr?.message ?? "not found"}`);

    const { data: assignment } = await supabase
      .from("character_assignments").select("*").eq("character_id", adaptation.character_id).maybeSingle();

    const { data: conversation, error: convErr } = await supabase
      .from("conversations").select("id, player_count").eq("id", adaptation.conversation_id).maybeSingle();
    if (convErr || !conversation) throw new Error(`conversation lookup failed: ${convErr?.message ?? "not found"}`);

    const variants = nameVariants(adaptation.character_name);
    const variantRegex = buildVariantRegex(variants);
    const substitutePool = otherRows
      .filter((c) => c.character_role !== "murderer")
      .map((c) => ({ id: c.id, character_name: c.character_name }));

    // --- Snapshot + transform other characters (only fields that actually match) ---
    const characterChanges: CharacterChangeSet[] = [];
    const needsReview: string[] = [];

    for (const other of otherRows) {
      const changes: FieldChange[] = [];

      for (const field of LIST_FIELDS) {
        const current = other[field];
        if (typeof current !== "string" || !current) continue;
        const { result, droppedCount } = dropBlocksTargeting(current, variants);
        if (droppedCount > 0) changes.push({ field, before: current, after: result, kind: "list" });
      }
      for (const field of LIST_JSONB_FIELDS) {
        const current = other[field];
        if (!isJsonbString(current) || !current) continue;
        const { result, droppedCount } = dropBlocksTargeting(current, variants);
        if (droppedCount > 0) changes.push({ field, before: current, after: result, kind: "list" });
      }

      for (const field of PROSE_CHARACTER_FIELDS) {
        const current = other[field];
        if (typeof current !== "string" || !current) continue;
        const sub = await pickSubstitute(adaptation.package_id, adaptation.character_id, other.id, field, substitutePool);
        const { result, count } = substituteVariants(current, variantRegex, sub);
        if (count > 0) changes.push({ field, before: current, after: result, kind: "prose" });
      }
      for (const field of PROSE_JSONB_FIELDS) {
        const current = other[field];
        if (current == null) continue;
        // Fix, incident 2026-08-20 / ADR-0098: `secrets` is actually a
        // jsonb ARRAY holding one markdown string per character -- the
        // same real shape `evidence_cards` already special-cases below --
        // not a jsonb-wrapped plain string. Without this check every
        // array-shaped secrets field was silently skipped here, then
        // correctly (but avoidably) caught by the verify gate downstream,
        // rolling back an otherwise-correct removal.
        if (isSingleStringArray(current)) {
          const sub = await pickSubstitute(adaptation.package_id, adaptation.character_id, other.id, field, substitutePool);
          const { result, count } = substituteVariants(current[0], variantRegex, sub);
          if (count > 0) changes.push({ field, before: current, after: [result, ...current.slice(1)], kind: "prose" });
          continue;
        }
        if (!isJsonbString(current)) {
          if (variantRegex.test(JSON.stringify(current))) needsReview.push(`${other.character_name}.${field} (non-string jsonb, references removed character — skipped, needs manual review)`);
          // Fix, incident 2026-08-20 / ADR-0098: this was the only
          // variantRegex.test() call in the file that didn't reset
          // lastIndex afterward. variantRegex is global-flagged and reused
          // across every later scan in this invocation (including verify)
          // -- a stale lastIndex here could make a later .test() on a
          // different string start mid-way through it and silently miss a
          // real match, the worst failure mode (a stale reference passing
          // verify undetected) rather than just an over-cautious rollback.
          variantRegex.lastIndex = 0;
          continue;
        }
        const sub = await pickSubstitute(adaptation.package_id, adaptation.character_id, other.id, field, substitutePool);
        const { result, count } = substituteVariants(current, variantRegex, sub);
        if (count > 0) changes.push({ field, before: current, after: result, kind: "prose" });
      }

      // Collected only — NOT written yet. Writes happen in one pass below,
      // after the polish step (if any) has had a chance to replace `.after`
      // values, so a character is never written twice.
      if (changes.length > 0) {
        characterChanges.push({ id: other.id, character_name: other.character_name, changes });
      }
    }

    // --- Snapshot + transform package-level fields ---
    const packageChanges: FieldChange[] = [];
    for (const field of PACKAGE_PROSE_FIELDS) {
      const current = (pkg as Record<string, unknown>)[field];
      if (typeof current !== "string" || !current) continue;
      const sub = await pickSubstitute(adaptation.package_id, adaptation.character_id, "package", field, substitutePool);
      const { result, count } = substituteVariants(current, variantRegex, sub);
      if (count > 0) packageChanges.push({ field, before: current, after: result, kind: "prose" });
    }
    for (const field of PACKAGE_JSONB_FIELDS) {
      const current = (pkg as Record<string, unknown>)[field];
      // evidence_cards' real shape is [markdownString], not a wrapped string
      // (see isSingleStringArray) -- only the first element is ever populated
      // in practice, so transform that element and preserve the rest as-is.
      if (isSingleStringArray(current)) {
        const sub = await pickSubstitute(adaptation.package_id, adaptation.character_id, "package", field, substitutePool);
        const { result, count } = substituteVariants(current[0], variantRegex, sub);
        if (count > 0) {
          const after = [result, ...current.slice(1)];
          packageChanges.push({ field, before: current, after, kind: "prose" });
        }
        continue;
      }
      if (isJsonbString(current) && current) {
        const sub = await pickSubstitute(adaptation.package_id, adaptation.character_id, "package", field, substitutePool);
        const { result, count } = substituteVariants(current, variantRegex, sub);
        if (count > 0) packageChanges.push({ field, before: current, after: result, kind: "prose" });
      }
    }
    // detective_script: substitution pass for stray mentions PLUS an
    // unconditional "absent, cleared" paragraph append (see file header).
    {
      const current = pkg.detective_script;
      if (typeof current === "string" && current) {
        const sub = await pickSubstitute(adaptation.package_id, adaptation.character_id, "package", "detective_script", substitutePool);
        const { result } = substituteVariants(current, variantRegex, sub);
        const withNote = result + absentParagraph(adaptation.character_name);
        packageChanges.push({ field: "detective_script", before: current, after: withNote, kind: "prose" });
      }
    }

    // --- Prose-smoothing pass (ADR-0082): polish the deterministic output
    // with Claude Sonnet 5 before anything is written. Best-effort — a
    // failure here degrades to the deterministic-only result rather than
    // failing the whole removal; the verify gate below is what actually
    // guarantees correctness, for either path. Runs BEFORE the reassignment
    // pass (if any) so reassignment's freshly-invented content is never fed
    // back into a "smooth mechanical substitution" pass that isn't the right
    // tool for it — polish only ever sees the deterministic M-scrub changes. ---
    let llmCostUsd = 0;
    let llmFieldsPolished = 0;
    if (Deno.env.get("ANTHROPIC_API_KEY")) {
      try {
        const targets: PolishTarget[] = [];
        for (const cc of characterChanges) {
          for (const c of cc.changes) {
            if (c.kind === "prose" && typeof c.before === "string" && typeof c.after === "string") {
              targets.push({ id: cc.id, field: c.field, before: c.before, current: c.after });
            }
          }
        }
        for (const c of packageChanges) {
          if (c.kind === "prose" && typeof c.before === "string" && typeof c.after === "string") {
            targets.push({ id: "package", field: c.field, before: c.before, current: c.after });
          }
        }

        const polished = await polishWithClaude(adaptation.character_name, targets);
        if (polished) {
          llmCostUsd = polished.costUsd;
          for (const pf of polished.fields) {
            if (pf.id === "package") {
              const target = packageChanges.find((c) => c.field === pf.field);
              if (target) { target.after = pf.text; llmFieldsPolished++; }
            } else {
              const cc = characterChanges.find((c) => c.id === pf.id);
              const target = cc?.changes.find((c) => c.field === pf.field);
              if (target) { target.after = pf.text; llmFieldsPolished++; }
            }
          }
          for (const ri of polished.reviewItems) {
            needsReview.push(`${ri.id}.${ri.field} (flagged by prose-smoothing pass: ${ri.reason})`);
          }
        }
      } catch (e) {
        // Degrade to deterministic-only — do not fail the removal over a
        // polish-pass error. Logged for visibility, not surfaced as a failure.
        console.error("polishWithClaude failed, continuing with deterministic-only output:", (e as Error).message);
        needsReview.push(`prose-smoothing pass errored (${(e as Error).message}) — deterministic-only output used`);
      }
    }

    // --- Reassignment pass (ADR-0088): only when the removed character was
    // murderer/accomplice. Runs AFTER polish, on the now-clean post-scrub
    // package text, and merges its output on TOP of characterChanges /
    // packageChanges — same deferred-write mechanism as everything else, so
    // a reassignment failure reverts exactly like any other verify failure. ---
    let reassignmentResult: ReassignResult | null = null;
    let hostReviewRecommended = false;
    if (isReassignRole(adaptation.character_role)) {
      hostReviewRecommended = true; // ADR-0088 honesty commitment — always, regardless of outcome below.

      const eligibleCandidates = otherRows.filter(
        (c) => c.character_role === "suspect" || c.character_role === "redHerring"
      );
      const forcedId = adaptation.requested_replacement_character_id;
      if (forcedId && !eligibleCandidates.some((c) => c.id === forcedId)) {
        // The host's choice is no longer valid (e.g. it was itself removed
        // by an earlier row in this same batch, or its role changed) —
        // don't silently ignore the request, fail this row into a clean,
        // revertible state instead of guessing.
        throw new Error(`requested replacement ${forcedId} is not an eligible remaining candidate`);
      }

      const candidatePool: ReassignCandidate[] = (forcedId
        ? eligibleCandidates.filter((c) => c.id === forcedId)
        : eligibleCandidates
      ).map((c) => ({
        id: c.id,
        character_name: c.character_name,
        character_role: c.character_role,
        description: (c.description as string) ?? null,
        background: (c.background as string) ?? null,
        introduction: (c.introduction as string) ?? null,
        secret: (c.secret as string) ?? null,
        round2_script: (c.round2_script as string) ?? null,
        round3_script: (c.round3_script as string) ?? null,
        round4_script: (c.round4_script as string) ?? null,
        final_statement: (c.final_statement as string) ?? null,
      }));

      const currentDetectiveScript = (packageChanges.find((c) => c.field === "detective_script")?.after as string)
        ?? (pkg.detective_script as string) ?? "";
      const evidenceCardsChange = packageChanges.find((c) => c.field === "evidence_cards");
      const currentEvidenceCardsText = evidenceCardsChange
        ? (isSingleStringArray(evidenceCardsChange.after) ? evidenceCardsChange.after[0] : String(evidenceCardsChange.after))
        : (isSingleStringArray(pkg.evidence_cards) ? pkg.evidence_cards[0] : "");

      reassignmentResult = await reassignWithClaude({
        removedName: adaptation.character_name,
        removedRole: adaptation.character_role as string,
        forcedReplacementId: forcedId,
        candidates: candidatePool,
        currentDetectiveScript,
        currentEvidenceCardsText,
      });
      llmCostUsd += reassignmentResult.costUsd;

      const promoted = otherRows.find((c) => c.id === reassignmentResult!.promotedCharacterId);
      if (!promoted) throw new Error(`reassignment promoted a character not found in this package's cast`);

      let promotedChangeSet = characterChanges.find((cc) => cc.id === promoted.id);
      if (!promotedChangeSet) {
        promotedChangeSet = { id: promoted.id, character_name: promoted.character_name, changes: [] };
        characterChanges.push(promotedChangeSet);
      }
      for (const field of REASSIGN_CHARACTER_FIELDS) {
        const before = promoted[field] ?? null;
        const after = reassignmentResult.fields[field];
        const existingIdx = promotedChangeSet.changes.findIndex((c) => c.field === field);
        const change: FieldChange = { field, before, after, kind: "prose" };
        if (existingIdx >= 0) promotedChangeSet.changes[existingIdx] = change;
        else promotedChangeSet.changes.push(change);
      }

      const dsIdx = packageChanges.findIndex((c) => c.field === "detective_script");
      const dsBefore = dsIdx >= 0 ? packageChanges[dsIdx].before : pkg.detective_script;
      const dsChange: FieldChange = { field: "detective_script", before: dsBefore, after: reassignmentResult.detectiveScript, kind: "prose" };
      if (dsIdx >= 0) packageChanges[dsIdx] = dsChange; else packageChanges.push(dsChange);

      const ecBefore = evidenceCardsChange ? evidenceCardsChange.before : pkg.evidence_cards;
      const ecBeforeArray = isSingleStringArray(ecBefore) ? ecBefore : [String(currentEvidenceCardsText)];
      const ecAfter = [reassignmentResult.evidenceCardsText, ...ecBeforeArray.slice(1)];
      const ecIdx = packageChanges.findIndex((c) => c.field === "evidence_cards");
      const ecChange: FieldChange = { field: "evidence_cards", before: ecBefore, after: ecAfter, kind: "prose" };
      if (ecIdx >= 0) packageChanges[ecIdx] = ecChange; else packageChanges.push(ecChange);
    }

    // --- Write everything (characters, then package) — deferred until here
    // so the polish and reassignment passes above could finalize `.after`
    // values first. ---
    for (const cc of characterChanges) {
      const updatePayload: Record<string, unknown> = {};
      for (const c of cc.changes) updatePayload[c.field] = c.after;
      const { error: updErr } = await supabase.from("mystery_characters").update(updatePayload).eq("id", cc.id);
      if (updErr) throw new Error(`write failed for character ${cc.id}: ${updErr.message}`);
    }
    if (packageChanges.length > 0) {
      const updatePayload: Record<string, unknown> = {};
      for (const c of packageChanges) updatePayload[c.field] = c.after;
      const { error: pkgUpdErr } = await supabase.from("mystery_packages").update(updatePayload).eq("id", adaptation.package_id);
      if (pkgUpdErr) throw new Error(`package write failed: ${pkgUpdErr.message}`);
    }

    // --- conversations.player_count decrement (HostGuideTemplate renders the
    // slip count live from this — not a stored text field, per ADR-0082). ---
    const previousPlayerCount = conversation.player_count as number | null;
    if (typeof previousPlayerCount === "number") {
      const { error: convUpdErr } = await supabase
        .from("conversations").update({ player_count: previousPlayerCount - 1 }).eq("id", adaptation.conversation_id);
      if (convUpdErr) throw new Error(`player_count decrement failed: ${convUpdErr.message}`);
    }

    // --- Delete assignment then character, LAST (so any earlier failure never
    // needs to resurrect a deleted row). ---
    if (assignment) {
      const { error: delAssignErr } = await supabase.from("character_assignments").delete().eq("id", assignment.id);
      if (delAssignErr) throw new Error(`assignment delete failed: ${delAssignErr.message}`);
    }
    const { error: delCharErr } = await supabase.from("mystery_characters").delete().eq("id", targetRow.id);
    if (delCharErr) throw new Error(`character delete failed: ${delCharErr.message}`);

    const snapshot = {
      character: targetRow,
      assignment: assignment ?? null,
      conversation_player_count: previousPlayerCount,
      package_changes: packageChanges.map((c) => ({ field: c.field, before: c.before })),
      character_changes: characterChanges.map((cc) => ({
        id: cc.id, changes: cc.changes.map((c) => ({ field: c.field, before: c.before })),
      })),
    };
    await supabase.from("mystery_adaptations").update({ snapshot }).eq("id", adaptation_id);

    // --- Verify ---
    const verifyIssues: string[] = [];

    const { data: remaining, error: remainingErr } = await supabase
      .from("mystery_characters").select("*").eq("package_id", adaptation.package_id);
    if (remainingErr) throw new Error(`post-write verify read failed: ${remainingErr.message}`);
    const remainingRows = (remaining ?? []) as CharacterRow[];

    for (const row of remainingRows) {
      for (const field of [...LIST_FIELDS, ...PROSE_CHARACTER_FIELDS]) {
        const v = row[field];
        if (typeof v === "string" && variantRegex.test(v)) verifyIssues.push(`${row.character_name}.${field} still references removed character`);
        variantRegex.lastIndex = 0;
      }
      // jsonb fields are scanned shape-agnostically (jsonbValueMatches
      // stringifies whatever it finds) rather than assuming they're plain
      // strings -- evidence_cards turned out NOT to be, and the transform
      // step's own shape assumption must not be the only line of defense.
      for (const field of [...LIST_JSONB_FIELDS, ...PROSE_JSONB_FIELDS]) {
        if (jsonbValueMatches(row[field], variantRegex)) verifyIssues.push(`${row.character_name}.${field} still references removed character`);
      }
    }
    const { data: pkgAfter } = await supabase
      .from("mystery_packages")
      .select("detective_script, game_overview, host_guide, materials, timeline, hosting_tips, preparation_instructions, evidence_cards")
      .eq("id", adaptation.package_id).maybeSingle();
    for (const field of PACKAGE_PROSE_FIELDS) {
      const v = (pkgAfter as Record<string, unknown> | null)?.[field];
      if (typeof v === "string" && variantRegex.test(v)) verifyIssues.push(`package.${field} still references removed character`);
      variantRegex.lastIndex = 0;
    }
    for (const field of PACKAGE_JSONB_FIELDS) {
      const v = (pkgAfter as Record<string, unknown> | null)?.[field];
      if (jsonbValueMatches(v, variantRegex)) verifyIssues.push(`package.${field} still references removed character`);
    }
    // detective_script deliberately keeps ONE mention of the removed
    // character, inside the templated absent/cleared note appended above
    // (matching the manual precedent, which also names the absent character
    // in the detective's host-only acknowledgment) -- strip exactly that
    // known suffix before scanning for genuinely-leftover references.
    {
      const v = (pkgAfter as Record<string, unknown> | null)?.detective_script;
      if (typeof v === "string") {
        const note = absentParagraph(adaptation.character_name);
        const withoutNote = v.endsWith(note) ? v.slice(0, -note.length) : v;
        if (variantRegex.test(withoutNote)) verifyIssues.push("package.detective_script still references removed character outside the absent-note");
        variantRegex.lastIndex = 0;
      }
    }

    if (remainingRows.length < MIN_REMAINING_CHARACTERS) {
      verifyIssues.push(`headcount ${remainingRows.length} below minimum ${MIN_REMAINING_CHARACTERS}`);
    }
    // Expect exactly 1 murderer post-removal — but ONLY for detective-style
    // packages. Caught via local testing: character-style (slip-mechanic)
    // packages legitimately have character_role=NULL on every row (G8 — no
    // predetermined culprit), so murdererCount is always 0 there, before AND
    // after any removal. An earlier version of this check ran unconditionally
    // and rolled back a perfectly valid character-style removal because it
    // found 0 murderers where it expected 1 — that invariant only means
    // anything when a culprit is predetermined at all. A reassignment
    // guarantees a new murderer is installed when the removed character WAS
    // the murderer, so within detective-style packages the check is still
    // unconditional (not just "when the removed character wasn't the
    // murderer", which assumed murderer removal could never happen at all).
    const isDetectiveStyle = pkg.mystery_style !== "character";
    if (isDetectiveStyle) {
      const murdererCount = remainingRows.filter((r) => r.character_role === "murderer").length;
      if (murdererCount !== 1) {
        verifyIssues.push(`expected exactly 1 murderer post-removal, found ${murdererCount}`);
      }
    }
    if (reassignmentResult) {
      const promotedAfter = remainingRows.find((r) => r.id === reassignmentResult!.promotedCharacterId);
      if (!promotedAfter) {
        verifyIssues.push("promoted character not found among remaining characters post-write");
      } else {
        if (promotedAfter.character_role !== adaptation.character_role) {
          verifyIssues.push(`promoted character's role is '${promotedAfter.character_role}', expected '${adaptation.character_role}'`);
        }
        if (typeof promotedAfter.final_statement !== "string" || !promotedAfter.final_statement.trim()) {
          verifyIssues.push("promoted character's final_statement is empty after reassignment");
        }
      }
      const dsAfter = (pkgAfter as Record<string, unknown> | null)?.detective_script;
      const promotedName = promotedAfter?.character_name;
      // Bug, incident 2026-08-22: character_name is a "Real Name -
      // PlayerNickname" composite (e.g. "Fulgencio Villamar - MauSal").
      // Claude's prose naturally writes the real name alone, never the
      // literal " - Nickname" suffix, so a full-string .includes() here
      // failed on every reassignment that reached this check at all,
      // rolling back an otherwise-correct write. Check against the real-name
      // portion instead (mirrors how every other prose field in this
      // pipeline already treats the "Real Name - Nickname" split).
      const promotedRealName = promotedName?.split(" - ")[0]?.trim();
      if (promotedRealName && typeof dsAfter === "string" && !dsAfter.includes(promotedRealName)) {
        verifyIssues.push("detective_script does not mention the promoted character's name after reassignment");
      }
    }

    if (verifyIssues.length > 0) {
      // --- Revert everything, byte-for-byte, from the snapshot just written ---
      for (const cc of characterChanges) {
        const restore: Record<string, unknown> = {};
        for (const c of cc.changes) restore[c.field] = c.before;
        await supabase.from("mystery_characters").update(restore).eq("id", cc.id);
      }
      if (packageChanges.length > 0) {
        const restore: Record<string, unknown> = {};
        for (const c of packageChanges) restore[c.field] = c.before;
        await supabase.from("mystery_packages").update(restore).eq("id", adaptation.package_id);
      }
      if (typeof previousPlayerCount === "number") {
        await supabase.from("conversations").update({ player_count: previousPlayerCount }).eq("id", adaptation.conversation_id);
      }
      await supabase.from("mystery_characters").insert(targetRow);
      if (assignment) await supabase.from("character_assignments").insert(assignment);

      await supabase.from("mystery_adaptations").update({
        status: "rolled_back",
        verify_result: { issues: verifyIssues },
        error_message: verifyIssues.join("; "),
        completed_at: new Date().toISOString(),
      }).eq("id", adaptation_id);

      return new Response(JSON.stringify({ outcome: "rolled_back", adaptation_id, reason: verifyIssues }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("mystery_adaptations").update({
      status: "verified",
      transform_result: {
        removed_character: adaptation.character_name,
        touched_characters: characterChanges.map((cc) => cc.character_name),
        package_fields_touched: packageChanges.map((c) => c.field),
        needs_review: needsReview,
        llm_polish: { fields_polished: llmFieldsPolished, cost_usd_estimate: llmCostUsd },
        host_review_recommended: hostReviewRecommended,
        ...(reassignmentResult ? {
          reassignment: {
            promoted_character_id: reassignmentResult.promotedCharacterId,
            promoted_character_name: characterChanges.find((cc) => cc.id === reassignmentResult!.promotedCharacterId)?.character_name,
            new_role: adaptation.character_role,
            selection: adaptation.requested_replacement_character_id ? "host_selected" : "auto",
            fields_rewritten: REASSIGN_CHARACTER_FIELDS,
          },
        } : {}),
      },
      verify_result: { issues: [], remaining_character_count: remainingRows.length },
      completed_at: new Date().toISOString(),
    }).eq("id", adaptation_id);

    return new Response(JSON.stringify({
      outcome: "verified",
      adaptation_id,
      removed_character: adaptation.character_name,
      touched_characters: characterChanges.map((cc) => cc.character_name),
      needs_review: needsReview,
      llm_fields_polished: llmFieldsPolished,
      host_review_recommended: hostReviewRecommended,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("adapt-mystery-apply error:", (error as Error).message, (error as Error).stack);
    if (adaptationIdForCatch) {
      // Only flips 'processing' -> 'failed'. If the claim step itself never
      // ran (row still 'paid') this intentionally no-ops, leaving the row
      // retryable rather than masking a claim-time failure as terminal.
      await supabase.from("mystery_adaptations").update({
        status: "failed", error_message: (error as Error).message,
      }).eq("id", adaptationIdForCatch).eq("status", "processing");
    }
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    // ADR-0088 single choke point: release the package claim (if acquired)
    // and chain-dispatch forward. Runs after the catch block above has
    // already flipped a thrown error to 'failed', so 'failed' rows chain
    // forward exactly like 'verified'/'rolled_back' ones — a batch never
    // gets stuck just because one character's removal failed. The ONE case
    // that does NOT chain forward is package-claim contention, which
    // explicitly clears batchInfoForChain above before returning.
    if (packageClaimAcquired && packageIdForCleanup) {
      await supabase.rpc("release_package_adaptation_claim", { _pkg_id: packageIdForCleanup })
        .then(({ error }) => { if (error) console.error("release_package_adaptation_claim failed:", error); });
    }
    if (batchInfoForChain) {
      const { data: nextRow } = await supabase
        .from("mystery_adaptations")
        .select("id")
        .eq("batch_id", batchInfoForChain.batchId)
        .eq("status", "paid")
        .eq("batch_sequence", batchInfoForChain.batchSequence + 1)
        .maybeSingle();

      if (nextRow) {
        fireAndForget(fetch(`${SUPABASE_URL}/functions/v1/adapt-mystery-apply`, {
          method: "POST",
          headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ adaptation_id: nextRow.id }),
        }));
      } else {
        // No more rows in this batch to chain to — if every row in the
        // batch is now terminal, this is the one invocation that will ever
        // observe that (chain-dispatch's strict sequential guarantee), so
        // fire the completion email exactly once here.
        const { data: unfinished } = await supabase
          .from("mystery_adaptations")
          .select("id")
          .eq("batch_id", batchInfoForChain.batchId)
          .in("status", ["pending", "paid", "processing"]);
        if (!unfinished || unfinished.length === 0) {
          fireAndForget(fetch(`${SUPABASE_URL}/functions/v1/send-adaptation-complete-email`, {
            method: "POST",
            headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ batch_id: batchInfoForChain.batchId }),
          }));
        }
      }
    }
  }
});
