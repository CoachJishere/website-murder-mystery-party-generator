# ADR-0142: Prompt-level prevention driven by the reviewer's own findings (Child57, Parent75)

**Status:** Accepted, built 2026-10-04; **not imported until Jonathan does it**
**Date:** 2026-10-04
**Related:** ADR-0103 (sweep), ADR-0136 and ADR-0138 (reviewer), ADR-0137 (chained context), ADR-0140 (propagation)

## Context

Jonathan asked whether the prompts themselves can get us further toward a package nobody has to touch, or whether we are stuck generating and fixing afterwards. The reviewer's stored findings answer it. Across the 66 English findings recorded before 2026-10-04 (5 packages, 13 per package, 100 percent precision on the single class and about 90 percent overall), they sort into families:

| Family | Count | Examples | Prompt-preventable? |
|---|---|---|---|
| Time references wrong for a one-night game | about 10 | "a week later", "last night", "days ago", "all week", a funeral or burial | Yes: a rule |
| Invented or drifting specifics (numbers, durations, counts, biography, occasion, ownership) | about 30 | months vs weeks, twelve vs eleven girls, three crates vs one, 200 guests at a 16-guest party, 25 vs 14 years, "transferred in from Flin Flon", whose birthday, who owns the planner | Yes: a rule, plus ADR-0137's chaining |
| Evidence or hidden secrets used before they are revealed | about 14 | a round 2 line using a round 3 clue, an innocent knowing the murderer's movements | Partly (Child51 did not fully hold): a stronger rule |
| Noise (typo, garbled phrase, stray "OK", "an humiliating") | about 10 | | No: stochastic, needs the verification layer |
| Other | 2 | | No |

About 82 percent of what the reviewer finds is in families a prompt can address. The rest is generation noise that only checking catches. So the answer is not "hope and fix afterwards": the prevent layer still has most of the available gain, and the verify layer (detect, heal, review, propagate) is for the remainder.

## Decision

1. **Child57** (from Child56): three rules added to `<content_coherence_rules>` in all 8 per-character prompts, after the existing TIMING rule: **ONE-NIGHT TIME FRAME**, **NO INVENTED SPECIFICS** (numbers and biography only from master_context or the character's own earlier fields; reuse a given number exactly), **EVIDENCE BY ROUND** (no later-round evidence; an innocent never refers to another character's hidden secret or the murderer's movements).
2. **Parent75** (from Parent74): two sentences appended to all 28 `<output_hygiene>` blocks with the no-invented-specifics and one-night rules, because the shared documents carry the same families ("formerly of the Flin Flon office", a bonfire anniversary, "two hundred guests").
3. Built by `temp-files/build-child-v57.py` and `build-parent-v75.py` (local, gitignored): exact-match inserts asserted per prompt; a diff against the predecessors shows only prompt text nodes changed (8 and 28).

## How to judge it (the baseline)

Before: about 13 reviewer findings per English package, about 10 per package in the three prompt-addressable families. After import, compare per-package counts of those families on the next 3 to 5 purchases (`package_review_findings`, same classification as above) and log them on `docs/autonomy-scoreboard.md`. Success looks like the three families dropping by about half. If a family does not move, the rule is not working and the next lever is structural, not wordier: pin a short canonical fact sheet (counts, durations, occasion, venue, who owns each item) generated once by the Parent and injected verbatim into every Child call.

## Risks and why they are acceptable

- Rules add about 1.4 KB to each Child prompt (8 prompts): negligible cost.
- Too-strong "no specifics" could flatten characters. The rule allows anything master_context or the character's own fields establish and asks for qualitative wording only where nothing is established, so concrete detail survives where it is canonical.
- A new instruction can surface as meta text ("per the rules"). The existing hygiene rules and the meta-text detector still apply.

## Alternatives considered

- **More reviewer coverage instead:** raises cost and still cannot beat prevention for systematic families.
- **Detector for time phrases:** cheap but unsafe on multi-day settings and the free heal cannot rewrite a sentence; the reviewer already finds these with 100 percent precision.
- **Fact-sheet pinning now:** the stronger structural fix, but a larger Parent and Child change; held in reserve per the success criterion above.

## Operating it

Import `MM Live - Parent75 (No Invented Specifics).blueprint.json` and `MM Live - Child (Unified)57-ConsistencyRules.blueprint.json` into Make.com. Numbers are never reused (CLAUDE.md blueprint versioning note): the next versions are Parent76 and Child58.

## Key files

`temp-files/build-child-v57.py`, `temp-files/build-parent-v75.py` (local), the two blueprint JSON files (local).
