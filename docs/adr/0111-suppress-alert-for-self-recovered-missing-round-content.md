# 0111: Suppress the generation-issue alert when missing_round_content self-recovers cleanly

## Status
Accepted

## Date
2026-08-27

## Context

During the sweep of the "Smells Like Murder: A Grunge Era Conspiracy" package (conversation `43af40e9-6e16-45ff-9eac-ef012f44c97f`), Jonathan received the `notify-generation-issue` alert email for two characters (Marcus Silva, Michael 'Cali' DeWitt) that came back with entirely empty round content — the ADR-0096 `missing_round_content` defect class. By the time the sweep ran (minutes later), both characters had fully self-healed via the same function's own auto-recovery re-fire: all round scripts, final statements, and questions were populated, and `generation_status` showed `completed` with no defects.

Jonathan asked whether the alert was actually necessary given it fixed itself. Tracing the suppression logic in `notify-generation-issue/index.ts` showed a real gap, not just noise tolerance:

- The function has an existing "recovery looks clean" suppression (`emptyCharacterRecoveryLooksClean`, added 2026-08-13/14 per ADR-0085) meant to skip the email when the auto-recovery it just fired is the only issue and nothing was skipped or capped.
- That suppression required `structuralDefects.length === 0` (`structuralDefects` being `generation_status.structuralDefects`, written by the DB completion-gate trigger).
- But `missing_round_content` (ADR-0096) is *itself* one of the defect classes the DB trigger writes into `structuralDefects` — and it's also independently re-detected by this function's own `emptyCharacters` check (`missingRoundContent()` feeds both).
- Net effect: whenever `missing_round_content` was the trigger, `structuralDefects` was never empty, so `emptyCharacterRecoveryLooksClean` could never be true for this defect class — the alert fired immediately every time, regardless of whether the just-launched re-fire was about to resolve it cleanly (as it did here).

This is the same "two signals for one underlying defect, not reconciled" shape flagged before in this codebase (paired-predicate drift, ADR-0055/56/57): the DB-side `structuralDefects` list and this function's own `emptyCharacters` re-detection both cover `missing_round_content`, but the suppression gate treated `structuralDefects` as if it only ever meant "something else, unrelated, is also wrong."

## Decision

Exclude `missing_round_content.*`-prefixed entries from the "something else is wrong" check before evaluating `emptyCharacterRecoveryLooksClean`. Any *other* structural defect (`meta_text_leak`, `victim_mismatch`, `identity_conflict`, `slip_culprit_leak`, `self_directed_question`) still forces an immediate alert — only the defect class this function's own recovery loop just attempted is excluded from blocking suppression.

```ts
const structuralDefectsNotSelfRecovered = structuralDefects.filter(
  (d) => !d.startsWith("missing_round_content.")
);
const emptyCharacterRecoveryLooksClean =
  recoveryTargets.length > 0 &&
  structuralDefectsNotSelfRecovered.length === 0 &&
  skipped.length === 0 &&
  capped.length === 0;
```

## Rationale

- The email's own recovery-attempted section already told the reader "allow ~3 minutes, then re-check" — the function was designed to expect its own recovery might resolve things before a human looks. The suppression gate should honor that design intent for this defect class the same way it already does for the plain empty/missing-character-row cases.
- No other structural defect class collides with `emptyCharacters`' own detection the way `missing_round_content` does, so this fix is narrowly scoped to the one confirmed overlap rather than a blanket "ignore structuralDefects" change.
- If recovery is skipped or capped (no description available, attempt cap hit, daily spend cap hit), the alert still fires immediately — those are still genuine "you need to look at this" signals.

## Alternatives Considered

- **Remove `missing_round_content` from the DB trigger's `structuralDefects` entirely, since this function re-detects it anyway.** Rejected: the DB-side detector is also what `package_completion_blocking_defects()` and the completion gate itself rely on; removing it there would require re-threading a replacement signal through code paths this incident didn't touch, for no benefit this fix doesn't already capture.
- **Give `missing_round_content` the same 35-minute grace-period treatment as `WORKER_RECOGNIZED_PREFIXES`.** Rejected: that grace period exists for defect classes a *different* async worker (`auto-remediate-packages`) might fix on its own schedule. `missing_round_content` recovery is fired synchronously by this same function call — there's nothing to wait 35 minutes for; the existing ~3-minute recovery window is the right timescale.

## Consequences

- If the re-fire this function just launched fails to actually resolve the character(s) (still empty on the next sweep cycle), the alert now arrives roughly one sweep-interval later than before, not on the same cycle that first detected the defect. Given recovery is fire-and-forget and takes ~3 minutes, this lag is judged acceptable — a follow-up alert still fires once the next cycle confirms it's still broken.
- Reduces one recurring source of "it fixed itself" noise in the support inbox for a defect class (ADR-0096) that already self-heals successfully most of the time.

## Key files
- `supabase/functions/notify-generation-issue/index.ts` (the `emptyCharacterRecoveryLooksClean` gate)

## Discussion

