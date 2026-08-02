# ADR-0058: Fire the `needs_review_at` trigger after the completion gate

- **Status:** Accepted
- **Date:** 2026-08-02
- **Related:** ADR-0049/0053 (the gate), ADR-0055

## Context

Found while watching a paid package heal after the ADR-0055 fix: it sat at `generation_status.status = 'needs_review'` with `needs_review_at = NULL`. Those two should never disagree — `_maintain_needs_review_at()` exists precisely to keep them in step.

Both are `BEFORE UPDATE ... FOR EACH ROW` triggers on `mystery_packages`, and **Postgres fires BEFORE row triggers in name order**:

```
trg_00_normalize_generation_status    -- '00_' prefix, deliberately first
trg_maintain_needs_review_at          -- 'm' ... ran BEFORE the gate
trg_validate_package_characters       -- 'v' ... the gate, sets 'needs_review'
```

So when the timestamp trigger read `NEW.generation_status->>'status'` it still saw the *caller's* value — typically `completed`, since the completing UPDATE is what fires the gate. Its `IF new_status = 'needs_review'` branch never matched. The gate then rewrote `NEW.generation_status` to `needs_review`, too late for a trigger that had already run. The timestamp was never written on the gate path.

Only the *set* path was affected. The *clear* path works because `heal_completed_packages()` writes `completed` directly, so whenever the timestamp trigger runs it correctly sees the transition away from `needs_review`.

Customer-visible effect: `MysteryView.tsx:1235` computes

```js
const ageMs = ts ? Date.now() - new Date(ts).getTime() : Infinity;
if (ageMs < NEEDS_REVIEW_SILENT_WINDOW_MS) return null;
```

A NULL timestamp is treated as *infinitely stale*, so the amber "we're finalizing" banner renders **immediately** rather than after the intended ~10-minute grace period. The silent-recovery window — whose whole purpose is to hide a warning while auto-recovery is still working — has never functioned for a gate-held package.

## Decision

Rename the trigger to `trg_zz_maintain_needs_review_at` so it sorts after `trg_validate_package_characters`. The function body is unchanged; only firing order moves.

The `WHEN (old.generation_status IS DISTINCT FROM new.generation_status)` clause is preserved. For BEFORE row triggers Postgres evaluates `WHEN` immediately before the function would run, against `NEW` as modified by earlier BEFORE triggers — so at the new position it sees the gate's `needs_review` and still short-circuits no-op status writes.

## Rationale

- **Matches the idiom the table already uses.** `trg_00_normalize_generation_status` is named with a `00_` prefix for exactly this reason. Encoding order in the name is already this schema's convention, so a `zz_` prefix is legible rather than novel.
- **Smallest change that fixes the cause.** The function is correct; only its position was wrong.
- **Keeps one writer of `needs_review_at`.** The alternative folds the assignment into the gate, giving two functions that write the column and reintroducing the multi-writer drift ADR-0049's single chokepoint exists to prevent.

## Alternatives Considered

- **Fold the timestamp assignment into `validate_package_characters()`.** Rejected: two writers of one column, and the gate is not the only path that sets `needs_review`, so the standalone trigger would have to stay anyway — leaving both.
- **Drop the `WHEN` clause and always run.** Unnecessary; `WHEN` is evaluated at the new position and behaves correctly.
- **Treat NULL as "fresh" in the frontend instead** (`ageMs = ts ? … : 0`). Rejected as papering over a DB invariant with a UI default — and it would suppress the banner forever for genuinely stuck packages, which is worse than showing it too early.

## Consequences

- Gate-held packages now carry a real `needs_review_at`, so the ~10-minute silent-recovery window works as designed and the banner appears only when a package is genuinely stuck.
- No backfill needed: at migration time zero packages were in `needs_review` (the only recent one had already been resolved).
- Historic rows that passed through `needs_review` before this fix never recorded a timestamp. They are all `completed` now, where the column is NULL anyway, so nothing is inconsistent.
- **Ordering is still implicit.** Renaming encodes it in a sort key, not an assertion. Postgres has no declarative "after trigger X" — the guard is the comment in the migration plus this ADR. A future trigger named after `trg_zz_` would silently take precedence.

## Key files

- `supabase/migrations/20260802_order_needs_review_at_trigger_after_gate.sql`
- `public._maintain_needs_review_at()` — unchanged
- `public.validate_package_characters()` — the gate
- `src/pages/MysteryView.tsx:1232-1260` — the banner and its silent window

## Discussion

This is the fourth instance in one day of the same underlying theme — two pieces of logic that must agree about one fact, coupled by something invisible. The previous three were paired regexes (ADR-0055/0056/0057); this one is coupled by *alphabetical trigger names*, which is worse, because nothing in either function hints that its correctness depends on the other's name.

It was tempting to bundle this into the ADR-0055 work since it was found there. Kept separate because the fix is in a different layer with a different failure mode, and because the choice between "rename" and "fold into the gate" is a real one worth recording on its own.

The honest limitation is in Consequences: renaming fixes today's order without making the dependency enforceable. The comment and this ADR are the only thing standing between a future `trg_zzz_something` and a silent repeat. A stronger version would assert the ordering in a test, which is not currently possible without a Postgres test harness in the repo.
