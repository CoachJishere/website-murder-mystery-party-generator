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

# Part 2: tightened wording, Silver once (2026-10-13, same day)

Plan approved by Jonathan: tighten rules 1 and 4 in `build-parent-v86.py`, re-run Silver once, stop and report before runs 4 to 7 and Tier 2 if there is a culprit leak or a high added-detail rate. Rule 1 now adds "no feelings, moods, expressions or impressions ... only what a camera would record"; rule 4 adds "do not add any action, object or state that truePosition does not contain (if it says 'with Harry', write 'with Harry', not 'speaking with Harry')". Rebuilt Parent86 (diff against Parent85 is still pure insertions in modules 3000 and 4020, rule text identical in both).

Spend: in 27,795, out 12,409, about 0.27 USD. **Running total about 1.63 of 4.5 USD.**

- **Culprit and accomplice: clean.** Simone 20 words (innocents' maximum 20), Felicity 17; no act, intent, secrecy or tampering word. Simone: "Walks through the dining car carrying a tray of glasses and hands Reginald a glass, near Percival at the bar."
- **Feelings and expressions: gone** (0 hits; probes before the change had 6 of 30). "Speaking with" embellishments: gone.
- **Added detail: still high, about 7 of 12 sentences (58 percent), 8 counting a borderline.** Before the change, reading sample 1 the same way, about 6 to 7 of 10 to 12. The tightening changed the kind of addition (props instead of conversation), not the rate: "raising a glass" (Vivian, Josie), "listening to the toast" (Bartholomew), "holding a glass" (Marcus), "with a glass in front of her" (Felicity), "stands and walks toward Vivian with a glass in hand" (Antonia), "laughing" (Josie), **"holding a notebook" (Harry)**. The scripted counter (`added-detail` in the analyzer) is too crude to give a rate (it counts verb inflections); the figures here are by reading.
- **Why it matters beyond style:** Harry is a journalist posing as a society guest. "Holding a notebook" appeared in samples 1 and t1 (2 of 4 Parent runs) and is a prop that points at his hidden identity: the Parent knows secrets and an invented prop can carry one into a sentence that every witness is given. It is not a culprit leak, but it is the same class as the Harry chat leak found in Phase 2.
- **Other:** reciprocity breaks 4 in this run (Parent86: 2, 1, 0, 4; Parent85 control: 3), i.e. noise range 0 to 4 on single samples. One sentence (Beatrice) names a character who is in `truePosition` but not `besideOrNear`, so rule 4's "names only cast members listed in besideOrNear" should read "or already named in truePosition".

## Diagnosis and options (not applied)

The model is asked to derive the observer sentence from `truePosition` and invents props because a toast scene "needs" a glass. Telling it not to has not moved the rate. Options:
1. **Invert the derivation (recommended).** The Parent writes the observer sentence first as the entry's primary text, then `truePosition` as that sentence plus any private additions. The observable layer cannot then contain facts the private layer lacks, and the culprit's act lives only in the extension. Costs one more prompt change and one more Silver run (about 0.3 USD).
2. **Accept props, forbid only identity-linked ones.** Weak: the model cannot tell which props are linked to a secret without being told each secret.
3. **Check in code.** A word-overlap filter drops honest sentences (measured in the design: 11 to 34 of 36 flagged) and is not recommended.
4. **Accept as is and rely on the Child rules and the reviewer.** The culprit result is clean; the added-detail risk is mostly cosmetic with the occasional secret-adjacent prop.

Not run: runs 4 to 7 (about 1.2 USD), Tier 2 (about 0.8 USD).

# Part 3: inverted derivation, runs 4 to 7 and Tier 2 (2026-10-13, same day)

Jonathan approved the recommendation (invert the derivation, re-run Silver, then go on if clean). The final wording is in `design.md` (appendix) and `temp-files/build-parent-v86.py`: `whatAnObserverSees` is the second key of each entry, before `truePosition`; the rule says to write the visible layer first and make `truePosition` begin with it and add what is out of sight; plus rule 1 (no feelings or expressions) and rule 4 (no invented prop). Diff against Parent85 is still pure insertions in modules 3000 and 4020, rule text identical.

## Spend (actual tokens; cost at the assumed 3 and 15 USD per MTok)

| Call | Input | Output | Est. USD |
|---|---|---|---|
| Silver, inverted wording (i1) | 27,912 | 25,335 | 0.464 |
| Blackthorn Manor, module 3000 | 31,992 | 13,005 | 0.291 |
| The Last Slice, module 3000 | 23,393 | 9,445 | 0.212 |
| Murder Under Golden Stars (Swedish), module 3000 | 28,933 | 12,784 | 0.279 |
| The Great S'more Heist (intrigue), module 4020 | 20,187 | 12,630 | 0.250 |
| Tier 2: 4 characters x 3 Child calls | 173,564 | 16,634 | 0.77 |
| **This part** | | | **2.27** |
| **Whole of Phase 4 (parts 1 to 3)** | | | **about 3.90 of 4.5** |

## Silver, inverted wording

- Observer sentences are now exactly the visible prefix of `truePosition` (added-detail 0 of 12 sentences by the script and by reading); no Harry notebook; no feelings; reciprocity breaks 0.
- `truePosition` now states the act (Simone: "The glass already holds the measured dose Felicity passed to her in the crew corridor ..."), so this run exercised the hard case that the earlier replays did not. Simone's observer sentence: "Stands behind Reginald's chair at the head table and hands him a brandy glass from a silver tray." (18 words; Felicity 18; innocents 12 to 23).

## Generality, runs 4 to 7 (one sample each)

| Package | Culprit / accomplice observer sentence | Hidden in `truePosition` only | Notes |
|---|---|---|---|
| Blackthorn Manor (en, accomplice) | Pam: "Walks through the hall carrying a tray and a ring of keys toward the kitchen passage." (16 words) | gave Sheila the vial, sent the forged note | Sheila (unseen) still got a sentence (rule 5 breach, harmless: never passed on) |
| The Last Slice (en, no accomplice) | Morgan: "Stands near the dessert table, holding a phone and looking at the arrangement of the desserts." (16, innocents' max 15) | "slipped the allergen into Sasha's dessert" | seen by 1 |
| Murder Under Golden Stars (sv) | Marcel: "Går ut ur salongen mot korridoren med ett skrädderiverktygsbälte runt midjan." (11, innocents 8 to 13) | goes on to the lounge where Xorg is alone | sentences in Swedish; Swedish word list found nothing |
| The Great S'more Heist (intrigue, module 4020) | Daisy: "Walks along the edge of the clearing near the tree line, pulling a small wheelbarrow with a few flour sacks." (20, innocents' max 19) | takes the spare key, loads the supplies, stages the raccoon trail | seen by 2; 2 unseen entries (Nutmeg, Ruby) also got sentences |

Across the 7 culprit and accomplice sentences of the final wording (Silver 2, Blackthorn 2, Last Slice 1, Swedish 1, S'more 1): **0 act, intent, secrecy or tampering words**, 0 added-detail words, 0 leak flags from the `buildCharacterContext` scan (the 5-word-run scan's earlier false positives on generic phrases did not recur). Two culprit sentences are one word above the innocents' maximum (Last Slice, S'more), one is equal (Silver); the field is present on every entry of all five maps.

