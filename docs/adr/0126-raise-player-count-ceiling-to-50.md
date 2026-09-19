# ADR-0126: Raise the hard player-count ceiling from 32 to 50

- **Status:** Accepted — implemented and verified live 2026-09-19
- **Date:** 2026-09-19
- **Related:** ADR-0103 (New-Purchase Coherence Sweep — this ADR was surfaced by that sweep), ADR-0125 (single-source roster extraction, the shared module this ADR adds a constant to), ADR-0069 + Addendum 1 (`player_count` drift/plausibility history)

## Context

A routine ADR-0103 sweep of a paid package ("Attendance For Dinner: A Hinwick House Mystery", conversation `3f98e184-f0a9-46aa-9064-04a04ee706db`) found `conversations.player_count = 32` for a package that actually generated, and correctly delivered, 38 named characters. The customer had started at 32 on the setup form, then explicitly negotiated the roster up to 35, then 37, then 38 during concept chat, locking in "38 players confirmed" before generating.

Tracing why `player_count` never updated to 38 surfaced three independently-drifted numbers already living in the codebase, plus one live failure and one likely-live one:

- **Database:** `conversations_player_count_check` hard-capped `player_count` at `4-32`.
- **Setup form** (`src/components/MysteryForm.tsx`): Zod schema validates and advertises `4-35`.
- **Marketing copy:** the verified customer-facing claim (per existing internal notes) is also "4-35".
- **`mystery-webhook-trigger`'s regex extraction** (`extractCharactersFromMessages`): rejected any approved-message roster over 35 as implausible, logging `Approved message parsed to 38 characters (need 4-35) — falling through to legacy scan`, which then also failed and only recovered via a Claude API fallback call.
- **`mystery-ai`'s own chat-side player-count detection:** a separate, previously-unnoticed inconsistency — the sentence-pattern regex used to recognize an explicitly-stated count in chat (`hasExplicitPlayerCount`, `playerCountMatch`) capped at 32 (`3[0-2]`), while the standalone-numeric-reply validity check a few lines below it correctly capped at 35. A customer typing "for 35 people" as a sentence would not have been recognized as providing an explicit count, even though the product's own advertised range is 4-35.

Confirmed via edge function logs (`function_logs`, 2026-09-19T02:35 UTC) that the sync mechanism added specifically to fix an earlier incident (the Fotini "Multiverse" roster-drift bug, `mystery-webhook-trigger/index.ts:805-827`) tried to do its job and was blocked by the DB constraint:

```
[PlayerCount] Drift detected: form=32, extracted=38. Syncing player_count → 38.
[PlayerCount] DB sync failed (proceeding with local value): new row for relation "conversations" violates check constraint "conversations_player_count_check"
```

The failure is only a `console.warn` — no alerting fires, so this can (and did) go unnoticed until a manual sweep found it. Generation itself was unaffected (it works from the approved chat message directly, not from `player_count`), so the customer received the correct 38-character package regardless — this is a data-integrity gap, not a content defect.

Separately, and more urgently: any *new* customer entering 33, 34, or 35 players on the initial setup form — a range the form itself validates as allowed — would have their `conversations` row insert (`MysteryCreation.tsx:167-188`) rejected by this same constraint, surfacing only as a generic "Error saving mystery" toast with no indication of why. This blocks mystery creation entirely for that range, discovered as a corollary of tracing the sweep finding, not independently reported.

## Decision

Raise the technical backend ceiling from 32 to 50, while leaving the customer-facing advertised range at 4-35 unchanged:

1. **`conversations_player_count_check`** widened to `4 <= player_count <= 50` (migration `20260919120000_raise_player_count_ceiling_to_50.sql`).
2. **New shared constant** `MAX_ROSTER_SIZE = 50` in `supabase/functions/_shared/rosterExtraction.ts`, alongside the existing `MIN_ROSTER_SIZE = 4`.
3. **`mystery-webhook-trigger/index.ts`** — both hardcoded `<= 35` roster-plausibility checks in `extractCharactersFromMessages` now use `MAX_ROSTER_SIZE`.
4. **`mystery-ai/index.ts`** — fixed the pre-existing 32-vs-35 internal inconsistency by extending the chat-side detection regexes from `3[0-2]` to `3[0-5]`, so explicit in-sentence player-count mentions are recognized across the full already-advertised 4-35 range. This is a correctness fix to match the existing customer-facing promise, not part of the new 50-ceiling — the chat's own guidance text ("the range is 4 to 35 players") and validity checks were already correctly bounded at 35 and are unchanged.
5. **`src/components/MysteryForm.tsx` — deliberately unchanged.** The setup form keeps advertising and validating 4-35. The 50 ceiling is a backend safety valve for customers who negotiate past the advertised range during concept chat (as this real customer did), not a new advertised maximum.
6. **Backfilled** `conversations.player_count` for the originating ticket from 32 to 38, now that the constraint permits it.

## Rationale

