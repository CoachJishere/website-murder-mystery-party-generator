# ADR-0055: Let the auto-remediation worker see gate-held packages

- **Status:** Accepted
- **Date:** 2026-08-02
- **Amends:** ADR-0053
- **Unblocks:** ADR-0054 (child-content regenerator, ADR-0051 layer 3)

## Context

ADR-0053 (shipped 2026-08-01, commit `b9bfcd1`) extended the pre-completion gate to five content-quality defect classes. A package failing one becomes `needs_review` and holds.

ADR-0053 justified including `self_directed_question` in the gate on an explicit carve-out — quoting its own "Interim behaviour" section:

> `self_directed_question` is fixed post-completion by the live ADR-0047 worker (deterministic retarget, no judgment required)

That premise was false as shipped, and the error was invisible because nothing exercised the path until the next real generation.

The ADR-0047 auto-remediation worker finds work by calling eight `list_packages_*()` detector RPCs. **Every one of them filtered on `(mp.generation_status->>'status') = 'completed'`.** The gate's own action — setting `needs_review` — therefore removed the package from the view of the worker that was supposed to heal it. A deadlock: the gate holds the package precisely so it can be fixed, and holding it is what prevents the fix.

Nothing else clears the flag either. `heal_completed_packages()` (pg_cron, every 2 min) *would* promote it back to `completed`, but only once `package_completion_blocking_defects()` returns clean — which requires the remediation that can never run. The worker itself never reads or writes `generation_status` at all (verified: zero occurrences in `supabase/functions/auto-remediate-packages/index.ts`).

Customer-visible consequence: `MysteryView.tsx:1265` renders the package tabs on `needs_review`, so the mystery is usable — but `MysteryView.tsx:1232-1260` shows an amber "we're finalizing" banner once `needs_review_at` is older than ~10 minutes. With the flag permanently stuck, that banner is permanent too.

### How it was found

Package `33671764-71f9-488a-bed7-9afc712b0051` ("The Case Of The Stolen Golden Flamingo", paid, conversation `a027af70-39b7-4e87-aa4e-8be295322447`) was regenerated on 2026-08-02 as a customer recovery. It completed at 07:44:45 UTC and the gate immediately flagged two genuine `self_directed_question` defects (Polly Paradise and Captain Kei each had a round-4 question directed at themselves).

The contradiction was direct and reproducible:

```sql
select public.package_completion_blocking_defects(p.*) from mystery_packages p
where p.id = '33671764-71f9-488a-bed7-9afc712b0051';
-- {"self_directed_question.Polly Paradise","self_directed_question.Captain Kei"}

select * from public.list_packages_with_self_directed_questions('2026-08-01T00:00:00Z');
-- (0 rows)
```

This was the first generation to run after ADR-0053 shipped, so it was also the first package that could possibly hit the deadlock.

## Decision

Widen the status predicate on all eight detector RPCs from `= 'completed'` to `IN ('completed', 'needs_review')` (`list_packages_with_structural_defects` normalises differently: `IN ('completed', 'complete', 'needs_review')`).

Applied to all eight, not just `list_packages_with_self_directed_questions`, because the defect is in the shared assumption rather than in one function. Any gate-held package is by definition one with a detected defect — it is the *most* deserving of detector attention, not the least.

The migration rewrites each function programmatically from `pg_get_functiondef()` with a string replacement on the predicate, so every body is preserved byte-for-byte apart from that predicate, and asserts it rewrote exactly 8 functions so a future reword fails the migration loudly instead of silently under-applying.

No change to the worker, the gate, or the crons. The rest of the chain already works:

1. gate sets `needs_review` (ADR-0053)
2. detector RPC now returns the package → worker retargets the self-directed questions deterministically (ADR-0047)
3. `heal_completed_packages()` sees `package_completion_blocking_defects()` clean → flips to `completed`; the banner's own `generationStatus?.status !== 'needs_review'` early-return then dismisses it

## Rationale

- **Fixes the class, not the instance.** All eight RPCs shared the identical assumption. Patching only the one that happened to fire would have left seven latent copies of the same deadlock for the four classes ADR-0053 says legitimately hold (`meta_text_leak`, `victim_mismatch`, `slip_culprit_leak`, `identity_conflict`) — those are exactly the packages a human needs the health check to *surface*, and the old filter hid them from that too.
- **Prerequisite for ADR-0051 layer 3.** ADR-0054 (child-content regenerator), which landed on `main` the same day this was found, does its multi-character auto-discovery by calling `list_packages_with_identity_conflicts`, `list_packages_with_slip_culprit_leak`, and `list_packages_with_meta_text_leak` *before* mutating — and names its natural call site as "wherever a package would otherwise be left in `needs_review`." With the old `= 'completed'` filter those lookups would have returned zero rows for precisely the packages layer 3 exists to repair, silently degrading a multi-character repair into a single-character one. Widening all eight is what makes layer 3's discovery step work when it is wired into the gate.
- **Smallest change that restores ADR-0053's stated design.** ADR-0053's carve-out reasoning is sound; only its factual premise was wrong. Making the premise true is preferable to reopening the decision about which classes gate.
- **Programmatic rewrite over hand-transcription.** These are large function bodies (`list_packages_with_structural_defects` alone is ~100 lines of CTEs). Retyping eight of them to change one predicate each is a far larger transcription-error surface than a targeted string replacement plus a count assertion.

