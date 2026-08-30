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
- **Not done:** no check for whether `package_completion_blocking_defects()` (the separate structural-defect check, unchanged by this ADR) has any similar blind spots — out of scope here, flagged as a reasonable future audit target given this ADR just found the sibling function had one.

## Key files

- `supabase/migrations/20260830_completion_gate_check_all_character_fields.sql` — this ADR's fix, deployed live
- `supabase/migrations/20260825_completion_trigger_revalidate_on_every_write.sql` — ADR-0108, the trigger-condition fix this builds on
- `docs/adr/0103-new-purchase-coherence-sweep-ritual.md` Addendum 6 — the incident this ADR traces back to

## Discussion

The most valuable step in this one was checking the corpus data before assuming a rule, twice. First assumption that would have shipped wrong: that `mystery_style` predicts which content shape (branching vs. single-script) a package uses — a direct query showed real overlap in both directions, which changed the check from "assume the model" to "accept either model." Second: Jonathan's question about whether `has_accomplice = false` packages should be flagged for null accomplice fields — the honest answer, checked rather than assumed, was that 11 of the original 31 flagged packages were exactly this false-positive shape. Both corrections happened before any code shipped, which is the point of testing the read-only query against real data before writing the migration, rather than writing the migration first and finding out from a flood of new `needs_review` packages after deploying.

The Grant/Gracie `rumors` gap found while verifying the fix is worth naming directly: a manual, spot-check-based sweep (reading a few characters' worth of snippets) missed something a systematic per-column check caught immediately. That's not a knock on the sweep methodology in general — it's the specific argument for why this class of gap belongs in an automated gate rather than depending on a human (or an agent) remembering to check every column by hand.
