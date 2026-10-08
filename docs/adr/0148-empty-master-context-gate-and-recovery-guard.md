# ADR-0148: An empty master_context holds the completion gate, and character re-fires are not sent without one

**Status:** Accepted (shipped 2026-10-08: migration applied, `notify-generation-issue` v42 deployed; the worker guard is covered by an offline test and has not yet fired on a real incident)
**Date:** 2026-10-08
**Related:** ADR-0147 (the cause of the incident), ADR-0103 Addendum 87 and 88 (the gate and the incident), ADR-0085 and ADR-0065 (the recovery loop and its grace logic)

## Context

"Death And Dumplings At Madwimmin House" (2026-10-07) saved `master_context = ''` on two runs. Two weaknesses showed:
1. The empty value was only caught indirectly, through the game overview text ("master_context arrived empty").
2. The recovery loop in `notify-generation-issue` still re-fired every missing character (10 attempts, 1.50 USD logged at the 0.15 USD estimate) although a re-fire reads `master_context` and could not write anything.

Corpus: since 2026-06-01 only 2 packages have `master_context` under 1,000 chars: "Operation: Nightfall" (paid, completed 2026-08-11, 30 characters, working detective script) and an unpaid `needs_more_info` stub. The smallest real value is 1,826 chars (1st percentile about 36,000). Only one paid package has ever shown the failure, and its cause is fixed (ADR-0147).

## Decision

1. **Gate:** `package_missing_core_content` gains `master_context_empty` (length under 1,000), reported as `missing_core_content.master_context_empty`, for packages created on or after 2026-10-08 only (migration `20261008080000_master_context_empty_blocks_completion.sql`). The floor keeps Nightfall and any later edit of an old package from being re-flagged; a live check shows 0 packages newly flagged. Detection only, as for the other `missing_core_content` checks.
2. **Recovery guard:** `notify-generation-issue` fetches `master_context` once when there are characters to recover; if it is under 1,000 chars it fires none, writes one `auto_remediation_log` row (`missing_core_content`, `skip_regenerate:master_context_empty`, escalated, 0 USD, once per package), shows an "Auto-Recovery Blocked" row in the alert, and treats the case as not-clean so the alert goes out immediately instead of waiting for a recovery that cannot happen. Logic lives in `_shared/recovery-guard.ts`, tested by `scripts/__tests__/recoveryGuard.test.mjs` (6 checks, in `npm run test:roster`).
3. **Fails open:** if the `master_context` lookup errors or finds no row, the guard does not apply and recovery behaves as before.

## Rationale

Both changes only reduce spending or add an alert; neither can start a paid action. The threshold has a wide margin against real values.

## Alternatives considered

- **A Make-side stop after module 158 (Parent82).** Declined: the failure is rare and its cause is fixed; the saving is about 1.50 USD per incident; a wrongly built filter could silently block every generation, and the package would sit in progress with no alert; and importing an untested blueprint right before Jonathan was away for a long weekend adds risk for little gain. Can be built later if the failure returns.
- **Automatic whole-package re-fire.** Rejected: a paid action without a yes, and it would repeat on the same cause.
- **A June floor for the gate check.** Rejected: would flag "Operation: Nightfall".

## Consequences

- A repeat of an empty `master_context` produces one alert naming it, 0 USD of futile re-fires, and a package held in `needs_review`; the repair is still a whole-package re-fire (paid, needs a yes).
- The guard path has not run on a real incident; first one should be checked in the `auto_remediation_log` (`skip_regenerate:master_context_empty`) and the alert email.
- The threshold and the date floor are constants in two places (the migration and `recovery-guard.ts`); keep them in step.

## Key files

`supabase/migrations/20261008080000_master_context_empty_blocks_completion.sql`, `supabase/functions/_shared/recovery-guard.ts`, `supabase/functions/notify-generation-issue/index.ts`, `scripts/__tests__/recoveryGuard.test.mjs`.