## Alternatives Considered

- **Hand-edit the two offending round-4 questions on the customer's package.** Would have cleared the banner in minutes, but fixes one customer and leaves the deadlock for every future one. Also means hand-authoring customer-facing prose that the ADR-0047 worker already does deterministically.
- **Have the worker clear `needs_review` itself after a successful remediation.** Rejected: `heal_completed_packages()` already owns that transition and already re-checks the blocking-defects function. Adding a second writer of `generation_status` would recreate exactly the multi-writer drift ADR-0049 built the single chokepoint to avoid.
- **Remove `self_directed_question` from the gate, reverting that part of ADR-0053.** Rejected: the detector is accurate (both hits here were real), and shipping a known-detectable defect is the thing ADR-0051 exists to stop. The gate is right; its plumbing was wrong.
- **Widen only `list_packages_with_self_directed_questions`.** Rejected as above — minimal by line count, but leaves the shared bug in place.

## Consequences

- Gate-held packages are now visible to the auto-remediation worker and to the 6-hourly health check that shares these RPCs. Expect health-check counts to include `needs_review` packages that were previously invisible; this is the intended correction, not a regression.
- Classes with no auto-repair (`meta_text_leak`, `victim_mismatch`, `slip_culprit_leak`, `identity_conflict`) will now be *reported* while held, rather than silently invisible. They still require human repair or ADR-0054's child-content regenerator once it is wired into the gate.
- Slightly larger scan surface for each detector. Negligible: `needs_review` is a small, transient population by design.
- ADR-0053's "Interim behaviour" section is now accurate as written. No text change to ADR-0053; this ADR records the correction.
- **Follow-up not addressed here:** nothing tests that the gate's held states and the detectors' visible states stay in agreement. A future assertion — every status the gate can set is a status some detector can see — would prevent the next instance of this class.
- **Separate bug found while verifying this one, NOT fixed here:** `needs_review_at` is never populated on the gate path, so the banner's 10-minute "silent recovery window" does not work. Both are `BEFORE UPDATE` triggers on `mystery_packages`, and Postgres fires those in **name order**: `trg_maintain_needs_review_at` runs before `trg_validate_package_characters`, so when the timestamp trigger evaluates `NEW.generation_status->>'status'` it still sees the caller's value — the gate has not set `needs_review` yet. Observed directly on package `33671764-...`: `status = 'needs_review'` with `needs_review_at = NULL`. Because `MysteryView.tsx:1235` computes `ageMs = ts ? ... : Infinity`, a NULL timestamp makes the package look infinitely stale and the amber banner renders **immediately** rather than after the intended 10-minute grace period. Harmless for a package that heals promptly, but it defeats the exact UX softening the window was built for. Fix is likely a rename so the maintain trigger sorts after the gate (e.g. `trg_zz_maintain_needs_review_at`), or folding the timestamp assignment into `validate_package_characters()` itself; either deserves its own ADR and a disposable-row test of the ordering.

## Key files

- `supabase/migrations/20260802_widen_detector_rpcs_to_needs_review.sql` — this change
- `supabase/functions/auto-remediate-packages/index.ts` — ADR-0047 worker; `DETECTOR_RPC` map (~line 85), `self_directed_questions` handler (~line 695)
- `public.package_completion_blocking_defects()` — the gate's shared predicate (ADR-0049/0053)
- `public.validate_package_characters()` — trigger that sets `needs_review`
- `public.heal_completed_packages()` — pg_cron, every 2 min; promotes back to `completed`
- `src/pages/MysteryView.tsx:1232-1265` — stale-needs-review banner and tab-render condition
- `docs/adr/0053-extend-completion-gate-to-content-detectors.md` — the ADR this amends
- `docs/adr/0054-child-content-regenerator.md` — ADR-0051 layer 3; its detector-based auto-discovery depends on this widening

## Discussion

The tempting fix was the small one: hand-edit two lines of a paying customer's package and move on. It was rejected because the deadlock, not the two questions, was the actual defect — and the customer's package was simply the first thing to fall into it.

The more interesting question was whether to widen one RPC or all eight. The argument for one: minimal diff, and `self_directed_question` is the only class with an auto-repair, so the other seven would only change *reporting*, not healing. The argument for eight, which won: the reporting change is itself valuable — the four hold-only classes are precisely the ones needing a human, and the old filter made a gate-held package invisible to the health check that would tell a human it exists. A gate that hides its own casualties is worse than no gate.

Worth naming plainly: this bug was introduced by the immediately preceding commit and shipped with a written justification that was never executed. The ADR-0053 carve-out reads as a factual claim about live behaviour ("is fixed post-completion by the live ADR-0047 worker") but was in fact an inference from the worker's *existence*, not a check of whether it could reach a `needs_review` row. It is the same shape as the May 2026 filter/extractor regex mismatch: two predicates that must agree about the same concept, changed one at a time. The generalisable lesson is in the Consequences follow-up — when one component's output state feeds another's input filter, that agreement deserves an assertion, not prose.
