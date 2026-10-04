# ADR-0140: Reviewer fact propagation (re-check every field that repeats a corrected fact)

**Status:** Accepted (live since 2026-10-04; positive case not yet seen in production)
**Date:** 2026-10-04
**Related:** ADR-0136 (LLM reviewer), ADR-0138 (review before release), ADR-0103 Addendum 83 (the sweep that measured it)

## Context

The manual sweep of "Murder By Copy" scored the reviewer at 5 real findings against 8 misses (recall 38 to 56 percent). One miss pattern was not a blind spot but nondeterminism on a repeated fact: the reviewer fixed "Joe transferred in from the Flin Flon office" in one character's background and missed two more statements of the same wrong fact (the detective's opening and another background). The reviewer reads one item at a time, so a fact fixed in one item is not looked for in the others, and every item is a fresh chance to miss it.

## Decision

After the per-item review, and before findings are stored and auto-applied, a propagation pass runs for every `wrong_fact` and `cross_field_contradiction` finding:

1. **Anchors.** Distinctive strings are pulled from the finding's quote, explanation and replacement: multi-word proper nouns and amounts/years (`anchorsFrom`). Single capitalised words are too common. Anchors that are a cast member's name, or that appear in more than 25 fields, are dropped.
2. **Candidates.** Every other field (not already carrying a finding) that contains an anchor (`propagationCandidates`), grouped by item.
3. **One small follow-up call per affected item** (at most 6 per package) with the established wrong facts and only the candidate fields, asking for the SAME wrong fact only (`propagationText`). Results go through the normal validation (field known, severity medium or high, quote found exactly once) and are stored as ordinary findings prefixed "Same wrong fact elsewhere:", so the existing auto-apply (English and Spanish, wrong_fact class, sane replacement, revert-on-new-defect guard) treats them like any other finding.
4. Never blocks a review: any failure is logged and ignored. Respects the per-package and daily cost caps. Kill switch: `insert into pipeline_settings (key, value) values ('review_propagate','off') on conflict (key) do update set value='off'` (default on).

A read-only `propagate_probe` mode (`{"mode":"propagate_probe","package_id":..., "corrections":[{quote, explanation, replacement}]}`) exercises the pass on a stored package and writes nothing.

## Verification

- Unit tests in `review-core.test.mjs` for anchors, candidate selection and the prompt.
- Precision probe on Murder By Copy with a correction that is already fixed in the text: 6 calls, 13 candidate fields, 0 findings, 0.13 USD.
- Mechanics probe with a synthetic "wrong fact" ("Diet Pepsi") that appears in many fields: 4 calls, 11 candidate fields, 13 findings across 5 characters and the shared documents (every mention), 0.07 USD.
- NOT yet seen: a real defect propagating in production. Judge it on the next sweeps (scoreboard: count findings prefixed "Same wrong fact elsewhere" and their verdicts).

## Cost

About 0.02 USD per follow-up call, at most 6 calls, only when the main pass found a fact finding: roughly 0.03 to 0.13 USD on top of the 0.3 to 0.8 USD review.

## Alternatives considered

- A second full review pass: doubles the cost and gives the same per-item blind spot.
- Pure string search and replace of the wrong fact: wording differs between fields ("transferred from", "joined from", "formerly of"), so exact matching misses the cases that matter.
- Widening the main prompt: the misses were nondeterminism on one fact, not a missing class, and precision (100 percent so far) is what makes auto-apply safe.

## Key files

`supabase/functions/review-package-quality/review-core.ts` (helpers), `index.ts` (`propagate`, the call in `reviewPackage`, the probe mode), `review-core.test.mjs`.
