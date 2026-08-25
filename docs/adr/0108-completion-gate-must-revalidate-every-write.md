# ADR-0108: `validate_package_characters()` must re-fire on every transition into `completed`, not just the first `generation_completed_at` write

- **Status:** Accepted — implemented and verified live 2026-08-25
- **Date:** 2026-08-25
- **Related:** ADR-0094 (built the row-count guard this ADR extends — and whose Discussion section explicitly considered and rejected the fix proposed here), ADR-0095 (bracketless `extracted_characters` parse fix — verified still working correctly, not the cause of this incident), ADR-0103 Addendum 2 (the sweep that surfaced this incident)

## Context

Jaclyn's 30-player, has-accomplice purchase ("Operation: Thirty & Murdery," package `b8428a57-1c2b-4bf1-881c-98c8436be6a9`) shipped as `generation_status.status = 'completed'` — and the "your mystery is ready" email fired — while genuinely missing one full character (Cypress/Celine Beaumont, no `mystery_characters` row at all). Found and fixed during a routine post-purchase sweep (ADR-0103 Addendum 2), not by any automated system.

This looked, at first, like ADR-0094/0095's row-count guard had a bug or a blind spot. It doesn't. Traced the actual mechanism:

- `package_expected_character_count(_pkg)` — tested directly against this package's live `extracted_characters` value (which *is* the ADR-0095 bracketless-comma-joined shape) — correctly returns `30`. The parser works.
- The two functions ADR-0094 guarded (`heal_completed_packages()`, `promote_complete_packages()`, run every 2 minutes via `pg_cron`) both correctly refuse to promote `needs_review -> completed` while actual count is short of expected. Checked `cron.job_run_details` for both jobs in the window around the package's actual completion write (`generation_completed_at = 2026-08-25 13:09:19.865`, `ready_email_sent_at = 13:09:19.909` — 44ms apart, same transaction): **neither cron job ran anywhere near that timestamp** (nearest runs 13:08:00 and 13:10:00). Neither guarded function did this write.
- Grepped every edge function in this repo for a `generation_status` write to `'completed'`: zero hits. Nothing in our own Deno code did this write either.
- The original alert (auto-generated, timestamped ~13:05) already shows the package correctly held at `needs_review` with `expectedCharacters: 30, actualCharacters: 28` — so `validate_package_characters()`'s trigger DID fire once, correctly, the first time `generation_completed_at` transitioned `NULL -> NOT NULL`, and correctly blocked completion. `notify-generation-issue` then fired 5 recovery webhooks (13:05:32-33) at the Make.com Child scenario for the missing/empty characters.

Putting this together: **something outside all three guarded functions — almost certainly Make.com's Child scenario blueprint itself, writing directly to `mystery_packages` as its own "batch finished" step once the recovery webhooks it was just sent complete — set `generation_status` to `completed` a second time**, roughly 4 minutes after the recovery webhooks were dispatched, with a character still completely missing. This write is invisible to `validate_package_characters()`'s trigger specifically because that trigger's firing condition is `OLD.generation_completed_at IS NOT NULL OR NEW.generation_completed_at IS NULL -> RETURN NEW (skip)` — a **one-shot gate**. Once `generation_completed_at` was set the first time (during the original, correctly-blocked completion attempt), the trigger permanently no-ops for that package for the rest of its lifetime, no matter how many more times `generation_status` gets written to `'completed'` afterward, by anything.

This is exactly the risk ADR-0094's own Discussion section named and consciously decided not to guard against: *"Broadening the trigger is more thorough in the abstract — it would catch a hypothetical future third path that also promotes to `completed` without going through either recovery function — but... the narrower blast radius of touching two known functions... won out over the marginal extra coverage of a hypothetical unknown third path."* That hypothetical path is no longer hypothetical — it happened, on a real paid order, four days after ADR-0094 shipped confident the two known paths were the only ones.

## Decision

**Change `validate_package_characters()`'s firing condition from "only the first `generation_completed_at` NULL -> NOT NULL transition" to "every transition of `generation_status->>'status'` into `'completed'`, from any source."** Same guard logic already inside the function (row-count check via `package_expected_character_count()`, plus the existing `package_completion_blocking_defects()` structural check) — only the trigger's *entry condition* changes, so this is a minimal, well-scoped diff against a function that's already correct once it fires.

