# ADR-0116: detect packages stuck at `in_progress` forever

- **Status:** Accepted — implemented and verified live 2026-08-30
- **Date:** 2026-08-30
- **Related:** ADR-0115 (the incident that found this gap), ADR-0065 (the self-heal grace period gate inside `notify-generation-issue` this sweep relies on)

## Context

ADR-0115's incident (Staša's stuck order) surfaced a gap independent of that ADR's actual root cause: **nothing in this codebase watches for a package stuck at `generation_status = 'in_progress'` with `generation_completed_at` never set.** Checked all four existing healing jobs — `sweep_incomplete_packages()`, `promote_complete_packages()`, `auto-remediate-packages`, `sweep_stuck_needs_review_packages()` — every one of them requires `generation_status->>'status'` to already be `'completed'` or `'needs_review'` before it does anything. A package that starts generating and then genuinely stalls mid-run never reaches either of those states, so it's invisible to all four.

ADR-0115's fix closes the *specific* race that caused today's stall, but a package can still stall in-progress for other reasons a fixed race doesn't touch: a Make.com scenario failure with no corresponding write, an Anthropic content-filter block on a step nothing currently retries, a platform outage mid-run. Asked directly whether this was worth building a detector for (rather than deciding unilaterally, since it's a new piece of monitoring surface, not a bug fix): yes, given the alternative is the same failure mode ADR-0115 started from — a customer emailing to ask where their order is, hours or days later, being the only signal.

## Decision

**Alert-only, not auto-retry.** A new sweep, `sweep_stuck_in_progress_packages()`, runs every 10 minutes (`sweep-stuck-in-progress-packages` cron) and re-invokes the existing `notify-generation-issue` edge function for every paid, non-test package that's been sitting at `in_progress` with no write (`updated_at`) in the last 45 minutes, created within the last 30 days.

Reuses `notify-generation-issue` rather than building a new alert path: read through its actual gating logic before assuming this was safe (it's built around empty/missing-character detection, so it wasn't obvious it would fire for a package with no character problems at all). Its `readyToAlert` defaults to `true` and its suppression gates are narrowly scoped to specific recovery-in-progress cases (`workerMightFixThis` requires `structuralDefects` to be present; `emptyCharacterRecoveryLooksClean` requires actual recovery targets) — neither applies to a package that's just gone silent with no flagged defects at all. It already composes and sends a real email by default, and already has its own 6-hour cooldown (`last_notified_at`), so this sweep's SQL filter is deliberately coarse — same shape as `sweep_stuck_needs_review_packages()` — find candidates, always re-invoke, let the function's existing gates decide whether to actually send.

**Verified read-only against real data before deploying:** the WHERE clause matched zero packages both in the last 30 days and all-time (every historical stuck-in-progress case has always eventually resolved out of that status, none sitting there today) — a clean baseline, not a guess.

## Rationale

- **Reuse over new infrastructure.** `notify-generation-issue` already has the Resend send, the cooldown, the conversation/package lookups. Building a second alert function for a conceptually adjacent problem ("something's wrong with this package's generation") would duplicate all of that for no real benefit.
- **Alert-only is the safer default given what today's diagnosis actually took.** Finding ADR-0115's real cause required pulling the actual Make.com execution payload, not just DB state — something no cron can do. An auto-retry cron risks quietly repeating the same failed (billable) run forever, or worse, masking a problem that needs a human to actually look at Make's own logs.
- **`is_paid`/`is_test` filtering, unlike the `needs_review` sibling.** That sibling deliberately doesn't filter on `is_paid` (its own migration explains why — the synchronous trigger that first calls `notify-generation-issue` has no such filter either, so restricting the sweep would create a re-check gap for unpaid packages). This sweep's situation is different: an `in_progress` row only exists at all behind `mystery-webhook-trigger`'s payment gate (paid conversation or service-role call) — and service-role calls include exactly the kind of internal test/debug run this incident's own multi-hour investigation looked like from the outside. Alerting on those would be noise, not signal.
- **45-minute threshold, keyed on `updated_at` not `generation_started_at`.** Generous margin above the ~10-20 minute normal run (per ADR-0106 Addendum 2's own timing data: Child executions 135-160s each, up to ~239s observed). Using `updated_at` means a package still making real, if slow, progress is never falsely flagged — only genuine silence trips it.

## Alternatives Considered

- **Auto-retry (re-invoke `mystery-webhook-trigger` as a service call) instead of alert-only.** Rejected for now: would need its own safety rails (attempt cap, some way to distinguish "safe to blindly retry" from "needs a human to look first") that don't exist yet, and today's incident is a concrete example of a stall that a blind retry would *not* have fixed on its own — the Make blueprint itself needed a real code/config change first. Could be revisited once there's more data on what fraction of stalls this alert actually catches and what a human ends up doing about them.
- **Build a new, dedicated alert function instead of reusing `notify-generation-issue`.** Rejected after confirming (by reading the actual gating code, not assuming) that the existing function's default behavior already fits this case without modification — a new function would duplicate its email/cooldown scaffolding for no benefit.
- **No filter on `is_paid`/`is_test`, matching the sibling sweep exactly.** Rejected — the sibling's reasoning (avoid a re-check gap for unpaid packages that already got a first synchronous call) doesn't apply here, since nothing else ever calls `notify-generation-issue` for a merely-stuck `in_progress` package in the first place; there's no existing unfiltered call this sweep needs to stay consistent with.

## Consequences

- **Positive:** a package that stalls mid-generation for any reason now gets a real alert within roughly 45-55 minutes (threshold + up to one 10-minute sweep cycle), instead of only being noticed when a customer asks or someone happens to look.
- **Positive:** zero new infrastructure — reuses `notify-generation-issue`'s existing send/cooldown machinery entirely.
- **Neutral:** still alert-only. If this fires often enough that manually retriggering becomes routine, auto-remediation (with its own cap/audit trail, mirroring `auto-remediate-packages`) would be a natural follow-up ADR, not built here.
- **Not done:** no dry-run/testing of the actual alert firing end-to-end (nothing currently matches the WHERE clause, so there was nothing live to fire it against without artificially stalling a real package). Structurally verified only: function created, cron registered and active, WHERE clause checked read-only against real data first.

## Key files

- `supabase/migrations/20260830_sweep_stuck_in_progress_packages.sql` — this ADR's implementation
- `supabase/migrations/20260805_sweep_stuck_needs_review_packages.sql` — the sibling pattern this follows
- `supabase/functions/notify-generation-issue/index.ts` — the alert function this sweep re-invokes, unmodified
