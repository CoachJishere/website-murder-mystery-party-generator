# ADR-0085: Drop the "repeat attempt" alert heuristic from empty-character recovery suppression

- **Status:** Accepted
- **Date:** 2026-08-14
- **Supersedes:** the `allRecoveredAreFirstAttempt` condition added in ADR-0081 (same suppression mechanism, one condition removed)
- **Related:** ADR-0081 (built the suppression this ADR narrows), ADR-0076 (the attempt-cap/spend-cap this ADR now leans on as the sole "give up" signal)

## Context

ADR-0081 (shipped 2026-08-13) suppressed the generation-issue alert when empty-character auto-recovery looked clean, but deliberately still alerted on a *repeat* detection — reasoning that "already tried once, still empty on a later sweep" was a stronger signal of real trouble than a first-time miss, so it should page a human even before the hard `MAX_ATTEMPTS_PER_CHARACTER` cap (2) was reached.

The very next day, a live case falsified that reasoning: "Death At The Velvet Lounge" (conversation `96c86e23-6d61-49d1-823e-ee160245608a`) had a character (dual-gender-named "Frances 'Fingers' Malone / Frankie 'Fingers' Malone") that needed both of its 2 allowed attempts — first attempt at 06:58:02 UTC, second at 07:00:02 UTC — and still resolved cleanly with zero manual action. Two other characters in the same package resolved on the first attempt and were correctly suppressed. Because the third character was on attempt 2, `allRecoveredAreFirstAttempt` was false, so the alert fired anyway — for a defect that, like the other two, went on to fix itself.

Asked directly: "should I be getting an email at all?" No — this was exactly the kind of noise ADR-0081 was built to eliminate, and the repeat-attempt heuristic reintroduced it for ordinary variance in how many tries a character needs.

## Decision

Removed the `allRecoveredAreFirstAttempt` tracking and its use in the suppression condition entirely. `emptyCharacterRecoveryLooksClean` is now:

```ts
const emptyCharacterRecoveryLooksClean =
  emptyCharacters.length > 0 &&
  structuralDefects.length === 0 &&
  skipped.length === 0 &&
  capped.length === 0;
```

Suppression now holds all the way up to the hard attempt cap. The alert fires only when a character lands in `skipped` (no description available, can't even attempt) or `capped` (exhausted `MAX_ATTEMPTS_PER_CHARACTER`) — i.e., when auto-recovery has genuinely run out of road, not merely tried more than once.

Deployed as `notify-generation-issue` v16 → v18 (`verify_jwt: true` preserved; v17 had a typo'd ADR reference in the code comment, immediately corrected as v18 — no logic difference between the two).

## Rationale

- The cap (2 attempts, $0.15 each, ADR-0076) already bounds the cost and time of waiting this out — at most one extra ~10-minute sweep cycle beyond what ADR-0081 already tolerated. There's no meaningful downside to trusting the existing cap as the sole "give up" signal instead of adding a second, softer one.
- A repeat attempt is not, on its own, evidence of a *different* kind of problem than a first-time miss — it's the same defect class (`empty_character_content`) using more of the budget already allocated to it. Alerting on attempt-count rather than outcome conflates "still working on it" with "needs help."
- Simpler code: removing the tracking variable and its one call site is a net reduction, not a new mechanism — the correction is a subtraction, matching the actual scope of what was wrong.

## Alternatives Considered

- **Keep the repeat-attempt alert but only for the 2nd of 2 attempts** (i.e., alert exactly when `attemptsUsed === MAX_ATTEMPTS_PER_CHARACTER - 1` fires a re-try). Rejected: this is functionally identical to just alerting on `capped` one cycle later, since a character that fails its 2nd attempt becomes `capped` on the very next check anyway. No information gained, same noise reintroduced for characters that succeed on attempt 2 (as this incident's did).
- **Leave ADR-0081 as-is and treat this as an acceptable false-positive rate.** Rejected: the entire point of ADR-0081 was answering "should I only get an alert if I need to intervene" — one confirmed false positive the day after shipping is direct evidence the answer was still no for a subset of cases, not an acceptable residual rate to leave unaddressed when the fix is this small.

## Consequences

- **Positive:** a persistent empty-character defect still alerts at the same worst-case cadence as before (once `capped`) — no loss of real signal, only removal of the premature "still trying" alert.
- **Positive:** simpler code — one fewer tracked variable, one fewer branch to reason about.
- **Not addressed:** the same open question from ADR-0081 (aggregated visibility into recovery success/escalation rates) remains unaddressed.

## Key files

- `supabase/functions/notify-generation-issue/index.ts` — removed `allRecoveredAreFirstAttempt`, narrowed `emptyCharacterRecoveryLooksClean` (v16 → v18)

## Discussion

Worth naming plainly: ADR-0081 shipped a heuristic on reasoning alone ("a repeat failure feels like a stronger signal"), and it took exactly one real case to show that reasoning didn't hold. That's not a failure of the ADR process — it's what the process is for: the decision was recorded with its rationale explicit enough to be falsifiable, and when evidence falsified it the next day, the fix was fast because the reasoning, not just the code, was written down. The alternative — shipping the same heuristic without recording *why*, then noticing it caused noise days or weeks later — would have taken much longer to trace back to "oh, that's the repeat-attempt branch" without this trail.
