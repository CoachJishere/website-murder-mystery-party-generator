# ADR-0113: `validate_package_characters()`'s "empty character" check only looked at 2 of ~24 content fields

- **Status:** Accepted — implemented and verified live 2026-08-30
- **Date:** 2026-08-30
- **Related:** [ADR-0103](0103-new-purchase-coherence-sweep-ritual.md) Addendum 6 (the incident that surfaced this — Casa Ferrel's Grant/Gracie Whitfield missing `accusations`), [ADR-0108](0108-completion-gate-must-revalidate-every-write.md) (the trigger-condition fix this ADR builds on top of, not a replacement for)

## Context

Fixing one character's missing `accusations` field on the Casa Ferrel package (ADR-0103 Addendum 6) raised the obvious question: why didn't the completion gate catch this? Reading `validate_package_characters()` directly answered it — the "empty character" check is:

```sql
SELECT COUNT(*), COUNT(*) FILTER (WHERE description IS NULL OR character_role IS NULL)
INTO _actual_count, _empty_count
FROM mystery_characters
WHERE package_id = NEW.id;
```

Two columns, out of roughly 24 substantive content fields a delivered character actually needs (`introduction`, `background`, `secret`, `rumors`, `relationships`, `accusations`, plus the round2-4/final content in whichever of two shapes the package uses — see below). Any of the other 22 going null on one character out of N silently passes this gate and ships as `'completed'`.

**Corpus impact, checked before deciding scope:** a full sweep across every field found 31 packages with at least one character missing something a sibling character in the same package had. Of those, 11 turned out to be false positives — packages where `has_accomplice = false` and the only gap was in the accomplice-branch fields, which that package's gameplay never uses at all (Jonathan caught this distinction before any fix shipped — see Discussion). The real number is **20 packages, all paid**, dating back to 2025-08-14. Deliberately scoped this ADR to the gate fix only; the 20-package historical backfill is a separate, explicitly deferred follow-up (see Consequences) since it requires paid Claude API calls via `regenerate-child-content` and needs its own cost estimate and go-ahead.

**A second, real find during verification of the fix itself:** testing the new check against Casa Ferrel — already "fixed" per Addendum 6 — found it was *still* incomplete. Grant/Gracie Whitfield was also missing `rumors`, a gap the original manual sweep (spot-checking snippets, not every column) had missed entirely. This is itself evidence for why a systematic per-field check belongs in the gate rather than relying on manual review.

## Decision

Expand `validate_package_characters()`'s empty-character check from 2 columns to the full set of substantive content fields, with two deliberate nuances:

**1. Two legitimate content shapes per round, both accepted.** This schema supports two different models for `round{N}_*`/`final_*` content, and both are genuinely in live use — not cleanly predicted by `mystery_style` (checked directly: `character`-style packages are 34/825 single-script vs 752/825 branching; `detective`-style are 925/954 single-script vs 181/954 branching — real overlap in both directions):

- **Branching model**: `round{N}_innocent` / `round{N}_guilty` / `round{N}_accomplice` — used when any player could draw any slip.
- **Single-script model**: `round{N}_script` / `final_statement` — used when roles are fixed per character.

The check accepts *either* shape being complete for a given character/round rather than assuming one based on `mystery_style`. If a character shows evidence of the branching model (`round{N}_innocent IS NOT NULL`), it then requires the rest of that model's fields (`round{N}_guilty`, and `round{N}_accomplice` only when accomplice-gated — see next point).

**2. Accomplice-branch fields only required when `conversations.has_accomplice = true`.** Caught by Jonathan reviewing the corpus numbers before this shipped: a package that doesn't use the accomplice mechanic legitimately has all-null accomplice fields for every character, and that's correct, not a gap. The check joins to `conversations.has_accomplice` and only treats a null accomplice field as a defect when the branching model is active for that round *and* the package actually uses an accomplice.

```sql
OR (round2_innocent IS NOT NULL AND round2_guilty IS NULL)
OR (_has_accomplice AND round2_innocent IS NOT NULL AND round2_accomplice IS NULL)
-- ...same pattern for round3, round4, final
```

Everything else (`introduction`, `background`, `secret`, `rumors`, `relationships`, `accusations`) is a flat `IS NULL` check — verified these are broadly required across both styles (>=95% populated corpus-wide in each), not model-dependent.

## Rationale

- **Fixes the actual gate, not just the one incident.** Addendum 6 fixed one field on one package by hand. This fixes the gate that should have caught it — and every sibling gap like it — before completion, for every future package.
- **Verified against real data before deploying, not just reasoned about.** Tested the new WHERE clause directly (read-only) against: Casa Ferrel post-fix (correctly 0 empty after the rumors backfill below), two known-broken historical packages (correctly flagged), and a 40-package recent sample (36 clean / 4 flagged — a sane rate, not "flags everything" or "flags nothing," either of which would have indicated a logic bug). Only applied the migration after this passed.
- **Live trigger behavior verified with an isolated `BEGIN...ROLLBACK` test** (same practice as ADR-0108): inserted a throwaway 2-character package, one complete, one missing `rumors` only, simulated the completion write, confirmed the trigger correctly downgraded it to `needs_review` with `emptyCharacters: 1` naming exactly the right character — then rolled back, zero footprint on real data.
- **Accepting either content model, rather than picking one, avoids a false-positive wave.** Guessed wrong here initially (assumed `mystery_style` would predict the shape) — checking the actual corpus distribution before committing to that assumption caught it before it shipped as a bug that would have flagged ~180-750 legitimately-fine packages per style.

## Alternatives Considered

- **Pick one canonical content model and migrate old packages to match.** Rejected: much larger scope, no evidence either model is being deprecated, and would risk actually breaking currently-fine packages using the "wrong" model for their era.
- **New standalone detector instead of expanding the trigger.** Would only catch this after a package already shipped, same reasoning ADR-0108 already rejected for the analogous case — the trigger blocks the bad state from ever completing in the first place, which is strictly better when the check is cheap (it is: a single aggregate query over already-fetched rows, no new I/O).
- **Require accomplice fields unconditionally in the branching model.** Rejected after Jonathan's question mid-implementation — would have produced false positives on every non-accomplice branching-style package, which is 17 of the 31 packages the naive version of this check would have flagged.

## Consequences

- **Positive:** any future character content gap across ~24 substantive fields gets caught at completion time, for both content models, correctly accounting for whether accomplice content is expected. Closes the class of gap, not just the `accusations` instance.
- **Deployed and verified live**: `supabase/migrations/20260830_completion_gate_check_all_character_fields.sql`, applied via `apply_migration`, confirmed live function definition carries the new logic, verified via isolated rollback test.
- **Casa Ferrel's second gap (missing `rumors` on Grant/Gracie) backfilled** the same way as the `accusations` fix in Addendum 6 — matching sibling format/voice, grounded in real secrets of the three under-covered characters rumored about (Ren/Fiona MacAllister and Jules/Julia Chevalier had zero rumors about them anywhere in the package; Iris/Ivan Sinclair, an established rival, had one). Re-verified: the new gate logic now returns `empty_count = 0` for this package.
- **Explicitly deferred, not forgotten:** the 20-package historical backfill. This ADR stops the bleeding; it does not retroactively fix the 20 already-affected paid packages. That requires `regenerate-child-content` (real Anthropic spend) and its own scoped go-ahead per Jonathan's standing rule on paid API usage — tracked as a follow-up, not silently dropped.
- **Update (2026-08-30, same day): 5 of the 20 packages backfilled, $0 cost, all checked against prior ADR history first.** Jonathan asked to scope the backfill by age (≤~2-3 months automated, 3+ months manual/case-by-case) rather than treat all 20 uniformly. Checking each of the age-eligible candidates against existing CHANGELOG/ADR history before touching anything found 2 that weren't safe to blindly include: `Operation: Thirty & Murdery` is the exact ADR-0108 Cypress/Celine Beaumont case — already root-caused and *deliberately* left unbackfilled since her guilty branch is never dealt to a player in the package's current role assignment; re-touching it would silently redo a considered decision. `Death At The Birthday Bash` has a previously acknowledged customer-contact history (customer emailed, no reply) and needs that context checked before any new fix, not a blind rerun. Excluded both from this pass.

  **Update (same day, before starting the 13-package manual tier): found and fixed a real false-positive in this ADR's own check.** `character_role IS NULL` was inherited unconditionally from the original pre-ADR-0113 2-field check. Auditing the 13 manual-tier packages found `character_role` is 100% null for every package created before 2025-12, phasing out through Feb 2026 (ADR-0052's rollout), 0% null from March 2026 on — an era convention, not a per-character defect. Confirmed zero packages anywhere in the corpus have a *mix* of null/non-null `character_role` (always all-or-nothing per package), so fixed with the same partial-vs-uniform-null distinction already added to the ADR-0103 checklist: only flag `character_role` when null on some-but-not-all characters in a package that has already established the convention for its own siblings. Verified live with two isolated rollback tests — uniform-null-role package now correctly clean (`empty_chars: 0`), mixed-role package still correctly flags exactly the one character missing it (`empty_chars: 1`). Deployed via `supabase/migrations/20260830_completion_gate_character_role_era_fix.sql`.

  Of the remaining 5, every one turned out to affect exactly one character and 1-4 closely related fields (`accusations`+`rumors`, or the 4 accomplice-branch fields) — small enough to hand-write matching the sibling format/voice, the same zero-cost approach used for Grant/Gracie, rather than needing `regenerate-child-content` at all. Fixed: `Veneno En La Medianoche` (Spanish — accomplice branches for Aurelio Vanderbilt, grounded in his embezzlement secret and established relationships; ran the 3 scoped detectors on this package specifically before writing, given it's non-English), `Sunset Songs: The Stolen Spotlight` (Phoenix Rivers' `introduction` — a residual gap from the already-documented ADR-0086/0087 identity-field incident, not a new bug), `Death At The Velvet Viper` (Renée Boudreaux — `accusations` turned out to be identical boilerplate across every non-culprit character in this detective-style package, confirmed by checking two unrelated packages independently; `rumors` grounded in three under-covered castmates' actual secrets), `Death At The Lani Ohana Luau` (Riley/Reese Lani, same boilerplate `accusations` + grounded `rumors`), `Behind The Mask: Death At The Gilded Circle` (Maximilian/Maxine Rothschild — this package uses the branching model, so `accusations` needed the full "DEFLECTION TIPS" format, not boilerplate; grounded in his factory-conditions blackmail secret). All 5 re-verified `empty_count = 0` under this ADR's own check. Remaining 15 (the age-deferred manual tier, plus the 2 excluded-with-history cases) untouched.

- **Update (2026-08-30, continuing into the 13-package manual tier): the "small gap" assumption was wrong for most of them, corrected before writing anything.** Re-running the proper combined check (not a raw per-field scan) against all 13 found `Murder At The TLC Reunion` is fully clean — a false positive purely from the character_role era fix above plus its mixed content-model cast. Of the remaining 12, most are NOT narrow 1-4-field gaps: 6 packages (`the Harvest Of Lies`, `A Winter Harvest Of Lies`, `Blood In The Vines`, `Deadly Vintage`, `Trapped By The Storm` — all created the same day, 2025-12-02, and `Death At The Birthday Bash` [`74f91eb8...`, confirmed via package ID to be a *different* package than the already-documented Speakeasy Soirée case despite the near-identical title]) each have one or more **entirely blank characters** — every field null, not a narrow gap. This matches a known historical failure shape already fixed once before in this codebase (see `CHANGELOG.md`'s "White Lotus" entry: a character extracted correctly but lost when the Make.com child scenario call failed with no retry — recovered there by re-firing the existing recovery webhook directly, not hand-writing). The 5 same-day December packages are flagged as likely one shared incident, not 5 independent ones — not investigated further this pass.

  Only one of the 13 (`Future Cyber Punk - 15 Players`, Rebel Operative Theta) was genuinely small — 3 accomplice-response fields, existing `final_accomplice` already present. Fixed by hand, $0, matching the package's own (notably shorter, single-paragraph) accomplice-response format. Re-verified clean.

  **Two more findings surfaced, neither touched yet:**
  - `The Last Call At The Lucky Crown` isn't a content gap at all — 5 of its 64 `mystery_characters` rows are orphaned duplicates (e.g. "Ash/Ashley 'The Wire' Edison," empty, alongside a fully-complete "Ash Edison" row for the same character under a resolved name). This is a data-integrity question (which row to keep/delete), not a backfill.
  - `Death On The Dance Floor`, `Blood And Bouquet`, `The Dark Side Of Devops`, and `Blood In The Bougainvillea` have real, large gaps (6-17 of their characters affected each) — too large for zero-cost hand-writing, flagged for a cost estimate via `regenerate-child-content` or the same recovery-webhook approach as the blank-character packages above.

  Not done: root-causing the Dec 2025 batch incident, any fix to Lucky Crown's duplicates, any fix to the 4 large-gap packages. All flagged for Jonathan's direction on the right recovery mechanism (existing re-fire webhook vs. `regenerate-child-content` vs. manual) before spending anything.

- **Update (2026-08-30): closed, no further action.** Built a cost estimate for the remaining 10 content-gap packages (46 calls / ~$3.25-5.10 for the 6 blank-character packages, 41 calls / ~$3.40-5.25 for the 4 large partial-gap packages — grounded in two real per-call cost anchors from this codebase's own history: ~$0.15/call for a full identity-group regeneration per ADR-0086/0087's Sunset Songs recovery, ~$0.02-0.05/call for narrower single-group passes per ADR-0103 Addendum 5). Total ~$7-10, up to ~$13 with retry overhead.

  Jonathan's response, after seeing the dates laid out (130-333 days old — every one of these parties has almost certainly already happened): close all of it, no further investigation, no spend. At this age, real customer value from backfilling is close to zero regardless of what the cost estimate says — the point of a completion gate is to catch a gap before or shortly after delivery, not to retroactively perfect content for an event that's long over. This matches the same reasoning already applied to the Cypress case (ADR-0108) and the Speakeasy Birthday Bash case (ADR-0075/0098): a known, understood gap that isn't worth acting on, documented rather than silently dropped.

  **Final disposition of the full 31-package corpus finding from this ADR's original scope:** 5 packages backfilled same-day at $0 (see above), 1 more ($0, Future Cyber Punk) during the manual-tier pass, 11 excluded as false positives (non-accomplice packages flagged only on unused accomplice-branch fields) or resolved by the character_role fix, 2 already-decided historical cases left untouched (Cypress, Speakeasy Birthday Bash), and these final 10 (plus `The Last Call At The Lucky Crown`'s 5 orphaned duplicate rows, left in place — stale but harmless, not worth a data migration for content this old) closed here as accepted, unfixed history. No suppression table needed (unlike the Speakeasy Birthday Bash case's `acknowledged_health_alerts` row) since this ADR's check is a one-time completion-gate trigger, not a recurring poll — these packages simply won't be re-evaluated unless something else touches their `generation_status` again.

  **List, for the record (package title — created — days old at close):**
  - The Harvest Of Lies — 2025-12-02 — 271d — 1 blank character
  - Trapped By The Storm — 2025-12-02 — 271d — 2 blank characters
  - Blood In The Vines — 2025-12-02 — 271d — 1 blank character
  - Deadly Vintage — 2025-12-02 — 271d — 2 blank characters
  - A Winter Harvest Of Lies — 2025-12-02 — 271d — 3 blank characters
  - Death At The Birthday Bash (`74f91eb8...`) — 2026-01-12 — 230d — 1 blank character
  - The Last Call At The Lucky Crown — 2025-10-01 — 333d — 5 orphaned duplicate rows
  - The Dark Side Of DevOps — 2025-10-23 — 311d — 9 characters missing accomplice branches
  - Blood And Bouquet — 2025-11-27 — 276d — 9 characters missing accomplice branches
  - Blood In The Bougainvillea — 2026-03-26 — 157d — 6 characters missing `relationships`
  - Death On The Dance Floor — 2026-04-22 — 130d — 17 characters missing `relationships`

- **Not done:** no check for whether `package_completion_blocking_defects()` (the separate structural-defect check, unchanged by this ADR) has any similar blind spots — out of scope here, flagged as a reasonable future audit target given this ADR just found the sibling function had one.

## Key files

- `supabase/migrations/20260830_completion_gate_check_all_character_fields.sql` — this ADR's fix, deployed live
- `supabase/migrations/20260825_completion_trigger_revalidate_on_every_write.sql` — ADR-0108, the trigger-condition fix this builds on
- `docs/adr/0103-new-purchase-coherence-sweep-ritual.md` Addendum 6 — the incident this ADR traces back to

## Discussion

The most valuable step in this one was checking the corpus data before assuming a rule, twice. First assumption that would have shipped wrong: that `mystery_style` predicts which content shape (branching vs. single-script) a package uses — a direct query showed real overlap in both directions, which changed the check from "assume the model" to "accept either model." Second: Jonathan's question about whether `has_accomplice = false` packages should be flagged for null accomplice fields — the honest answer, checked rather than assumed, was that 11 of the original 31 flagged packages were exactly this false-positive shape. Both corrections happened before any code shipped, which is the point of testing the read-only query against real data before writing the migration, rather than writing the migration first and finding out from a flood of new `needs_review` packages after deploying.

The Grant/Gracie `rumors` gap found while verifying the fix is worth naming directly: a manual, spot-check-based sweep (reading a few characters' worth of snippets) missed something a systematic per-column check caught immediately. That's not a knock on the sweep methodology in general — it's the specific argument for why this class of gap belongs in an automated gate rather than depending on a human (or an agent) remembering to check every column by hand.
