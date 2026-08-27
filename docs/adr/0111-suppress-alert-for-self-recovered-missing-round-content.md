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