```sql
-- Old entry guard (one-shot, tied to generation_completed_at's first write):
IF OLD.generation_completed_at IS NOT NULL OR NEW.generation_completed_at IS NULL THEN
  RETURN NEW;
END IF;

-- New entry guard (re-fires on every transition INTO 'completed', regardless
-- of how many times it happens or what set generation_completed_at):
IF NEW.generation_status->>'status' IS DISTINCT FROM 'completed'
   OR OLD.generation_status->>'status' = 'completed' THEN
  RETURN NEW;
END IF;
```

`OLD.generation_status->>'status' = 'completed'` in the skip condition specifically prevents infinite re-validation churn on a package that's *already* correctly completed and gets touched by something unrelated (e.g. a later field edit) — the guard only ever re-runs on an actual transition **into** `completed`, not on every subsequent write to an already-completed row.

**Client-side mirror check — proposed, then deliberately NOT built after reading the actual client code.** The original draft of this ADR proposed also adding a `characters.length` vs expected-count check in `MysteryView.tsx`'s reveal gate, as defense-in-depth. Reading the gate's own code before building it changed that: the comment directly above it (`src/pages/MysteryView.tsx` ~line 1276-1283) states outright that `'completed'` is treated as *"trusted-clean (ADR-0049/0053 gate guarantee)"* and reveals immediately, by design — the client deliberately does not re-derive or duplicate server-side completion validation, it trusts the guarantee the server-side gate makes. Adding a second, client-side copy of the same count-check logic would be exactly the "one concept, two predicates, in two files, updated one at a time" shape this codebase has been burned by multiple times before (ADR-0055/56/57) — the two copies would inevitably drift, and the fix for that drift is documented in this project's own accumulated experience as "delete the second predicate," not "keep both in sync by discipline." Skipped. The server-side fix above is sufficient on its own: a Postgres `BEFORE UPDATE` trigger fires on every `UPDATE` to the row regardless of which system performs it (Make.com, a cron, an edge function, raw SQL) — there is no code path left that reaches `'completed'` without passing through it, so there is no gap left for a client-side check to catch that the server-side one wouldn't already have caught first.

## Rationale

