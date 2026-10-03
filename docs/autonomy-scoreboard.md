# Autonomy scoreboard: what the machinery caught, healed, prevented, and missed

Purpose (North Star, "Operating Principle: Autonomous Quality"): the goal is that no human sweeps packages. Every sweep appends one row here so we can see the gap close. The **"Missed by everything"** column (defects a human found that no detector, heal, prevention or reviewer caught) is the roadmap: each entry there becomes a prompt fix, a detector, a heal, or a reviewer-prompt change. When that column is near zero for many consecutive packages, we widen the gap between sweeps (sampled audit, then none).

How to fill a row (do it at the end of every New-Purchase sweep, before closing):
- **Hand edits:** total fields or spots you had to fix by hand.
- **Prevented / healed:** how many of those the current machinery would have handled by itself (check `auto_remediation_log`, the detectors, and which Child version generated the package).
- **Reviewer found:** how many of the hand edits the LLM review pass flagged (once the production reviewer or `docs/adr/0136-pilot/` runs on the package).
- **Missed by everything:** list them. Also list real defects the reviewer found that the hand sweep missed.

| Date | Package | Style, language, characters | Child version | Hand edits | Prevented or healed | Reviewer found | Missed by everything | Notes |
|---|---|---|---|---|---|---|---|---|
| 2026-10-03 | Boogie Nights, Bloody Nights | slip, EN, 14 | Child51 (before 53-55) | 66 | 56 (32 headers, 8 leaks, 2 pointforms live; 14 pronouns by Child54, imported as part of v55) | 8 of 10 semantic with two passes (4/6 single-generation, 2/3 wrong fact, 1/1 cross-call); 11/12 pronouns | Honey's garbled description sentence; Pete's stray paragraph under ALLIES (both in short structured fields) | Reviewer also found 4+ real defects the hand sweep missed (Toni "paid to dance", Vera "bankrolling the place", etc.). ADR-0103 Addendum 79/80, ADR-0136 Addenda 2-3 |
| 2026-10-03 | A Feast For The Dying (re-review) | slip, EN, 6 | Child48 | n/a (swept 10-01) | n/a | 6 findings, 4 real | n/a | Hand sweep had missed 4 real defects ("decades of idle centuries", Percival "three hundred years", ...) |
| 2026-10-03 | El Último Brindis De Laia (re-review) | slip, ES, 10 | Child48-ish | n/a (swept 10-02, 69 edits) | n/a | 13-15 findings, 5 new real + 3 known | n/a | Non-word "aireroar", a leftover ustedes slip, an ungrammatical sentence |
| 2026-10-03 | Blood On The Mead-bench (review only) | detective, EN, 8 | n/a | n/a | n/a | 5 findings, about 2 real | n/a | Dual-name placeholder triggered a false alarm: add the dual-name rule to the detective reviewer prompt |
| 2026-10-03 | The Last Lesson Of Professor Vaingloryus (review only) | detective, EN, 14 | n/a | n/a (swept 09-26) | n/a | 23 findings, about 19 real | n/a | Mostly innocents hinting at the solution, years/number contradictions |
| 2026-10-03 | The Night The Storm Hit (review only, unswept) | detective, EN, 14 | n/a | n/a | n/a | 23 findings, about 19 real, 2 high | n/a | Age 21 vs 22 across documents, leaked "sorry, I mean" self-correction. Baseline for the before/after test of Child55 |

**Production reviewer:** live since 2026-10-03 (ADR-0136 Addendum 5); its first run on "The Night The Storm Hit" gave 23 findings (2 high), matching the pilot. Findings per package are now in `package_review_findings`; record `human_verdict` there and the totals in this table.

**Baselines to beat after Child55 (imported 2026-10-03):** unswept detective packages averaged about 20 reviewer findings (medium or high); slip packages about 13 (Boogie 25 before the reviewer prompt was tightened). If the first post-import packages show clearly fewer solution-hinting and years/number contradictions, the Child fixes work.
