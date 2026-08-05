# ADR-0065: Gate the generation-issue alert email on the self-heal loop's outcome

- **Status:** Accepted
- **Date:** 2026-08-05
- **Builds on:** ADR-0003 (generation monitoring), ADR-0047 (auto-remediation worker), ADR-0053 (completion gate content detectors), ADR-0056 (defect-class naming mismatch precedent), ADR-0061 (concurrency claim, delegated repairs), ADR-0062 (30-min full-sweep cadence)

## Context

Investigating package `52feef06-1b26-4d76-bfd6-769707b492db` (conversation `19013ed7-091b-4593-9c8d-0bf7ae797d68`, "The Masque Of Shadows", paid): the owner got a "🚨 Generation Issue" alert email at `01:37:01` UTC, one second after the package hit `needs_review` for a `self_directed_questions` defect. The defect self-healed for free at `01:43:02` — six minutes later, the first tick of ADR-0062's new 30-minute sweep. By the time the owner read the email, the problem was already gone.

Traced `notify-generation-issue`'s trigger mechanism: it's called **synchronously**, inside the same `validate_package_characters()` trigger transaction that sets `needs_review`, with **no age gate** — only a 6-hour anti-*repeat* cooldown (`last_notified_at`), which does nothing to stop the *first* send. It predates the self-healing worker (ADR-0047/0061/0062) entirely; it has no concept that a fix might already be in flight. Its own inline "Auto-Recovery" block (re-firing Make.com webhooks for empty characters) is a separate, unconditional action, unaffected by anything below.

The owner asked for a recommendation, not immediate action, between two shapes:
- **A timer**: wait some fixed grace period before alerting.
- **Tied to the worker's own outcome**: alert only once the self-heal loop has actually given up.

## Decision

**A hybrid, evaluated entirely inside `notify-generation-issue` (single source of truth) — not inside the remediation worker:**

```
readyToAlert =
  NOT workerMightFixThis(structuralDefects)          -- nothing the worker can do; alert now
  OR hasEscalatedOrFailed(package, since=needs_review_at)   -- worker already gave up; alert now
  OR age(needs_review_at) > 35 minutes                      -- fallback: one sweep cycle + buffer
```

`workerMightFixThis` checks whether **every** entry in `generation_status.structuralDefects` starts with one of the worker's recognized prefixes (`meta_text_leak`, `self_directed_question`, `victim_mismatch`, `identity_conflict`, `slip_culprit_leak`). If any defect is a class the worker has no handler for at all (`error_body_in_package`, `error_body_in_character`, `invalid_role`, `victim_is_playable_character` — confirmed via full-text search of `auto-remediate-packages/index.ts`: zero references to any of these four), the grace period is skipped entirely and the email fires immediately, exactly as before this change.

**The escalation check deliberately does NOT match on defect-class name.** It checks for *any* `auto_remediation_log` row with `outcome IN ('escalated','failed')` for the package, logged after `needs_review_at` — regardless of which class. This codebase has been bitten repeatedly by defect-class labels drifting between the DB-side detector (`structuralDefects` prefixes) and the worker's own naming (ADR-0056: `self_directed_question` vs `self_directed_questions`; confirmed here also `identity_conflict` vs `identity_contamination`). Rather than add a third hand-maintained mapping, the check is coarsened to "did the worker give up on *anything* for this package," which needs no class-name mapping at all and can't drift.

**New pg_cron sweep, every 10 minutes** (`sweep_stuck_needs_review_packages()`, mirroring `sweep_incomplete_packages()`'s existing loop-and-`http_post` shape): re-invokes `notify-generation-issue` for every package still `generation_status->>'status' = 'needs_review'`. This exists because the *only* other caller — the completion trigger — fires exactly once, synchronously, at the instant `needs_review_at` is set to "now," so the grace-period gate can never pass on that first call. Without a re-check, anything past the grace window would never actually alert. `sweep_incomplete_packages()` (the existing 2-min sweep) explicitly excludes `needs_review` rows — it targets a different failure mode (completed-but-crashed packages) — so it can't be reused.

The sweep's SQL filter is deliberately coarse (status + a 30-day rolling window, matching this codebase's existing convention for detector RPCs) and **not** filtered on `is_paid` — the completion trigger that makes the original call has no such filter either, and restricting the sweep would silently and permanently strand unpaid packages classified as worker-fixable (suppressed on the first age-zero call, then never re-checked). All of the actual send/suppress logic stays in the edge function; the sweep's only job is "did anything change, worth asking again."

## Rationale

- **Correctness over speed for the "nothing to wait for" case.** A pure timer (Option A) would blindly wait 35 minutes even for defect classes with zero chance of auto-fix. Checking `workerMightFixThis` first means those alert exactly as fast as they did before this change.
- **No new risk to the remediation worker.** The alternative (Option B) — having the worker itself call `notify-generation-issue` on escalation — means auditing every escalation code path across a system with 6+ ADRs of carefully-tuned behavior (attempt caps, concurrency claims, spend caps, delegation) to make sure none silently skip the hook. It's also not actually faster in practice: the attempt cap is 2, so a class doesn't reach `escalated` until the *second* failed attempt — with the 30-min job that's ~60 minutes minimum, no better than the 35-minute timer chosen here.
- **The coarse escalation check is a deliberate simplification, not a shortcut.** Matching on defect class would be more "precise" on paper but reintroduces exactly the fragile-pairing failure mode this codebase's own retrospectives (ADR-0056, and the informal "paired-predicate drift" pattern from prior incidents) warn against. "Did the worker give up on anything for this package" is coarser but can't drift, because there's nothing to keep in sync.
- **Single source of truth for the decision.** All gating logic lives in one function (`notify-generation-issue`), read fresh on every invocation. The SQL sweep doesn't try to approximate the gate — it just asks again. This avoids a second copy of the age/escalation logic living in SQL and the TS function separately, which is its own drift risk.

