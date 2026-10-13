# ADR-0156 Phase 4 Tier 1 findings, part 1: Silver Nightingale x3, one Parent85 control, three rewrite probes (2026-10-13)

Approved by Jonathan: Tier 1 and Tier 2, hard cap 4.5 USD total, Silver Nightingale samples first, stop and report before runs 4 to 7 if a culprit or accomplice sentence contains an act, intent or secrecy word or reads as more specific than the innocents'. Tier 2 only after Tier 1 passes, with the chat redacted by `buildCharacterChatSafe`. **Runs 4 to 7 and Tier 2 have NOT been run.** Raw outputs stay in the gitignored `temp-files/charctx/phase4_out/` (they are variations of a customer's mystery). Tools: `tools/phase4_tier1.py` (replay), `tools/phase4_analyze.mjs` (checks), `tools/phase4_probe.py` (hard-case probe).

## Spend (actual tokens, cost at the assumed 3 and 15 USD per MTok)

| Call | Input | Output | Est. USD |
|---|---|---|---|
| Parent86 module 3000, Silver, sample 1 | 27,678 | 11,869 | 0.261 |
| sample 2 | 27,678 | 11,898 | 0.262 |
| sample 3 | 27,678 | 23,532 | 0.436 |
| Control: Parent85 module 3000, Silver | 26,822 | 11,467 | 0.252 |
| Probe 1, 2, 3 (rewrite of the stored map) | 12,941 each | 765, 818, 807 | 0.050, 0.051, 0.051 |
| **Total so far** | | | **about 1.36 of 4.5** |

The Part 2 estimate in the design (0.25 to 0.50 per call) held: 0.25 to 0.44.

## Results against the stop rule

- **Act, intent or secrecy words in a culprit or accomplice sentence: none.** 6 sentences in the three full runs, 3 more (Simone) in the probes, 3 empty (Felicity unseen in the probes). The scan covers secrecy, tampering, intent, result and alibi words.
- **More specific than the innocents': borderline in one case.** Sample 3 Simone is 20 words against an innocent maximum of 19 ("hands one to a seated guest"); samples 1 and 2 are inside the innocents' range (16 vs 18, 18 vs 19); in the probes Simone is 21 to 23 against innocents' 14 to 23. Every Simone sentence in all six runs says she hands a glass to a guest, which is the visible act and the clue itself (the witness needs "at the sideboard with the tray", not "in the pantry"). I judge it as designed rather than a leak, but it is the one place the rule's "indistinguishable" is only partly met, and I stopped there as you asked.

## What the full runs did not test, and the probe that did

In all four Part 2 runs (three Parent86, one Parent85 control) the Parent's own `truePosition` for Simone never states the act ("dosed"): it says she "handed Reginald his glass". The stored Parent77-era map did say "dosed the glass". So the hard case, hiding an act that the entry states, was never exercised by the replay and the control shows it is not caused by Parent86. The probe feeds the stored map (with "dosed the glass set apart on its own napkin ... She was not in the pantry") plus the rule paragraph and asks only for the field: **3 of 3 Simone sentences drop the dosing, the napkin and the pantry and keep "at the service sideboard at the bar end with the brandy tray, hands Reginald a glass, near Percival"**. This is the clue Marcus and Harry need. Felicity (unseen) correctly gets an empty string 3 of 3.

## Rule breaches that are not culprit leaks (wording to tighten)

- **Added detail (rule 4, "adds nothing new"):** in the full runs the model embellishes innocents with generic actions not in `truePosition` ("speaking with", "holding a notebook", "looking toward Josie"); sample 3 mostly copies `truePosition` and does not.
- **Inner state or appearance (rule 1):** in the probes 6 of 30 innocent sentences carry "relaxed", "looking ill at ease"/"uneasy" (Nikolai, 3 of 3), "a composed expression" (Antonia, 2 of 3). Not observable facts and not a culprit leak, but they break the rule and could contradict a character's own sheet.
- Proposed tightening (not applied, no re-run done): rule 4 gets "do not add any action, object or state that is not in truePosition (if it says 'with Harry', write 'with Harry', not 'speaking with Harry')" and rule 1 gets "no feelings, expressions or impressions". Both are wording-only changes to `build-parent-v86.py`.

## Collateral check against the control

Reciprocity breaks in `besideOrNear` (A beside B but B does not name A): Parent86 samples 2, 1, 0; Parent85 control 3. Entry count 12 in all. The stored Parent77-era map had 0, so this is sampling noise of the current model, not an effect of the new rule. Sample 3 also made almost everybody see everybody (Simone seen by 8 of 11): a map-openness effect unrelated to the field, noted for the sweep.

## Analyzer notes

Four "leak" flags came from the 5-word-run check (`in view of the room`, `seated at a middle table`, `bartholomew josie and antonia close`): generic positional phrases shared by the culprit's `truePosition` and an innocent's own entry, not act text. The check is too loose for generic phrases; it should be read, not trusted.

## Status and decision needed

Not run: runs 4 to 7 (Blackthorn, Last Slice, Swedish, intrigue; about 1.2 USD) and Tier 2 (four Child regenerations with `buildCharacterChatSafe`; about 0.8 USD). Projected total if both go ahead: about 3.4 USD, under the 4.5 cap; with a Silver re-run after the wording tightening (about 0.8) still about 4.2.
