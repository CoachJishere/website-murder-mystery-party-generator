# ADR-0062: Tighten the full remediation sweep from 4 hours to 30 minutes

- **Status:** Accepted
- **Date:** 2026-08-04
- **Builds on:** ADR-0047 (auto-remediation worker, established the 4-hour cadence), ADR-0061 (added a 5-min held-only sweep for 3 delegatable classes; explicitly considered and rejected tightening the full 4-hour job)

## Context

While investigating a stuck-looking customer package (conversation `fa00a3c8-f97e-4a6b-b5c5-60cf6936910f`, "Birthday Betrayal In Hot Springs", customer angela.bone@unt.edu), the root cause turned out to be routine: a `self_directed_question` defect (a suspect scripted to interrogate himself) that the existing `auto-remediate-packages` worker already knows how to fix for free and deterministically — it just hadn't had its turn yet, because `self_directed_questions` is only swept by the 4-hour full-window job (`43 */4 * * *`), not the 5-minute held-only job ADR-0061 added (which is scoped to `identity_contamination`, `slip_culprit_leak`, `template_artifact` only). The fix was applied manually by invoking the worker ahead of schedule; see CHANGELOG for that incident.

That raised the standing question: is a 4-hour worst-case wait for *any* auto-fixable defect too long, given the owner would prefer paid packages resolve to a clean state quickly after purchase?

