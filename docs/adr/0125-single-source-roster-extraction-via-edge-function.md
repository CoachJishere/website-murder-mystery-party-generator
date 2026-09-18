# ADR-0125: Consolidate roster extraction into one shared implementation, called by both the preview page and generation

- **Status:** Accepted — implemented and verified live 2026-09-18
- **Date:** 2026-09-18
- **Related:** ADR-0057 (single source of truth for "what message proposes a cast" — this ADR extends that principle from "one function" to "one function, actually shared across runtimes"), ADR-0110 + Addenda 1-2 (the three incidents this ADR is closing out), ADR-0055/56/57 (prior paired-predicate-drift history on unrelated code)

## Context

`src/pages/MysteryPurchase.tsx` (the pre-purchase preview page) and `supabase/functions/mystery-webhook-trigger/index.ts` (the actual package generator) each maintain their own, independently-written implementation of "parse a character roster out of freeform AI chat text." They've never shared code — the client file's own comments already flag this as a deliberate-by-convention, not deliberate-by-design, choice.

This has now produced three distinct customer-visible incidents on the same file pairing:

1. **ADR-0044 addendum (2026-08-31):** the header-agnostic fallback in both parsers false-matched a 4-line theme-suggestion example as a complete cast.
2. **ADR-0110 + Addendum 1 (2026-08-25):** the client parser's message-selection logic (coupling character extraction to a co-located Premise header) picked a stale truncated message the server-side logic would not have picked, even after the server-side fix for the same underlying continuation-splitting bug shipped.
3. **ADR-0110 Addendum 2 (2026-09-18):** the client parser's batch-flush threshold dropped small family/friend/staff sub-groups that the server-side header-path extraction handled correctly, because the two implementations diverged on how they treat a bare bold sub-group label line.

In each case the fix was applied to whichever implementation was broken, verified against real customer data, and shipped — the immediate customer impact is resolved every time. But the underlying condition that produces these incidents (two hand-maintained parsers that must independently reach the same conclusion on the same input) is untouched, and Addendum 1 explicitly flagged consolidation as the real fix, deferred twice now for scope reasons.

The asymmetry matters: in incidents 2 and 3, the SERVER-side extraction (the one that actually determines what a paying customer receives) was correct both times. The CLIENT-side preview was wrong both times. The preview page is a pure liability from a correctness standpoint — it has never once caught a case the server got wrong, and has twice diverged in a way that alarmed or confused a customer who had not yet even reached checkout.

## Decision

1. **Extract the existing, correct server-side logic into a shared module**, `supabase/functions/_shared/rosterExtraction.ts` — `extractRosterFromMessage`, `findLatestConceptMessage`, `mergeRosterContinuations`, `firstCharacterNumber`, `isPlausibleRosterCount`, `isPlausibleRosterCandidate`, `rosterOverlapFraction`, `extractStatedRosterCount`, `isPlaceholderCharacterName`, plus the backing regexes/constants (`CHARACTER_LIST_HEADERS`, `sectionHeaderRegex`, `sectionHeaderCountRegex`, `characterLineRegex`, `boldCharRegex`, `MIN_ROSTER_SIZE`, `ExtractedCharacter`). This directory already exists and already holds cross-function shared code (`conversation-excerpt.ts`, `email-i18n.ts` — ADR-0097), so this is an established pattern, not a new one.
2. **`mystery-webhook-trigger/index.ts` imports from the shared module** instead of defining these locally. No behavior change — this step alone just removes one of the two duplicate copies that already existed *within* the server side of things, and makes the shared module the only place this logic can live.
3. **New edge function `extract-concept-roster`** — takes `{ conversationId }`, authenticates the caller (service-role client + `supabaseAdmin.auth.getUser(token)`, same pattern as `generate-chatbot-token`), fetches the conversation + messages, confirms `conversation.user_id === user.id` (this function has no payment gate to lean on — the conversation may be unpaid — so ownership is the only check), and returns `{ characters, sourceMessageId, playerCount }` using the same shared-module functions.
4. **`MysteryPurchase.tsx` deletes its own roster parser entirely** — `parseCharacters`, `scanForRoster`, `scanWholeMessageForRoster`, `mergeRosterContinuations`, `firstCharacterNumber`, `isPlausibleRosterSize`, `isGroupHeaderLine` all go away — and calls `extract-concept-roster` via `supabase.functions.invoke(...)` instead, populating `parsedDetails.characters` from the response.

