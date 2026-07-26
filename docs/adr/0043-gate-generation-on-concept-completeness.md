# 0043. Gate package generation on concept completeness (and never mark a 0-character package "completed")

**Status:** Accepted

**Date:** 2026-07-26

**Implementation (2026-07-26, deployed):** Layer 1 (entry gate) is live as `mystery-webhook-trigger` **edge-function v120** (`verify_jwt` preserved false). Layer 2 (completion invariant) ships in `api/generation-complete.js` + `MysteryView.tsx` + `getPackageGenerationStatus`, deployed via the push to main (site + `api/` pipeline). The completed-but-empty detector (migration `20260726…`) is applied to production and wired into `health-check.yml` as check 10. Layer 3 (Make `incomplete_context` abort) specced as guardrail G11; blueprint import deferred to the guardrails workstream.

## Context

A "Generation Display Issue" alert arrived 2026-07-26 for **"Victorian mansion - 32 Players"** (conversation `e49805d9-57f2-4469-89cc-325ce0490ff7`, package `fb1a6c0b-61a4-4a31-9d80-7c1ae145f822`, paid customer jenny.x.bean@gmail.com). The reported symptom: package `generation_status = completed / progress 100`, but **0 characters generated / 0 expected**.

Investigation showed this is **not** a Make.com or infrastructure failure — the pipeline ran. The failure is upstream: **generation was triggered before the mystery concept existed.**

The conversation transcript (all 07:42–07:45):
1. Customer: *"Victorian mansion, 32 players, both scripts, no accomplice."*
2. Assistant asked three questions (occasion, era, tone).
3. Customer: *"Late Victorian, mix"* — answered era + tone, not the occasion.
4. Assistant: *"One more question — what event brings all 32 guests to the mansion?"*
5. No reply. ~100 seconds later (07:45:44) the generation webhook fired anyway.

Confirming evidence in the data:
- `conversations.approved_concept_message_id` = **NULL** — no concept was ever approved.
- `master_context` Part 1 returned `"status": "incomplete_context"` with `missingCriticalInformation` explicitly naming victim, event, and character roster as *"NOT PROVIDED."*
- Despite that flag, the pipeline proceeded and produced **placeholder content** — evidence cards and a detective script referencing "Character A" through "Character E."
- `extracted_characters` is an **empty string** → **0 `mystery_characters` rows**. `host_guide`, `preparation_instructions`, `timeline`, `hosting_tips` all NULL; `game_overview`, `detective_script`, `evidence_cards`, `materials`, `master_context` (28.9k chars) populated with generic content.

The customer was not shown the junk: tab display requires `characters.length > 0` (MysteryView.tsx), so they saw the "We're Finalizing" card. The defect was therefore silent, not visible.

### The three gaps that let this happen

A code audit of the trigger and completion paths found no single bug — three missing guards compound:

1. **No concept/completeness gate before triggering.** The only hard precondition anywhere is `is_paid` (`supabase/functions/mystery-webhook-trigger/index.ts:318-326`, returns 402 for unpaid). The UI Generate button (`src/pages/MysteryView.tsx:1271`) and `generateCompletePackage` (`src/services/mysteryPackageService.ts:65`) guard only against a missing conversation and a duplicate in-progress/completed run. Nothing checks that a concept exists or that the conversation carries enough content.

2. **`approved_concept_message_id` is advisory, not a gate.** It is only used to *select which* message characters are extracted from; when NULL, `mystery-webhook-trigger` auto-snapshots the latest assistant "CHARACTER LIST" message (`index.ts:339`) and, failing that, falls back to the full conversation. Nothing blocks generation when no concept was ever produced.

3. **The `incomplete_context` Part-1 signal is ignored, and "completed" doesn't require characters.** No code in `src`, `supabase/functions`, or `api` reads the Part-1 / `master_context` status before proceeding. Completion is decided purely by a character-*count* comparison: `api/generation-complete.js:89` sets `allCharactersPresent = effectiveExpected === 0 || incomingCharacterCount >= effectiveExpected`. When the expected count collapses to 0 (extraction failed *and* `player_count` unknown), a **0-character package is marked `completed`**. The client completion path (`MysteryView.tsx` ~:428-442, :514) is equally permissive — it treats `expectedCount === 0` and JSON parse failures as `allCharactersGenerated = true`, and is what marked *this* 32-player package complete (server-side `effectiveExpected` was 30, so the server callback alone would have held it at `in_progress`).

## Decision

Defense in depth, mirroring the ADR-0016/0037/0041 prevention-plus-backstop pattern. Three layers, in priority order:

1. **Entry gate (primary — prevents the trigger).** Refuse to start generation when **no characters can be extracted** from the conversation. The characters come from the user's chat concept — `mystery-webhook-trigger` extracts them (multi-locale regex → Claude fallback → player-count cross-validation) and the parent scenario builds the package from them; zero extracted characters means the concept was never finished. Keying on the *full* extraction result (not a raw header-regex) means the gate is exactly as capable as the extractor, so it never false-refuses a real concept in an odd format or a non-English header. On refusal it writes `generation_status = needs_more_info` and returns `200 {success:false, reason:'needs_more_info'}` (a handled business outcome, not an HTTP error, so the client can message the user kindly) instead of POSTing to Make.com. Service/recovery callers (service-role bearer) bypass so an operator can force a regeneration during triage. The client (`generateCompletePackage`) surfaces this as a `needs_more_info` sentinel and the UI shows a "finish your concept in chat" toast.