ADR-0061 already considered and rejected tightening this exact job, reasoning (its Alternatives Considered #2): tightening the full 4-hour job to 5 minutes for all six classes "would 48x the frequency of the paid classes (`missing_images`, `game_overview_victim_mismatch`) ... just more spend-cap pressure and more log volume." That reasoning implicitly assumed enough purchase volume for spend-cap pressure to be a real concern. Actual volume is 1–3 purchases/day (confirmed directly by the owner) — at that volume the $5/day cap (`DAILY_SPEND_CAP_USD`, `auto-remediate-packages/index.ts:85`) is nowhere close to being pressured by a tighter cadence; the paid classes cost $0.01–$0.04 per fix, and there are at most a handful of new packages to check per day regardless of how often the sweep runs.

## Decision

**Change the existing `auto-remediate-packages` cron job's schedule from `43 */4 * * *` to `13,43 * * * *`** (every 30 minutes, on the hour and half-hour offset by 13 minutes) — same job (`cron.schedule` with an existing job name updates it in place, confirmed via `SELECT jobid FROM cron.job WHERE jobname = 'auto-remediate-packages'` before and after), same scope (all six defect classes, all statuses within the 30-day detector window), same job body otherwise. No new cron job, no new edge function, no new secrets, no code change to `index.ts`.

Chosen 30 minutes rather than re-litigating ADR-0061's rejected 5-minute option: 30 minutes is an 8x tightening (4h → 30min), not the 48x ADR-0061 rejected, so it stays well clear of that alternative's stated objection even if purchase volume grows somewhat before this cadence is revisited — while still cutting worst-case customer-facing latency for every auto-fixable defect class from 4 hours to 30 minutes.

**Offset:** kept `:43` (the original, already-vetted 26-minute clearance from the 6-hourly health check's `:17` slot — see ADR-0047/the original migration's cadence comment) and added a second run at `:13` (4 minutes *before* `:17`). Both offsets are comfortably outside the worker's observed execution time (1.2–11.4s across the run history checked in `edge-function` logs), so the "worker is never mid-write while the health check reads state for alerting" property ADR-0047 established is preserved.

**Concurrency claim (ADR-0061's `remediation_claimed_at` mechanism) is unaffected.** That claim exists to serialize the three classes reachable from *both* schedules (this 4-hour-now-30-minute job and the 5-minute held-only job) and uses an atomic `UPDATE ... WHERE` — correct at any cadence, not just the one it was built under. Its 10-minute TTL was chosen to stay "below the 4-hour full-sweep cadence" (ADR-0061, Decision 4); 10 minutes is still below the new 30-minute cadence, so the TTL's headroom assumption still holds and needs no change.

## Rationale

- **The premise that changed is volume, not architecture.** ADR-0061's objection to tightening this job was entirely about spend-cap pressure from 48x'ing the paid classes' frequency. At 1–3 purchases/day that pressure doesn't materialize — there's rarely more than one or two new defects a day to find regardless of poll frequency, so a tighter cadence just means finding them sooner, not spending more.
- **Reuses the exact mechanism, no new surface.** Same job, same function, same classes, same claim/cap machinery — a schedule-string edit is the smallest change that delivers the latency win, consistent with ADR-0061's own preference for "smallest change consistent with an already-validated pattern."
- **Makes a previously-considered narrower fix unnecessary.** Before this change, the plan on the table was to add `self_directed_questions` to the 5-minute held-only job's class list, to get that one free/deterministic class fixed faster without touching the paid-class cadence. Tightening the full sweep to 30 minutes covers `self_directed_questions` (and every other class) without that separate change.

## Alternatives Considered

1. **Trigger the sweep 30 minutes after purchase, event-driven, instead of/alongside a periodic cadence.** Rejected: the defect doesn't exist until generation actually *completes*, and completion time after purchase isn't fixed (Make.com child scenarios can take anywhere from minutes to much longer) — a fixed post-purchase timer either fires before generation is done (nothing to check yet) or, for a slow generation, doesn't actually close the gap being targeted. It would also require new infrastructure pg_cron doesn't provide natively (one-off delayed jobs, self-cleaning), versus a one-line schedule-string edit to a job that already exists and already covers every generation path (including admin-triggered regenerations, not just purchases).
2. **Add only `self_directed_questions` to the existing 5-minute held-only job, leave the 4-hour job untouched.** Considered first (previous turn of this investigation). Rejected in favor of the broader fix once volume made the full-sweep tightening safe: it would have solved this one class but left every other auto-fixable class (e.g. `game_overview_victim_mismatch`, `missing_images`) still waiting up to 4 hours, for no remaining reason once the spend-cap objection no longer applies at this volume.
3. **Tighten to 5 minutes, matching ADR-0061's already-rejected option.** Not revisited as the default — see Decision above. Available as a future step if 30 minutes still feels slow in practice and volume remains low, but not adopted now: no observed need yet, and staying at 30 minutes keeps a wider margin from the spend-cap concern ADR-0061 raised, in case volume grows.

## Consequences

- Worst-case time-to-fix for any of the worker's six defect classes drops from 4 hours to 30 minutes; `self_directed_questions` (this investigation's trigger case) is included, no separate change to the 5-minute job needed.
- Daily invocation count for `auto-remediate-packages` goes from 6/day to 48/day. At current volume this has no measured cost impact (self-directed-question and single-line template-artifact fixes are free; paid fixes are $0.01–$0.04 each and rare) — worth re-checking if purchase volume grows materially, since the underlying spend-cap-pressure mechanism ADR-0061 named is still real, just not currently triggered.
- No change to the 5-minute held-only job, its class scope, or the concurrency claim mechanism — all unchanged and still correct under the new cadence per the TTL headroom check above.
- If purchase volume later grows enough that the spend cap starts being exhausted earlier in the day under this cadence (legitimate paid fixes escalating to human review instead of auto-fixing, until UTC midnight reset), that's the signal to revisit — either loosen the cadence back toward 4 hours, or raise `DAILY_SPEND_CAP_USD` deliberately rather than as a side effect of this change.

## Key files

- `supabase/migrations/20260804_tighten_remediation_sweep_cadence.sql` — this change: re-`cron.schedule`'s the existing `auto-remediate-packages` job with the new `13,43 * * * *` schedule.
- `supabase/functions/auto-remediate-packages/index.ts` — unchanged; this ADR is a scheduling-only change to the same code path ADR-0047/ADR-0061 already shipped.
- `docs/adr/0047-closed-loop-auto-remediation.md` — original 4-hour cadence and its collision-avoidance offset rationale, extended (not replaced) here.
- `docs/adr/0061-wire-child-content-regenerator-into-closed-loop.md` — the ADR whose Alternatives Considered #2 this decision revisits under new volume information; its 5-minute job and claim mechanism are otherwise untouched.

## Discussion

The main judgment call was whether revisiting ADR-0061's rejection counts as overriding a past decision or as the decision aging out on its own stated terms. It's the latter: ADR-0061 didn't reject tightening the cadence on principle — it named a specific, checkable cost ("48x the paid classes ... more spend-cap pressure") as the reason. That cost is a function of purchase volume, which wasn't fixed at design time and has since been confirmed low (1–3/day) directly by the owner. Re-deriving the same alternative under the current, known volume and finding the objection doesn't hold is exactly the kind of reasoning ADR-0061's own text invites ("worth re-checking if purchase volume grows") — just in the other direction.

The second call was 30 minutes versus just taking ADR-0061's already-specified 5-minute number now that the cap objection is gone. 30 was chosen deliberately over 5: there's no evidence 5 minutes is needed (30 minutes already turns a 4-hour worst case into a same-half-hour fix, which is the actual goal), and staying short of the previously-rejected number leaves headroom if volume grows before this gets revisited again, rather than immediately re-creating the exact condition ADR-0061 flagged as risky.