Premise/overview/evidence extraction (`extractPremise`, `extractGameOverview`, `parseEvidence`) are **out of scope** and stay client-side, unchanged — they've never been the source of an incident, and folding them in would be scope creep against a problem that doesn't exist yet.

## Rationale

- **Closes the actual recurring cause, not just each incident's symptom.** After this change there is exactly one implementation of "parse a roster from chat text" in the codebase. A future bug in it is still possible, but it can no longer *diverge* between what the preview shows and what generation produces — the two failure modes that have hit customers twice now become structurally impossible.
- **The correct implementation already exists.** This isn't "build a better parser" — the server-side logic has been right both times the client-side logic was wrong. Reusing it is lower-risk than trying to independently re-verify a rewritten client parser against the same corpus of edge cases the server-side one has already been hardened against (family groupings, continuation splits, placeholder brackets, non-English headers, theme-suggestion false positives).
- **Matches this codebase's own established principle.** ADR-0057 already rejected "two predicates that are supposed to agree" for a related reason (`approved_concept_message_id` selection vs. extraction). This is the same fix, applied to the client/server boundary instead of two functions in the same file.
- **`_shared/` is proven, not speculative.** ADR-0097 already established this exact pattern for sharing logic across edge functions.

## Alternatives Considered

- **Keep patching each side as its own shape of bug surfaces (status quo).** Rejected — this is the third incident, and Addendum 1 already predicted a third occurrence would be the trigger to revisit. Continuing costs a support ticket and an investigation each time, for a problem with a known structural fix.
- **Rewrite the client-side parser to be more careful, without consolidating.** Rejected — this creates a fourth independent implementation (the current client one gets replaced by a *better* independent one) that can still drift from the server in some future way neither implementation has hit yet. Doesn't address the root cause.
- **Move roster extraction into a shared package published to both runtimes via a build step (e.g., npm workspace consumed by both Vite and Deno).** More "properly" architected, but this codebase has no existing multi-package/monorepo tooling, and `_shared/` already solves the actual problem (one file, one truth) without introducing build tooling this project doesn't otherwise need. Rejected as over-engineering relative to the actual requirement.
- **Have the client fetch messages and call a *shared TypeScript module* directly (no new edge function), bundled into the Vite build from a path outside `supabase/functions/`.** Would still require the file to be import-safe in both a Deno edge runtime and a Vite/browser bundle (no `Deno.*` calls, no server-only imports) and duplicates zero network calls — genuinely tempting for latency. Rejected for now because it puts the extraction logic in the browser bundle, downloadable and inspectable by anyone, and because the codebase's own established pattern for "logic used by an edge function" is `supabase/functions/_shared/`, not `src/lib/`. Revisit if the extra network round-trip proves to be a real UX problem in practice.

## Consequences

- **Positive:** Eliminates the specific recurring bug class (client/server roster-parser drift) that has caused three customer-visible incidents. Preview page character count is now provably identical to what generation will produce, because it's produced by the same function call, not a parallel guess.
- **Positive:** Net code reduction — ~180 lines of duplicated regex/batching logic deleted from `MysteryPurchase.tsx`.
- **Negative:** Preview page now makes a network round-trip (edge function call) instead of a synchronous client-side computation. Needs a loading state; `MysteryPreviewCard` already tolerates `parsedDetails.characters` being empty (renders the existing amber "no characters" notice), so this is a UI *state* change (briefly empty → populated) rather than a new UI *path*.
- **Negative:** One more edge function to deploy/monitor, and the preview page now has an external-call failure mode it didn't have before (network error, cold start, etc.) — mitigated by not treating a failed call as "zero characters exist," but as a distinct error state (see Discussion).
- **Not addressed:** Premise/overview/evidence extraction remains a second, client-only implementation with no server-side equivalent to drift against — no incident has ever implicated it, so left alone. Revisit only if that changes.

## Key files

- `supabase/functions/_shared/rosterExtraction.ts` — new, the single source of truth
- `supabase/functions/mystery-webhook-trigger/index.ts` — updated to import from the shared module instead of defining locally
- `supabase/functions/extract-concept-roster/index.ts` — new edge function backing the preview page
- `supabase/config.toml` — new `[functions.extract-concept-roster]` entry
- `src/pages/MysteryPurchase.tsx` — deletes its own parser, calls the new edge function