The trigger for this ADR was Jonathan asking, in plain terms, "do I really need to be getting this email if it fixed itself?" after the sweep confirmed the package was fully healthy. Tracing the suppression code showed the answer was "not by design" — the existing suppression was written with `missing_round_content` in mind (it's literally one of the two defect classes the surrounding comment block discusses at length) but didn't account for that defect class also appearing in the DB-side `structuralDefects` array it was gating on. Scoped the fix narrowly to the one confirmed collision rather than reworking the two-gate (`workerMightFixThis` / `emptyCharacterRecoveryLooksClean`) structure, since no other defect class exhibits the same overlap today.

## Links
- Deployed: `notify-generation-issue` v27 (`verify_jwt: true` preserved)
- Related: ADR-0096 (missing_round_content detection), ADR-0085 (empty-character recovery grace period correction), ADR-0103 (sweep ritual that surfaced this)

## Addendum 1 (2026-09-27): the quiet-period gate's own clock can get reset by an unrelated auto-fix landing on the same package, adding one extra sweep-interval of delay

Surfaced while testing an unrelated fix (ADR-0103 Addendum 59) on a fresh purchase ("Ghost In The Uplink," package `4f9babf8-c691-4987-b2bf-850e92f6522d`) that had two genuinely missing-content defects: `missing_role_branch_content` on one character and `missing_round_content` on two others. Jonathan asked why the second defect class hadn't self-healed yet, ~15 minutes after generation completed.

**Traced the full timeline via `function_logs` and `cron.job_run_details`:**
- `19:29:16` — generation completes; package enters `needs_review` with both defect classes present.
- `19:30:03` — `sweep_stuck_needs_review_packages()` (job 11, every 10 min) fires `notify-generation-issue`, which skips via the quiet-period gate this ADR added: "character write 11260ms ago, still likely mid-generation" (450s quiet window for a 12-character `scriptType=both` package). Correct behavior — generation had *just* finished.
- `19:30:20` — a *separate* mechanism, the 5-minute held-only `auto-remediate-packages` sweep (job 9, which *does* cover `missing_role_branch_content`, unlike `missing_round_content` — see below), attempts a fix and hits an unrelated transient statement timeout (logged separately, ADR-0103 Addendum 59).
- `19:35:32` — the held-only sweep's retry succeeds: `missing_role_branch_content` on "Six" (`reveal_confession_guilty`) auto-fixes for $0.10. This is a **write to `mystery_characters`**.
- `19:40:05` — `sweep_stuck_needs_review_packages()` fires `notify-generation-issue` again; it skips *again*, this time citing "character write 277391ms ago" (~4.6 min) — measuring from the **19:35:32 auto-fix write**, not the original generation. The quiet-period gate's "time since last character write" signal doesn't distinguish a genuine in-progress Make.com generation write from the remediation system's own corrective write, so the unrelated `missing_role_branch_content` fix pushed the quiet-period-clears time from ~19:37 out to ~19:43.
- `19:50:00` was the next `sweep_stuck_needs_review_packages` tick, which — based on the 19:35:32 write and the 450s window — would have cleared and let `notify-generation-issue` actually attempt `missing_round_content` recovery for the first time. Confirmed the cron fired via `cron.job_run_details`; didn't observe the outcome because the two characters were fixed manually (via direct `regenerate-child-content` calls) a few minutes before this tick, at Jonathan's request, rather than waiting.

**Root cause: not unique to this package, not caused by anything shipped today.** `missing_round_content` (ADR-0096) has *never* been wired into `auto-remediate-packages` — confirmed by grepping its source and its own docstring's defect-class table, and by checking both cron jobs' `classes` filters (job 9's held-only sweep explicitly lists `identity_contamination, slip_culprit_leak, template_artifact, missing_role_branch_content, pointform_language_mismatch, narration_person_mismatch` — no `missing_round_content`; job 8's full sweep runs with an empty body, i.e. every class the code defines, and the code simply doesn't define one for this class). By design (ADR-0096/ADR-0111), `missing_round_content` self-heals exclusively through `notify-generation-issue`'s own quiet-period-gated re-fire, invoked repeatedly by `sweep_stuck_needs_review_packages()` every 10 minutes. That's a real, working mechanism — it just shares its "is generation still active" clock with every OTHER defect class's auto-fixes, so whenever a package has more than one auto-remediable defect and they don't all land in the same instant, each fix quietly pushes back the goalpost for any other fix still waiting on the quiet period. The net effect here was one extra 10-minute sweep cycle of delay (would have resolved at ~19:50 instead of ~19:40), not an indefinite hang — every write to the same package keeps re-arming the same 450-second window, so the delay is bounded by however many more auto-fixes land in the interim, not unbounded.

**Not fixed.** This is a minor, self-resolving timing interaction, not a customer-facing failure (the package still healed within one extra cron cycle, and this session's manual intervention just preempted that by a few minutes). Logging it in case a future package with *several* auto-remediable defects landing in sequence shows this compounding into a more noticeable delay — worth revisiting then, e.g. by having the quiet-period check exclude writes whose `updated_at` coincides with a logged `auto_remediation_log` row for that package. Not proposed as a fix now; no evidence yet that the compounding case is common enough to be worth the change.

### Key files (Addendum 1)
- No changes made — investigation and documentation only
- Related: ADR-0103 Addendum 59 (the session that surfaced this while testing an unrelated fix)