- **Fixes the actual proven mechanism, not a re-guess.** Verified, not assumed: the SQL-side guard works (tested live), the two known recovery paths didn't do this write (cron history), our own edge functions didn't do this write (grep). The only remaining explanation is a write path this repo doesn't control the source of — which is exactly the shape "guard the trigger, not the writer" is built to handle, since it doesn't require knowing or trusting which system performs the write.
- **Doesn't require touching or auditing Make.com's blueprint.** The alternative — finding and fixing the specific Make.com module that writes completion unconditionally — would also work, but requires a manual Make.com UI edit and import (this session has no Make.com API write access, consistent with every prior ADR that's hit this same constraint), and only closes *this specific* instance of the problem. A future Make.com blueprint change, or a completely different system, could reintroduce an equivalent unguarded write path; the Postgres-side fix closes the class of problem regardless of which external system does the writing.
- **Directly answers ADR-0094's own open question.** That ADR explicitly weighed this exact tradeoff and chose the narrower fix, reasoning the broader guard's extra coverage was "hypothetical." This incident is the concrete evidence the hypothetical was real, which is the correct trigger for revisiting a documented, deliberate prior tradeoff rather than just quietly overriding it.

## Alternatives Considered

- **Extend `heal_completed_packages()`/`promote_complete_packages()` again**, matching ADR-0094's original pattern. Rejected: neither function did this write (confirmed via cron history), so extending them again would do nothing for this incident — the bug isn't in either recovery path, it's in a write that goes around all of them.
- **Find and fix the Make.com blueprint module directly.** Real and worth doing eventually (see Consequences), but doesn't ship without a manual Make.com import, and doesn't protect against a different unguarded write path appearing later. Treated as a valuable complementary fix, not a substitute for the trigger-condition change.
- **A new async detector** (roster-mismatch-style, checking `completed` packages against `extracted_characters` on a schedule). Would have caught this eventually, but only after Jaclyn already had a "finished"-looking package with a hole in it — same reasoning ADR-0094 already used to reject this as the *primary* fix for this exact defect class. An existing detector of this shape may already partially cover this (worth confirming as a follow-up), but the trigger fix stops the bad state from ever being visible to begin with.

## Consequences

- **Positive:** any future write to `mystery_packages` that sets `generation_status` to `completed` — from Make.com, a cron, a manual fix, or a system not yet built — gets the same row-count/structural-defect validation the very first completion attempt gets. Closes the class of gap, not just this instance.
- **Implemented and verified live** (`supabase/migrations/20260825_completion_trigger_revalidate_on_every_write.sql`): deployed via `apply_migration`, confirmed the live function definition contains the new condition (`pg_get_functiondef`), and verified behavior with a fully isolated `BEGIN...ROLLBACK` test — inserted a throwaway test conversation/package/character (1 of 2 expected characters present), simulated a rogue direct write setting `generation_status = 'completed'`, confirmed the trigger correctly intercepted it and downgraded back to `needs_review` with `actualCharacters: 1, expectedCharacters: 2` — then rolled back, zero footprint on real data.
- **Client-side mirror check considered and deliberately not built** — see Decision above. The reveal gate's own existing comment documents "trust the server's completed guarantee" as the deliberate design; duplicating the check client-side would reintroduce the exact paired-predicate-drift shape this codebase has hit before. The now-broadened server-side trigger is comprehensive enough (fires on every `UPDATE`, from any caller) that there's no remaining gap for a client-side copy to catch.
- **Update (same day): the Make.com module performing the write is now confirmed and fixed at the source.** See [ADR-0109](0109-get-empty-characters-blind-to-missing-rows.md) — it's the live Parent scenario (`Parent60`, module 223), which calls `get_empty_characters()` directly over HTTP as its own completion gate. That function shared the identical "only sees existing rows" blind spot, patched there rather than requiring a Make.com blueprint edit. Both fixes are deployed; this ADR's trigger remains the safety net for anything ADR-0109's fix doesn't anticipate.
- **Update (same day): root-caused and fixed.** See [ADR-0103](0103-new-purchase-coherence-sweep-ritual.md) Addendum 3 — a genuine Claude output-formatting failure (clean `end_turn` stop with unclosed JSON, not truncation), fixed with a conservative recovery stage in `parse-claude-json`, deployed and verified live.

## Key files

- `supabase/migrations/20260825_completion_trigger_revalidate_on_every_write.sql` — this ADR's fix, deployed live
- `supabase/migrations/20260819_close_recovery_path_character_count_gap.sql` — ADR-0094, the guard this ADR's fix complements (not replaces)
- `supabase/migrations/20260820090645_fix_bracketless_extracted_characters_parse.sql` — ADR-0095, verified still working correctly against this incident's actual data
- `supabase/migrations/20260820092046_add_missing_round_content_blocking_defect.sql` — current live definition of `package_completion_blocking_defects()`, unchanged by this fix
- `src/pages/MysteryView.tsx` — reveal gate (`characters.length > 0` check, ~line 1284-1288) and its "trusted-clean" comment (~line 1276-1283) that informed the decision not to add a client-side mirror check
- `docs/adr/0103-new-purchase-coherence-sweep-ritual.md` Addendum 2 — the incident this ADR traces back to

## Discussion

The most useful thing about this investigation wasn't finding a new bug — it's that the *existing* guard (ADR-0094/0095) was tested directly against live data and confirmed correct, which ruled out the boring explanation (a parser regression) and forced tracing the actual write path instead of re-patching a function that already worked. The tell was the cron timing: `heal_completed_packages_2min` and `sweep_incomplete_packages_2min` run on a fixed 2-minute cadence, and the package's actual completion timestamp didn't line up with either — a `pg_cron.job_run_details` lookup settled in under a minute what could otherwise have been an extended guessing exercise about which function was "obviously" responsible.

The second useful thing is that ADR-0094's Discussion already did the hard thinking about this exact tradeoff, in advance, and left a clear written record of *why* it chose narrowly at the time. That made this ADR much faster to write and much easier to justify — it isn't overriding a past decision on a hunch, it's pointing at the specific documented condition ("a hypothetical future third path") that the past decision said would justify revisiting it, now satisfied with a real incident.