## Discussion

The interesting question this ADR had to settle was less "should we consolidate" (Addendum 1 already answered that) and more "which side wins, and how does the loser fail." Server-side wins because it's the one with the actual track record of being correct, and because it's the one the money depends on — the preview page has always been a nice-to-have confidence check, never the thing that determines what a customer receives. Given that framing, the preview page failing open (silently rendering whatever's easiest) was actually part of how it caused confusion — Laetitia von Daniels saw a *specific, wrong, confidently-rendered* count rather than an indication that something couldn't be verified yet. The new design should fail *visibly* instead: if `extract-concept-roster` errors, the UI should say the preview couldn't be loaded (with an "it's still safe to generate" note, since the actual roster extraction that matters happens at generation time regardless of preview state), not quietly show an empty or partial list as if it were complete.

Deliberately did not add a payment gate to the new function — unlike `mystery-webhook-trigger`, this function costs no LLM spend and triggers no generation, only a Supabase read + regex pass, so the only thing worth gating is *whose* conversation can be read, which the ownership check (`conversation.user_id === user.id`) already covers.

## Implementation notes (2026-09-18)

Shipped same-day as drafted. Two things surfaced during implementation worth recording:

**A third duplicate turned up.** `extractCharactersFromMessages` (the function `mystery-webhook-trigger` actually calls at generation time) turned out to have its own ~150-line inline "Primary header-scan, then Secondary batch-scan" re-implementation, layered ON TOP of `findLatestConceptMessage`/`extractRosterFromMessage` rather than calling them. This was pure redundancy — `findLatestConceptMessage` only ever returns a message for which `extractRosterFromMessage` already returned a plausible roster, so re-deriving that roster by hand a second time could only reproduce it (or, since this copy's batch-scan carried the exact unpatched small-sub-group bug ADR-0110 Addendum 2 just fixed, occasionally reproduce it wrong). Replaced with a direct call to `extractRosterFromMessage(latestMessageWithList.content)`. This wasn't in the original Decision text because it was invisible from the outside — only found by actually reading the consumer function while wiring up the import, which is itself a small case for why "the correct implementation already exists, just import it" beats "rewrite carefully": the act of consolidating surfaced a bug that reading each implementation in isolation hadn't.

**The error-state UX got implemented as designed.** Added `charactersLoadError` (all 13 locales) so a failed `extract-concept-roster` call shows "we couldn't load your preview, but it's safe to generate" instead of silently falling into the pre-existing "we couldn't detect your character list, go check your concept" warning — which would have been actively misleading for a network/edge-function failure that has nothing to do with the concept itself.

**One self-inflicted bug caught before deploy, not after.** Copying `characterLineRegex`'s Unicode character-class ranges (originally written as hex code-point escapes, one per accented-Latin/Cyrillic/CJK/Hangul range) into the new shared file went through a Read/Write round-trip that silently decoded those escapes into their literal Unicode characters — including U+3000, the ideographic space, which is invisible in a normal editor view and would have been a landmine for the next person to open this file. Caught by ESLint's irregular-whitespace rule before deploying, not by manual inspection. Restored to the original code-point-escape form, re-verified the regex still matches non-Latin names (French/Japanese/Korean) correctly. Worth remembering next time this pattern (relocating a regex with embedded Unicode code-point escapes) comes up — the same silent-decode risk turned out to apply to writing ABOUT it in prose too, not just to code: this very paragraph hit it twice while being drafted, forcing a rewrite that avoids typing the escape sequence literally at all.

Verification before deploy: `conceptSnapshot.test.mjs`'s 20 regression checks pass; `detect-roster-mismatches.mjs`/`detect-truncated-concept-messages.mjs` run clean against live data through the new import path; re-ran extraction against Laetitia von Daniels's real conversation and confirmed 20/20 via the actual `extractCharactersFromMessages` code path (both with and without an `approvedMessageId`). Both edge functions deployed via Supabase CLI and confirmed `ACTIVE` via the management API; `extract-concept-roster`'s auth gate smoke-tested directly against the live endpoint (missing header → 401, bogus token → 401, CORS preflight → 200).