Remaining wording defects: (1) rule 5 (empty when nobody can see them) is not always followed: 3 unseen entries across 2 packages carry a sentence; harmless because `buildCharacterContext` only passes entries the viewer is in `canBeSeenBy` of, but the rule is not reliable; (2) the culprit's sentence is not indistinguishable by content: it contains the visible part of the act (hands the victim a glass, pulls a wheelbarrow of sacks), which is exactly the clue a witness needs, so a reader of the 12 sentences could single it out; length and tone are matched; (3) a sentence may name a character the entry looks at who is not in `besideOrNear` (Beatrice and Juliet; three Swedish entries); the rule should say "or already named in truePosition"; (4) reciprocity breaks 3 (Blackthorn), 1, 1, 0, vs 3 in the Parent85 control: noise.

## Tier 2: the Child, with the redacted context and the redacted chat

Contexts from `buildCharacterContext` on the Silver i1 Part 2 (observer field used); chats from `buildCharacterChatSafe` (chat 12,979 characters cut to about 10,700, survivors 0, no strict rerun, no flags). Characters: Marcus Finch, Percival Okafor, Bartholomew Calloway (all three can see Simone in this map; Bartholomew was one of the two Phase 2 chat leakers) and Antonia Rolewicz (the other Phase 2 leaker; cannot see Simone). Harry is not a witness in this sample (he sees only Juliet and Antonia), so the Phase 2 pairing "Marcus and Harry" cannot be reproduced; Marcus can.

**Reported separately, as asked:**

1. **Do the witnesses recover the steward clue? Yes, 3 of 3 witnesses; the non-witness has none.** Marcus: "Simone was the one who put the brandy glass in Reginald's hand at the head table, in full view of everyone." and "You were standing behind Reginald's chair and handed him his glass from the tray." Bartholomew: "You were standing behind Reginald's chair when the brandy was handed round." Percival: "You were standing behind Reginald's chair when the brandy was handed to him." Antonia: no sentence about Simone's position. Caveat: the map is a new Parent sample (Simone behind the chair at the head table, not at the sideboard), so this is the same kind of clue, not the same sentence as in the original; with no stated alibi handed to anyone, the sheets cannot contradict her claim, they can only report what they saw.
2. **Does any sheet leak a secret or the act? None found.** The words dose, pantry, crew corridor and poison do appear, but all come from the public Round 3 and Round 4 evidence items every character receives (the bottle labelled "Measured Dose Only" in the crew corridor bin by the pantry door, the pantry key). No sheet says Simone or Felicity prepared or handed over the dose, that Felicity passed anything to Simone, or that Harry is a journalist (the only "notebook" is the Round 2 evidence page). Phase 2 baseline: 2 of 10 sheets repeated Harry's secret from the chat; here 0 of 4 (including both earlier leakers), with the caveat of n = 4. Mild invented colour remains (Bartholomew: Harry "watched the head table far more closely than a man enjoying his dinner should"; Antonia: Simone "has a way of smiling at the right people and watching the wrong ones"): not secrets, but not in their contexts either.
3. The automatic 6-word-run check against other characters' secrets is useless on its own (it fires on "go to great lengths to keep it hidden", used in every secret); the leak findings above are from reading every sentence that names Simone, Felicity, Harry or a profession.

## Verdict

**Parent86 (final wording) passes the verification as designed: no act, intent or secrecy wording in 7 of 7 culprit and accomplice sentences across five packages, three languages' worth of structure (English, Swedish, the intrigue schema), witnesses recover the clue, 0 of 4 sheets leak.** Limits: one sample per package for runs 4 to 7, one for Silver in the final wording, 4 sheets, no reviewer run, no control arm for the Child, the wording check for Swedish was a short hand-written list, and the intrigue map is only checked at the Part 2 level (`buildCharacterContext` still refuses the intrigue design). Recommended before import: add "or already named in truePosition" to rule 4 and make rule 5 firmer ("write exactly an empty string, not a description"); both are wording-only and I would not re-spend to test them. After import: look at the first detective purchase's map as planned in design.md section 6.