- **32 was never a deliberate hard limit** — it was the setup form's original default max before the form and marketing copy independently drifted to 35 without the DB constraint following. There is no product reason for the backend to be *stricter* than what the form already promises.
- **Flat pricing means an unbounded roster is a pure cost risk with no offsetting revenue** (packages are charged per mystery, not per character) — so some ceiling matters. 50 is a generous multiple of the largest real roster seen (38) while still bounding a hypothetical abusive 100+ person request.
- **The 35 customer-facing number stays put deliberately.** Widening the DB/extraction ceiling fixes the failure mode (chat-negotiated rosters above 35, or exactly-35 form submissions, silently breaking) without having to touch or re-verify marketing copy, translated UI strings across 13 locales, or customer expectations that already reference "up to 35."
- **Fixing `mystery-ai`'s 32-vs-35 detection gap is in scope because it's the same bug class** (a hardcoded number drifting out of sync with the actual advertised cap), directly adjacent to the code this ADR already touches, and cheap/deterministic to fix — consistent with this project's practice of fixing a discovered prompt/logic gap immediately rather than deferring it.

## Alternatives Considered

- **Lower the form and marketing cap to 32 to match the (old) DB constraint.** Rejected — per direct product input, 32 was only ever meant as a soft guide ("above 32 people it's a crazy mystery, too many people to run a party well"), not a hard wall, and the business has no problem with customers going over it. Tightening the form would actively break the customer experience this sweep exists to protect (a real, already-paid, correctly-delivered 38-person wedding mystery).
- **Match the DB ceiling exactly to the form's advertised 35.** Considered, but rejected as too tight a margin — it does nothing for the exact failure mode that triggered this ADR (a customer negotiating past 35 in chat, which is expected/allowed behavior, not an edge case) and would just move the same silent-failure wall from 32 to 35.
- **Remove the DB check constraint entirely (no hard cap).** Rejected — flat pricing means a runaway or abusive roster size (the "100-person mystery" scenario) is pure unrecovered generation cost. A generous-but-finite technical ceiling keeps a backstop against that without constraining realistic use.
- **Add a concept-chat guardrail that hard-stops roster negotiation at some number.** Not addressed by this ADR. Worth considering separately, but out of scope here — this ADR only fixes the inconsistent technical ceilings that caused a real, already-delivered package to silently fail its own bookkeeping sync, plus the adjacent form-insert failure mode. Whether the chat itself should ever refuse further roster growth is a product-UX decision, not a data-integrity one.

## Consequences

- **Positive:** Closes the specific silent-failure mode this sweep found (chat-negotiated roster > 32 breaking the `player_count` sync) and the adjacent, more severe, not-yet-directly-reported one (setup form accepting 33-35 that the DB then rejected outright).
- **Positive:** `mystery-ai`'s chat-side player-count detection is now internally consistent with its own advertised range and validity checks.
- **Positive:** No customer-facing copy, translation, or UI change required — the fix is entirely in backend/data-layer bounds.
- **Not addressed:** Whether concept-chat should hard-stop roster growth at some number (32, 35, or 50) rather than allowing indefinite negotiation up to the new technical ceiling. Left as an open product question; flagged in the originating vault note.
- **Not addressed:** Whether other paid conversations sitting at `player_count = 32` underwent the same silent chat-negotiation-past-cap-and-failed-sync pattern. Not checked beyond the originating ticket; would need a targeted query (`player_count = 32` cross-referenced against `mystery_characters` row counts) if this needs auditing.

## Key files

- `supabase/migrations/20260919120000_raise_player_count_ceiling_to_50.sql` — new, widens the DB constraint
- `supabase/functions/_shared/rosterExtraction.ts` — new `MAX_ROSTER_SIZE = 50` constant
- `supabase/functions/mystery-webhook-trigger/index.ts` — both roster-plausibility checks now use `MAX_ROSTER_SIZE`
- `supabase/functions/mystery-ai/index.ts` — chat-side player-count detection regexes extended from `3[0-2]` to `3[0-5]`
- `src/components/MysteryForm.tsx` — unchanged, intentionally

## Discussion

The core question was whether "32" meant anything load-bearing, or was just where a number happened to land at different times in three unrelated places. Direct product input resolved this cleanly: 32 was the original intended max, driven by both a cost concern (flat pricing against LLM spend that scales with cast size) and a genuine hosting-quality concern (above ~32 guests, the party format itself gets unwieldy to run well) — but it was always meant as guidance, not enforcement. The business has no objection to customers going over it; the DB constraint enforcing exactly 32 was an accident of drift, not a decision.

That reframes the fix: it's not "which of 32/35 is correct, pick one and align everything to it," it's "make the technical layers stop being *stricter* than the guidance layer." The form and marketing keep saying 35 (an already-shipped, already-translated, already-understood number) and the backend gets enough headroom above that to absorb real chat-negotiated growth without a customer's already-correct, already-paid-for package silently failing its own internal bookkeeping. 50 was chosen as a specific number (over "just remove the constraint") because flat pricing still makes an unbounded roster a real, one-sided cost risk — the constraint's job going forward is to catch a genuine outlier (a 100-person request), not to police normal large-wedding use.
