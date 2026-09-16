# ADR-0123: `notify-generation-issue`'s 3-minute quiet-period gate is too short for large/`both`-script-type casts — proposal, not yet accepted

- **Status:** Proposed
- **Date:** 2026-09-16
- **Related:** ADR-0103 Addendum 47 (the incident that surfaced this), ADR-0097 (per-character generation time / conversation-excerpt windowing), ADR-0086 (the $10/day shared spend cap), ADR-0081/0065/0111 (the other grace-period gates already in this function)

## Context

"Festa Fatal: Os 34 Anos Que Ninguém Vai Esquecer" (17 players, `mystery_style='detective'`, `script_type='both'`, `has_accomplice=true`) triggered a "Generation Display Issue" alert at 12:26 while its Make.com Child scenario generation was still legitimately in progress — the run didn't finish until 12:40, a 20-minute total span consistent with ADR-0097's ~100s/character estimate scaled to 17 characters and doubled content for `script_type='both'`.

`notify-generation-issue`'s stuck-detection logic (`supabase/functions/notify-generation-issue/index.ts:186-205`) is a single flat gate: if no `mystery_characters` row for the package has been written in the last `WRITE_QUIET_PERIOD_MS` (3 minutes), it concludes the generation has stalled and proceeds to alert + dispatch recovery. Querying this package's actual character-write timestamps shows a genuine ~5.5-minute gap mid-run (12:28:21 → 12:33:55) with zero writes — not a failure, just how Make.com's Child scenario paces a large cast (it appears to process characters in batches with real gaps between batches, not a steady per-character drip). That gap alone exceeds the 3-minute threshold, so the function fired twice (12:20:04 and 12:26:17-19), each time dispatching a redundant `regenerate_character` re-fire webhook for every character not yet confirmed complete — 13 names the first time, 17 the second. Those redundant webhooks raced the real, still-running generation for most of the cast; 14 characters recovered anyway because the original generation simply finished them, but the redundant calls are what burned the 2-attempt-per-character cap (`MAX_ATTEMPTS_PER_CHARACTER = 2`) for the 7 that got flagged "capped," and hitting that cap triggers an immediate, ungated alert by design (ADR-0081) — no grace period exists for the "capped" case, unlike every other defect class this file already handles carefully (see `WORKER_RECOGNIZED_PREFIXES`, `GRACE_PERIOD_MS`, `RECENT_ATTEMPT_GRACE_MS`).

In short: the alert was largely self-inflicted. It misread an actively-progressing large-cast generation as stalled, "helped" by firing redundant recovery calls that raced the real work, and those redundant calls are what actually produced the cap-hit that then justified sending the email. The $10/day shared spend cap (ADR-0086) was never close to binding (only $5.25/$10 spent across all packages that day) — this is purely a timing-threshold problem, not a budget problem.

