# ADR-0081: Suppress the generation-issue alert when `notify-generation-issue`'s own empty-character recovery looks clean

- **Status:** Accepted
- **Date:** 2026-08-13
- **Related:** ADR-0079 (found and fixed the sentinel-blindness bug in the same recovery filter this ADR gates), ADR-0076 (built the empty-character re-fire + attempt-cap/spend-cap this ADR adds a grace period around), ADR-0065 (the existing self-heal grace period this ADR's design directly mirrors, previously scoped only to the *other* worker's defect classes)

## Context

Same day as ADR-0079, a second "Generation Display Issue" alert fired for a different package ("Veisluhöllin Í Morðinu", conversation `7b88bdfc-78c5-43b4-ae6f-c5a7538e108a`): 5 of 8 characters were genuinely empty, the (already-patched, per ADR-0079) recovery filter caught them, fired a clean re-fire for all 5, and the package finished generating correctly within a few minutes with zero manual intervention. By the time it was checked, `generation_status` was already `completed`.

Jonathan's question: he still got paged for an issue that had nothing for him to do and had already fixed itself. Should the alert only fire when there's actually something to act on?

Investigating the code: `notify-generation-issue` fires its own inline empty-character recovery **and** sends the alert email in the same invocation, unconditionally (gated only by a 6-hour send cooldown). The existing "self-heal grace period" (ADR-0065) only applies to the *separate* 30-min sweep worker's defect classes (`meta_text_leak`, `self_directed_question`, `victim_mismatch`, `identity_conflict`, `slip_culprit_leak`) — it was never extended to cover this function's own empty-character recovery, which is arguably the case most likely to self-heal quickly, since the recovery attempt and the alert both originate from the exact same code path in the exact same request.

## Decision

Added a second suppression condition, `emptyCharacterRecoveryLooksClean`, alongside the existing worker-grace-period one:

```ts
const emptyCharacterRecoveryLooksClean =
  emptyCharacters.length > 0 &&
  structuralDefects.length === 0 &&
  skipped.length === 0 &&
  capped.length === 0 &&
  allRecoveredAreFirstAttempt;
readyToAlert = readyToAlert && !emptyCharacterRecoveryLooksClean;
```

- **`structuralDefects.length === 0`**: only suppress when empty characters are the *only* issue. If something else is also wrong, alert regardless of how clean the empty-character recovery looked.
- **`skipped.length === 0 && capped.length === 0`**: only suppress when every empty character actually got a re-fire attempt. A character that couldn't be recovered at all (no description available) or already exhausted its attempt cap is exactly the "you need to look at this" case — those still alert immediately, unchanged.
- **`allRecoveredAreFirstAttempt`** (new tracking var, `attemptsUsed === 0` before this fire, for every character in `recovered`): only suppress on the *first* detection. If a package is checked again on a later sweep and the same characters are still empty despite an earlier re-fire, that's a repeat failure — a stronger signal something is genuinely wrong — so it alerts even before the hard 2-attempt cap is reached, rather than silently suppressing a second time.

New `email_suppressed_reason: "awaiting_empty_character_recovery"` in the JSON response, distinct from the existing `"awaiting_self_heal"`, for observability.

Deployed as `notify-generation-issue` v15 → v16 (`verify_jwt: true` preserved).

## Rationale

- Mirrors an already-validated pattern (ADR-0065's grace period) rather than inventing a new suppression mechanism — same shape, applied to the gap that pattern didn't originally cover.
- The two suppression conditions (`workerMightFixThis` and `emptyCharacterRecoveryLooksClean`) are mutually exclusive by construction: one requires `structuralDefects.length > 0`, the other requires it to be `0`. No ordering dependency between them.
- Suppressing only on a *clean, first-attempt* recovery keeps the fix narrow: a genuinely stuck package still alerts on the very next sweep cycle (10 min later) if the first re-fire didn't work, rather than silently retrying up to the 2-attempt cap before anyone finds out.

## Alternatives Considered

- **Delay the email by a fixed window (e.g. 3–5 min) instead of suppressing on next-sweep-detects-still-broken.** Rejected: this function has no mechanism to schedule a delayed follow-up call to itself — the only re-invocation is the 10-minute `sweep_stuck_needs_review_packages` cron, which already provides exactly that delay for free. Building a separate timer would duplicate infrastructure that already exists.
- **Suppress based on `recovered.length === emptyCharacters.length` alone**, without the first-attempt check. Rejected: would silently re-suppress on every sweep cycle up to the attempt cap, meaning a package stuck on a *persistent* (not transient) empty-character defect wouldn't alert until 2 full cycles (~20 min) had passed with zero visibility in between — the first-attempt check catches this on the very next cycle instead.

## Consequences

- **Positive:** the exact scenario that prompted this ADR — a clean, first-time empty-character recovery that resolves on its own — no longer pages a human. Confirmed this would have suppressed the Veisluhöllin alert had the fix landed before it fired.
- **Positive:** a genuinely stuck package (recovery fails, or fails twice) still alerts at the same cadence as before — no loss of real signal, only removal of the "recovery already fixed it" noise.
- **Not addressed:** visibility into *how often* recovery succeeds cleanly vs. needs escalation is now implicit (only visible via `auto_remediation_log` and the suppressed-reason field in the function's own response, not surfaced anywhere aggregated). If recovery-frequency becomes a metric worth tracking, that's a separate follow-up, not built here.

## Key files

- `supabase/functions/notify-generation-issue/index.ts` — `allRecoveredAreFirstAttempt` tracking (recovery loop), `emptyCharacterRecoveryLooksClean` gate, `awaiting_empty_character_recovery` suppressed-reason (v15 → v16)

## Discussion

The prompting question ("shouldn't I only get an alert if I need to intervene?") is really about the same class of gap ADR-0065 already solved once — a recovery mechanism existing doesn't help if the alert fires before the recovery has a chance to work. ADR-0065 solved it for the external 30-min worker; this function's *own* inline recovery, running in the same request as the alert it triggers, had somehow never gotten the same treatment. Worth noting for future recovery mechanisms added to this codebase: if a function does both "attempt a fix" and "alert a human" in one invocation, the alert should default to conditional on the fix's own signal (clean vs. capped vs. skipped vs. repeat-failure), not unconditional.