## Alternatives Considered

1. **Pure timer (35 min), no worker-awareness.** Rejected as insufficiently precise — see Rationale. Still the fallback layer of the chosen design, just not the whole design.
2. **Worker calls the email itself on escalation.** Rejected — see Rationale. Bigger blast radius (touches the core remediation worker), no clear latency win over the timer given the 2-attempt cap.
3. **Exact defect-class mapping between `structuralDefects` prefixes and `auto_remediation_log.defect_class` values, instead of a coarse "any escalation" check.** Considered and rejected during implementation, after enumerating the actual mapping (`self_directed_question`→`self_directed_questions`, `identity_conflict`→`identity_contamination`, `victim_mismatch`→`game_overview_victim_mismatch`, `slip_culprit_leak`→`slip_culprit_leak`, `meta_text_leak`→`meta_text_leak`/`template_artifact` split by scope) and recognizing it as a fourth instance of a bug pattern this codebase keeps re-encountering. The coarse check loses only theoretical precision in the rare case of a package with *multiple simultaneous* defects where one class escalates and a different class is still mid-attempt — an edge case not worth a fragile mapping to optimize.
4. **Filter the new sweep to `is_paid = true` packages**, matching `sweep_incomplete_packages()`'s own filter. Rejected after checking `validate_package_characters()`'s actual scope — it has no such filter, so matching the sweep to it (not to a different function's convention) was the correct call. Caught and fixed during implementation verification.

## Consequences

- The alert email is suppressed for up to 35 minutes (or less, on worker escalation) when the defect is a class the self-heal loop can plausibly fix — the "Masque Of Shadows" case would no longer have generated a false alarm.
- Defect classes with no worker handler still alert exactly as fast as before — no regression for genuinely-needs-a-human cases.
- Unpaid conversations that hit `needs_review` are still covered by the new sweep, matching the original trigger's scope exactly (see Alternative 4).
- New cron job (`sweep-stuck-needs-review-packages`, every 10 min) and one new function (`sweep_stuck_needs_review_packages()`), mirroring an existing pattern (`sweep_incomplete_packages()`) rather than inventing a new one. No new edge function, no new secrets, no change to the remediation worker.
- **Found and fixed in passing:** a leftover disposable test row (`362d2b74-...`, "ADR-0061 claim test 2 (disposable)", conversation_id with no matching `conversations` row) was sitting in `needs_review` from the 2026-08-02 verification session and would have been picked up by the very first run of the new sweep, firing a spurious "Unknown"-customer email. Deleted before the sweep's first 10-minute tick; no related `mystery_characters` or `auto_remediation_log` rows existed for it.
- **Not addressed here, named as a pre-existing gap:** the `needs_review_at` NULL-on-some-paths bug ADR-0055's Consequences section flagged is still live (confirmed on the same orphaned row above — `needs_review_at` was NULL despite `status: needs_review`). This gate's design already tolerates it safely (the grace-period branch only runs `if (workerMightFixThis && pkg?.needs_review_at)` — a NULL timestamp just means "fail open, alert immediately," never "wait forever") but the underlying NULL bug itself remains unfixed.

## Key files

- `supabase/functions/notify-generation-issue/index.ts` — the gate: `WORKER_RECOGNIZED_PREFIXES`, `GRACE_PERIOD_MS`, `workerMightFixThis`, the escalation-log check, and the `readyToAlert` wiring into the existing cooldown branch.
- `supabase/migrations/20260805_sweep_stuck_needs_review_packages.sql` — `sweep_stuck_needs_review_packages()` and its 10-minute `cron.schedule`.
- `docs/adr/0056-align-retargeter-with-self-directed-question-detector.md` — the earlier instance of the class-naming mismatch this ADR's Decision explicitly designs around rather than re-solves.
- `docs/adr/0062-tighten-full-remediation-sweep-to-30-minutes.md` — sets the 30-minute cadence the 35-minute grace period is calibrated against.

## Discussion

The most consequential call was choosing the hybrid over either pure option, and then choosing the *coarse* form of the "worker gave up" signal rather than the precise one. Precision was available — the exact class-name mapping was fully enumerated before deciding against it — so this wasn't a case of settling for less because the precise version was too hard. It was rejected because the precise version's only advantage (slightly better behavior in a rare multi-defect-class edge case) came with a cost this codebase has paid for before: a second place where two related strings must be kept in sync by hand, with no mechanism to catch drift except a future incident. The coarse check is strictly worse at nothing that currently matters and structurally immune to a failure mode that has already happened here more than once.

The second judgment call surfaced only during verification, not during design: querying the live `needs_review` state before finalizing the sweep's WHERE clause turned up both the `is_paid` scope mismatch (Alternative 4) and the orphaned disposable test row that the new sweep would have fired on within minutes of being enabled. Neither would have been caught by reasoning about the code in isolation — both needed a live check against actual current data. Given this system alerts a human by design, shipping it without that check risked the exact kind of noise this ADR exists to reduce, on its very first run.