Separately (and not blocking this ADR): 3 of the 7 flagged characters (Adriano Nacife, Verônica, Paulo César) turned out to be genuinely, reproducibly broken — not just delayed — and needed a manual re-fire outside the capped bookkeeping to resolve (see ADR-0103 Addendum 47's Resolution note). That the alert also happened to catch 3 real failures inside a mostly-false-positive run is itself informative: a better-tuned quiet-period gate should reduce false alerts without making genuine failures on large casts invisible for longer.

## Decision (proposed — not yet implemented)

Replace the flat `WRITE_QUIET_PERIOD_MS = 3 * 60 * 1000` with a threshold that scales with the package's own expected workload, using data this function already fetches (`expectedCharacters` from `extracted_characters`, `scriptType` from `conversations`).

## Options considered

**A. Scale the quiet-period constant by cast size.**
`quietPeriodMs = max(3min, 3min + max(0, expectedCharacters - 8) * 30s)`, doubled (or ×1.5) when `scriptType === 'both'`. For this incident (17 characters, `both`): `3min + 9*30s = 7.5min`, ×1.5 ≈ 11 min — comfortably covers the observed 5.5-minute gap with margin.
- *Pro:* simple, one function, easy to reason about and tune.
- *Con:* the per-character/multiplier constants are guesses calibrated off one incident's batch-gap shape, not a measured distribution — could still be wrong for a different pacing pattern (e.g. `mystery_style='character'`, which has a different call shape than `detective`).

**B. Gate on total expected generation duration instead of (or in addition to) the most-recent-write gap.**
Estimate `totalEstimateMs = expectedCharacters * 100s * (scriptType === 'both' ? 1.5 : 1)`. Only treat the package as stalled if the flat 3-minute quiet-write check ALSO coincides with `Date.now() - generation_started_at > totalEstimateMs * 1.5` (a safety margin over the estimate). This directly encodes "has enough time passed that even a full, uninterrupted run should have finished by now" rather than inferring stalling from a single gap length.
- *Pro:* more robust to internal batching/pacing changes in the Make.com scenario — doesn't need to model gap shape at all, just total expected duration, which ADR-0097 already estimated once.
- *Con:* two conditions instead of one; a package that's unlucky early (one truly stuck character right after generation starts) waits the full estimated duration before alerting, longer than today for small/fast packages if not floored carefully.

**C. Do nothing to the gate; instead only fix the "capped" alert to get the same grace period other defect classes already have** (extend `WORKER_RECOGNIZED_PREFIXES`-style grace, or extend `RECENT_ATTEMPT_GRACE_MS` logic, to also cover a capped character if the *package's own* generation is still young relative to its size).
- *Pro:* smallest change, only touches the one path that actually emailed a human.
- *Con:* leaves the root cause (redundant re-fires racing a healthy generation, burning real Sonnet 5 spend on wasted duplicate calls — 13+17 = 30 dispatched calls this incident, most wasted) untouched. The false alert was a symptom; the wasted spend and cap-burning from racing is the more expensive problem and this option doesn't touch it.

## Recommendation

**Option A**, with a floor/ceiling (e.g. never below the current 3 min, never above ~15 min) so this can't regress small packages' existing fast-alert behavior or make a very large package's gate effectively infinite. It's the smallest change that fixes both symptoms (false alert AND the wasted redundant-webhook spend that caused it), reuses data already in scope, and is easy to verify against this incident's own numbers before shipping. Option B is more principled but adds a second condition to reason about for a problem Option A already solves at the size of packages actually sold today (max ~35 players per the marketing-facts memory note). Option C is rejected — it treats the symptom, not the cause.

## Open questions for Jonathan

1. Confirm the per-character/multiplier constants (30s/character above a floor of 8, ×1.5 for `script_type='both'`) — these are back-calculated from one incident, not measured across a corpus. Worth a quick check against 2-3 other large-cast packages' actual write-gap shapes before picking final numbers, or worth shipping as a first approximation and re-tuning if it over/under-fires?
2. Cap: is 15 minutes an acceptable maximum quiet-period, or should very large packages (25-35 players) get a higher ceiling?
3. Should this also apply to `sweep_stuck_needs_review_packages` (the 10-minute cron that also invokes this function) or only the initial completion-trigger-fired call path? (Believed to be the same code path either way, since `notify-generation-issue` doesn't distinguish its caller — confirm no caller-specific behavior is expected.)

## Consequences if adopted

- Fewer false "Generation Display Issue" alerts for large/`both`-script-type packages — less noise in the support inbox, less wasted duplicate Sonnet 5 spend from racing recovery webhooks against healthy in-progress generations.
- Genuine failures on large packages will, by construction, take slightly longer to alert (bounded by the chosen ceiling) — an explicit, deliberate tradeoff: fewer false positives in exchange for slightly slower detection of true positives, matching every other grace period already in this file.
- No change to small/typical-size packages' existing alert timing (the floor keeps today's 3-minute behavior for them).

## Key files (if adopted)

- `supabase/functions/notify-generation-issue/index.ts` — replace the flat `WRITE_QUIET_PERIOD_MS` constant (line ~205 area) with the scaled calculation described above; needs `expectedCharacters` and `scriptType`, both already fetched earlier in the function.

## Links

[[01_Projects/Mystery-Maker]]
