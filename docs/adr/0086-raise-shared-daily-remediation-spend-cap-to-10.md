# ADR-0086: Raise the shared daily auto-remediation spend cap from $5 to $10

- **Status:** Accepted
- **Date:** 2026-08-14
- **Related:** ADR-0076 (introduced the shared $5/day cap on `notify-generation-issue`'s empty-character re-fire, mirroring `auto-remediate-packages`'), ADR-0047 (the original $5/day cap on `auto-remediate-packages`)

## Context

A customer's 34-character package ("Sunset Songs: The Stolen Spotlight") landed `needs_review` with 2 characters permanently `capped` — genuinely needing manual intervention, not a false alarm. Jonathan asked whether the $5/day shared spend cap was the cause and whether it should be raised to $10.

Checked directly: it wasn't the cause of *this* incident. Both capped characters (Phoenix Rivers, Indigo Chase) have exactly 2 "escalated" (successfully fired) rows in `auto_remediation_log` each — they used their full `MAX_ATTEMPTS_PER_CHARACTER` (2) budget and were capped by the *per-character* attempt limit, not the daily spend ceiling.

But pulling the full day's spend told a different story:

| Package | Attempts | Spend |
|---|---|---|
| Death At The Velvet Lounge | 4 | $0.60 |
| Sunset Songs: The Stolen Spotlight (34 characters) | 26 | $3.90 |
| Sunset Songs Scandal: The Missing Golden Microphone | 3 | $0.45 |
| **Total, Aug 14** | **33** | **$4.95 / $5.00** |

The 34-character package alone burned 78% of the *entire day's* shared budget on its own recovery attempts, leaving $0.05 of headroom by the time a third, unrelated package needed recovery — which only just squeezed under the cap. A single large-cast package having a bad day can come close to starving every other customer's recovery that same day, purely by exhausting the shared ceiling before anyone else needs it.

## Decision

Raised `DAILY_SPEND_CAP_USD` from `5.0` to `10.0` in both places it's hardcoded (kept in sync per ADR-0076's "one shared ceiling, not two independent budgets" design):
- `supabase/functions/notify-generation-issue/index.ts` (v18 → v19)
- `supabase/functions/auto-remediate-packages/index.ts` (v6 → v7)

## Rationale

- The per-character/per-defect attempt cap (2, unchanged) already bounds any *single* broken item's worst-case cost ($0.30/character, $0.30/defect) — that's the mechanism actually preventing a runaway infinite-retry loop, not the daily ceiling. Raising the daily cap doesn't reintroduce any of the risk ADR-0047/0076 were built to close.
- A 34-character cast isn't a hypothetical edge case — it just happened. Worst case, if every character in a large-cast package failed both attempts, that alone could need up to `characters × 2 × $0.15`. For a 34-character package that's $10.20 — already exceeding the *old* $5 cap on its own, before accounting for any other package needing recovery the same day.
- $10/day is still trivial in absolute terms: half the price of a single $19.99 sale, for the system-wide daily ceiling on *all* auto-remediation spend combined.

## Alternatives Considered

- **Give `notify-generation-issue`'s empty-character re-fire its own independent budget**, separate from `auto-remediate-packages`'. Rejected: ADR-0076 already made this call deliberately (a combined $10/day ceiling is easier to reason about than two separate caps that could each be near-exhausted independently, and a large-cast package's churn would still crowd out the *other* system's budget under a split design just as easily).
- **Scale the cap with cast size** (e.g., a per-package sub-budget). Rejected as unnecessary complexity for a first pass — a flat, generous daily ceiling solves today's near-miss; revisit only if a genuinely adversarial or pathological cast size shows up.

## Consequences

- **Positive:** a single large-cast package's recovery no longer risks starving every other package's recovery the same day.
- **Not addressed:** the per-character 2-attempt cap is unchanged and still the real backstop against a single broken character burning unbounded money — this ADR only widens the shared pool multiple packages draw from.
- **Separately being investigated**: why Phoenix Rivers' `description`/`background`/`secret`/`relationships` never got touched across 2 successful re-fire attempts, even though round content did regenerate correctly both times. If that's a structural gap in the re-fire route (not a budget/attempt-count problem), raising this cap won't fix it — tracked as a follow-up, not resolved by this ADR.

## Key files

- `supabase/functions/notify-generation-issue/index.ts` — `DAILY_SPEND_CAP_USD` (v18 → v19)
- `supabase/functions/auto-remediate-packages/index.ts` — `DAILY_SPEND_CAP_USD` (v6 → v7)