2. **Completion invariant (backstop — in-repo, no Make dependency).** A package must never be marked `completed` / `has_complete_package = true` with zero real characters. Add `incomingCharacterCount > 0` to the `allCharactersPresent` condition in `api/generation-complete.js:89`, and remove the `expectedCount === 0 → true` / parse-failure-→-true short-circuits from the client completion path. Worst case becomes a visible "still generating / needs attention" state, never a silent "completed" full of placeholders.

3. **Honor `incomplete_context` upstream (Make.com blueprint — deferred to the guardrails workstream).** When Part 1 returns `status: "incomplete_context"`, the parent scenario should abort and write a `needs_more_info` status rather than generating placeholder content. This is a blueprint edit requiring a manual Make import (per the versioning/import-ledger discipline in ADR-0042), so it is specced here but tracked separately, not shipped with layers 1–2.

## Rationale

- **The entry gate is the real fix; the others are containment.** Layers 2 and 3 only change a silent bad outcome into a visible one — valuable, but the customer still wasted a click and a wait. Blocking the trigger when no concept exists is what actually prevents the incident.
- **Reuse the signal we already have.** The "CHARACTER LIST" assistant message is what extraction already keys on. Gating on its presence needs no new schema and no new concept of "done" — it is the de-facto concept-ready marker.
- **The completion invariant is free and in-repo.** It needs no Make import and no API spend, and closes the "0 characters but completed" class permanently regardless of how junk gets generated.
- **Don't auto-invent the concept.** Silently filling in a victim/occasion/roster to make generation succeed would hand a 32-guest host a package built on a premise they never chose. For large casts the cost of guessing wrong is too high; the correct recovery is to ask the customer the one missing question (see Consequences).

## Alternatives Considered

- **Auto-complete the concept and regenerate.** Rejected as the default: acceptable for a 6–8 player game where the AI invents everything anyway, but at 32 players an invented occasion likely mismatches the host's intent. Kept as a per-case manual option, not an automatic behavior.
- **Gate on `player_count` / message count only.** Too blunt — a thin-but-valid conversation could still carry a real concept, and a verbose one could still lack it. The "CHARACTER LIST message present" signal targets the actual precondition.
- **Make `approved_concept_message_id` a hard gate at the edge function.** Undermined by the existing auto-snapshot at `index.ts:339`, which sets it when NULL; the presence-of-concept check is more robust than the column.
- **LLM audit of concept completeness before triggering.** Rejected: per-generation metered-API spend, and the deterministic "CHARACTER LIST message" check covers the case for free.

## Consequences

- **Positive:** the "user hit Generate before the concept was ready" failure can no longer reach a paid customer as a silent "completed" package. A 0-character package can never again be marked complete anywhere.
- **Negative / watch:** the entry gate depends on the "CHARACTER LIST" message-format contract; if the chat flow's concept message format changes, the gate detection must move with it (see the paired-regex hazard in memory). The Make-side layer 3 remains a manual import and is not live until confirmed in the import ledger.
- **This customer:** recovered by asking the one missing question (the occasion) and regenerating once a concept exists — handled outside this ADR.
- **Follow-ups:** layers 1 and 2 to be implemented after sign-off (edge-function change requires a deploy — explicit approval per the no-unapproved-deploy rule); layer 3 tracked in the ADR-0042 guardrails/import-ledger workstream.

## Discussion

The debate was where to intervene. Three honest interception points exist: pre-trigger (client/edge), post-Part-1 (inside Make.com), and at completion (server callback + client). Post-Part-1 is the most semantically precise — the model itself has already diagnosed `incomplete_context` — but it lives in the Make blueprint, needs a manual import, and the placeholder content is already generated by then. The completion invariant is the cheapest and safest but only downgrades the symptom. The entry gate is the only layer that prevents the wasted generation entirely, and the signal it needs already exists in the conversation. Conclusion: ship the entry gate + completion invariant together in-repo (layers 1–2), and fold the `incomplete_context`-honoring change into the existing Make guardrails workstream (layer 3) rather than as a one-off blueprint edit, per the ADR-0042 import discipline.

## Key files

- `supabase/functions/mystery-webhook-trigger/index.ts` — trigger preconditions (only `is_paid` today); auto-snapshot at :339; where the entry gate (layer 1) would live.
- `src/pages/MysteryView.tsx` — Generate button (:1271), `handleGeneratePackage` (:289), permissive client completion path (~:428-442, :514).
- `src/services/mysteryPackageService.ts` — `generateCompletePackage` (:65), the only client-side preconditions.
- `api/generation-complete.js` — completion decision (:89); where the completion invariant (layer 2) would live.
- `supabase/functions/regenerate-parent-content/index.ts` — the only reader of `master_context` today (recovery tool, not the completion path).
