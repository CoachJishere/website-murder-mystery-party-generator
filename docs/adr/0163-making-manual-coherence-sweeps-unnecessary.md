# ADR-0163: Making manual coherence sweeps unnecessary (miss clustering, ranked owners, exit criteria)

## Status
Accepted 2026-10-14 (Addenda 1 to 8 record what was built: items 1 to 4 and the two paid cross-sheet passes live, items 5 and 6 abandoned; the Stage 1 and Stage 2 exit criteria stay as written and are checked with `select * from sweep_exit_metrics`)

## Date
2026-10-14

## Context
Every new paid package is swept by hand: the full cast is read field by field. The LLM reviewer (ADR-0136/0138) and the detectors catch part of what that finds. Goal (memory: "sweeping becomes unnecessary", North Star order prevent, detect, heal, escalate): turn each hand-found defect into a machinery change, and define when full-cast reads may step down to sampling and then to alert-only.

Ground truth read on 2026-10-14 (all read-only, no paid call, no Make import):

- `package_review_misses`: 128 rows, 16 swept packages (8 slip, 8 detective; the rebuilt Golden Stars package is counted once), 7 categories. The sweeps table and the misses table agree (every miss belongs to a swept package).
- `package_review_findings`: 323 rows since 2026-10-03.
- `review_performance` (recall = real reviewer findings in swept packages / (those + misses)): detective cross_field_contradiction 32 percent, slip cross_field_contradiction 13, slip secret_leak 14, detective other 6, slip other 22, detective pronoun_drift 0 (5 misses, 0 findings), detective secret_leak 62, single_generation_slip 81 to 87, wrong_fact 57 to 81. Precision is 98 to 100 percent everywhere.
- Pooled over the 16 swept packages: 153 real reviewer findings against 128 misses = 54 percent recall. Over the last 8 sweeps: 54 against 72 = 43 percent. Per sweep: 21 to 75 percent, no upward trend (Emma 21, Last Slice 29, Golden Stars 39, Br31 50).
- Reviewer cost: 0.52 USD per package on average (slip 0.522 over 14 runs, detective 0.516 over 18; max 0.95).
- `child_context_redaction` is on; the only swept package generated with Child64 (redaction) is Br31 (`6eb76783`). Child66 was imported 2026-10-14 11:39 and has generated nothing yet. Parent87 was imported 11:44 per `prompt_version_history`.

## Phase 1: clusters by root pattern (every one of the 128 rows assigned once)

The category label is a poor guide: `other` and `cross_field_contradiction` hold six different root patterns. "Unowned" means no shipped prevent/detect/heal/reviewer change targets the pattern; "owned" means one exists but has not yet been proven on a post-change package.

| # | Root pattern | Rows | Pkgs | Det/Slip | Severity | Status |
|---|---|---|---|---|---|---|
| C1 | Slip game: a sheet names or assumes a fixed culprit, accomplice, partner or helper (draw is at the table); includes Dagny clearing Ingrid, the accomplice assuming a male culprit | 21 | 3 (Hedberg, Champagnens, Emma) | 0/21 | high (contradicts the game) | owned: ADR-0103 Add. 82/96, detector `slip_partner_named`, heal, Child56/65 imported. No post-Child65 slip package with an accomplice yet |
| C2 | One character's text states, presumes or points at ANOTHER character's hidden secret, the culprit's role, or the culprit's alibi gap, before the reveal (rumors, questions, finals, Round 3/4); includes the guilty-branch twin of a fixed leak (Pat, 3 rows) | 20 | 9 | 16/4 | high (spoiler) | unowned. Child51 and Parent73 failed three times; ADR-0103 Add. 86 already says move the control to a post-generation check |
| C3 | A character's own public script volunteers what their own secret says to keep buried | 5 | 5 | 3/2 | medium | unowned |
| C4 | A claim about another character that contradicts that character's own sheet, matrix or alibi (rumors, questions, relationships), including matrix omissions (3 sightings: Sheila, Josie, French Vanilla) | 10 | 7 | 8/2 | medium to high | unowned; matrix detector reads contradictions only (code read) |
| C5 | Package-level or same-sheet fact, timing or cue contradiction (body location, favor, announcement order, card cue, invented detail, dangling clue) | 10 | 7 | 7/3 | medium | unowned |
| C6 | Customer requirement or customer-visible fact not carried (renames, climax, secret-identity twist, cut rivalry, whole concept, distinct quirks, pronoun note leaking into the overview, unfilled "choose for yourself") | 11 | 7 | 7/4 | high | owned: ADR-0150/0155 requirements extract, rename heals, delta guard; the extract produced 0 findings on its first real run (Br31) |
| C7 | Gender or pronouns on a they/them or dual-name character (victim or a character), including `iel` and a reveal that names the culprit in one gender only | 8 | 4 | 5/3 | medium | unowned for detective (0 percent recall); reviewer got a "VICTIM GENDER" line on 2026-10-14, unvalidated |
| C8 | Wrong grammatical person or voice (secret or relationships in first/third person, rumors in second person, we/I switch) | 5 | 4 | 3/2 | medium | partly owned (`narration_person_mismatch` covers branch fields only; Child65 we-rule) |
| C9 | Language, label and register (German/English/Spanish labels in Danish/Swedish, vous, formal u, odd idiom, stray accent) | 13 | 4 | 7/6 | medium | owned: Child53/62/63, `label_conformity` heal, scaffold localization. Every one of the 13 rows is from a package generated before 2026-10-13 |
| C10 | Defect introduced or left by a fix (reviewer-applied replacement, stale pointform twin, paid heal that wrote a confession) | 4 | 4 | 2/2 | medium | owned: `pointform_resync` on, +p2 pass; unproven |
| C11 | Stray artefact or structure (stray `}`, `**`, bold-wrapped fields, 4-space indent, missing header, empty pointform, authoring note, unresolved dual victim name, `[CLOSING:]`, own name in own question header) | 10 | 6 | 3/7 | low to medium | mostly owned (gate, heals); the string classes below are not |
| C12 | Garbled phrase (wrong imperative "Share", clipped heading) | 3 | 3 | 2/1 | low | unowned, reviewer only |
| C13 | Repeat of a fact the reviewer already fixed elsewhere in the same package (Flin Flon, photos x2, red ink) | 5 | 3 | 3/2 | medium | broken (see below) |
| C16 | Overview names hidden secrets | 3 | 3 | 1/2 | high | owned: Parent83 (partial hold seen once) |

Unowned: C2, C3, C4, C5, C7, C8, C12, C13 = 66 rows (52 percent). Owned but unproven on a post-change package: C1, C6, C9, C10, C11, C16 = 62 rows.

Cross-cutting overlay: by a text match on the notes, 24 of the 128 rows say outright that the reviewer fixed or flagged the same thing nearby (a sibling or twin). The true share is higher (the Emma accusations alone are 1 caught of 15).

## Hypothesis check

(a) Wrong claims about other characters, price of redaction: NOT supported as a redaction effect. C2+C4 are 24 rows on the 8 detective packages = 3.0 per package. Pre-redaction Last Thanksgiving had 5 of 8 in these two clusters; redaction-on Br31 had 3 of 6. n = 1 redaction package. The structural cause is that the per-item reviewer sees one sheet plus the master, never the target's sheet. Confirm with the next 3 detective packages on Child66 against the 3.0 baseline.
(b) Sibling propagation: CONFIRMED, and the cause is in code. `anchorsFrom` (review-core.ts:455) anchors only on multi-word capitalised names and large numbers; "red ink", "photos laid in the drawer" and "the sideboard" yield no anchor, so the pass returns early. `PROPAGATION_CATEGORIES` is only wrong_fact and cross_field_contradiction, so secret_leak (Pat x3, Gus x2, Tom, Camillo), language_slip (Zur Person) and pronoun_drift (38 sentences) never propagate. Result: 0 of 323 findings carry "Same wrong fact elsewhere" since ADR-0140 went live 2026-10-04 (the 4 text hits for "elsewhere" are unrelated), with at least 2 clear opportunities (Compleet photos, Br31 red ink).
(c) A character's own pronouns in point-form, relationships, finals: CONFIRMED for 4 of 8 C7 rows (Robin point-form, Morgan point-form, Cotton Candy final, Butterscotch relationships); the reviewer does not read point-form and no detector reads gender.
(d) Matrix omissions: CONFIRMED in code; 3 sightings in 16 swept packages. The 2026-10-04 corpus check called list-vs-matrix mismatch a corpus norm, so any omission check has a high base rate and must be an open finding, not a gate.
(e) Innocents pointing at the murderer: part of C2 (Lucien, Vivienne, Camillo, Christoph, Felix P., Magda). Prompt rewording failed three times.
(f) Abstract secrets: only 2 rows recorded (Marcus, Jessica) although sweeps (Br31) mention more left as found. The misses table undercounts "left as found" items. Parent87 built and imported; first detective purchase after it is the test.
(g) Language and label classes: all 13 rows pre-date Child62/63, the label heal and scaffold localization. Expect near zero; no new work, verify on the next non-English orders.
(h) Rumors contradicting the target's alibi position: C4 (Last Thanksgiving Clara/Edmund, Perry/Seraphina; Golden Stars rumors about the office). Same owner as C4.

## Phase 1 ranked proposals (cheapest layer first, free items first)

| Rank | Item | Clusters | Layer | Cost | What confirms it |
|---|---|---|---|---|---|
| 1 | Measurement hygiene: add `severity`, `layer_owner`, `would_machinery_catch` to `package_review_misses`; add `sweep_started_at` and `reviewer_ran_before_edit` to `package_review_sweeps`; normalise `found_by` (3 spellings); backfill the 128 rows; record "left as found" items | all | n/a (prerequisite) | 0 USD, additive migration | Exit criteria 2 and 5 below become queries. Today they cannot be computed |
| 2 | Deterministic twin search plus wider propagation: for every finding of any class, search all other fields (including `*_pointform`, `secrets` jsonb) for the quote's distinctive words, not only capitalised names; heal exact repeats, open a finding for near repeats; extend to secret_leak, pronoun_drift, language_slip | C13, part of C2, C7, C9, C10 | heal, then detect | 0 USD | Replay on the 16 swept packages: how many of the 24 sibling rows the search would have found, and its false positives on 20 clean packages |
| 3 | Matrix omission check (Friendly pair both ways but not listed as ally; Hostile pair not listed as rival) as an open finding | C4 subset | detect | 0 USD | Corpus count on all packages first; precision on the 3 labelled rows |
| 4 | String-level artefact detectors, alert-only first: unbalanced `**`, stray `}`/`{`, paragraphs indented 4+ spaces, combining marks (U+0301), whole-field bold wrap, authoring-note phrasing | C11 | detect, then free strip heal | 0 USD | The 6 labelled rows plus 20 clean packages; promote to heal only where the strip is unambiguous |
| 5 | Neutral-pronoun detector: for a character or victim written they/them or `X/Y`, flag gendered pronouns within N words of that name in any sheet, EN/FR/ES/DE first, alert-only | C7 | detect | 0 USD | The 8 labelled rows (5 detective, 0 percent reviewer recall today) |
| 6 | Cross-sheet claim index (deterministic): for each cast name X, list every rumor, question and relationship line elsewhere that mentions X next to words found in X's secret or alibi, as candidates for a human or a later paid pass. Honest expectation: moderate recall, noisy | C2, C3, C4 | detect | 0 USD to build | Test on the 35 labelled C2+C3+C4 rows before any code is kept; drop it if recall is under 30 percent |
| 7 | Reviewer prompt text: read point-form; check own-script-vs-own-secret; check claims about another character against that character's sheet | C3, C4, C7, C12 | reviewer | text is free, validating it needs paid review runs (needs a yes) | Before/after recall on labelled packages |
| 8 | Paid cross-sheet reviewer pass (see Phase 2) | C2, C3, C4, C5 | reviewer | about 0.3 to 0.5 USD per package (estimate) | A 3-package probe, about 1.2 to 1.5 USD, needs a yes |

## Phase 2: exit criteria (proposed)

A sweep counts toward these only if it is valid: the reviewer (including the +p2 pass) ran before the first hand edit. Criterion 5 makes that a column instead of a note.

Stage 0 (now): full-cast read of every package.

Step to Stage 1 (sampled read: 4 characters, detective script, evidence cards, every open finding and detector hit, plus a 1-in-3 full read) when, over the last 8 valid sweeps, all hold:
1. Pooled recall of reviewer plus detectors against hand-found defects is at least 85 percent in each style (today 54 pooled, 43 over the last 8; per style see above). Query: real findings / (real + misses) per style over the last 8 sweeps.
2. No miss with severity high that no layer caught (needs rank-1 column; today a proxy is C1+C2+C6+C16, which has 55 rows).
3. No category with at least 10 observations (findings + misses) below 70 percent recall (today fails: cross_field_contradiction, secret_leak slip, other, detective pronoun_drift).
4. Median misses per package at most 3 (today 6 over the last 8; mean 9).
5. Every cluster above has a shipped owner and 3 consecutive post-ship packages with zero new rows in that cluster (C1, C6, C9, C10, C11, C16 are waiting on this; C2, C3, C4, C5, C7, C8, C12, C13 have no owner).

Step to Stage 2 (alert-only: no routine read, a 1-in-5 random full read kept as an audit) when over the last 15 valid sweeps: recall at least 90 percent per style, zero high-severity uncaught misses, median misses per package at most 1, and the 1-in-5 audit finds nothing the machinery missed for 10 consecutive audited packages. Any high-severity miss at Stage 1 or 2 returns to the previous stage.

Also track the reverse: real defects the reviewer found that the hand read missed (Feast 4, Silver, Br31). The hand sweep is not ground truth either, so recall is "against the hand sweep", and the audit step is what bounds that.

Metrics computable today: 1 (recall per style, last N), 3, 4. Not computable today without rank 1: 2 (no severity), 5 (no cluster or owner column, no valid-sweep flag).

## Phase 2: paid cross-sheet reviewer pass, case for and against

Declined in ADR-0103 Addendum 56 (2026-09-26) because the gap looked like sampling, not capability, at an estimate of 0.10 to 0.50 USD per package. The full-cast read closed the sampling gap but moved the cost to hand time, and the new evidence is recall: cross_field_contradiction 13 percent (slip) and 32 percent (detective), secret_leak slip 14 percent, with C2+C3+C4 = 35 rows (27 percent of all misses, the highest severity). The structural reason is concrete: the per-item call never sees the target's sheet.

Estimate (not measured): one call per cast member containing that member's own sheet plus every line elsewhere that mentions them (rumors, questions, relationships, accusations, finals), without the large master prefix. For 12 characters that is roughly the same input volume as the current review, so about 0.3 to 0.5 USD per package, i.e. 0.8 to 1.0 USD total with the existing 0.52. At about 1.3 paid packages per day (16 swept in 12 days) that is roughly 0.4 to 0.7 USD per day, 12 to 20 USD per month.

For: it targets exactly the clusters no free layer can read semantically; precision of the reviewer is 98 to 100 percent so the output is low-noise; it would need to remove only about 10 hand-found defects per package to pay for itself in hand time.
Against: it is paid and recurring; the free items 2 to 6 may remove a third of the same misses first; recall of an LLM on "contradicts another sheet" is unmeasured; and more findings raise the auto-apply risk (3 of the 128 misses are defects the reviewer's own fix introduced).

Recommendation: do the free items first, then run a one-off probe of the pass on 3 already-swept packages with labelled misses (about 1.2 to 1.5 USD, needs Jonathan's explicit yes) and decide on measured recall. Do not turn it on by default before that.

## Decision
Resolved 2026-10-14: Jonathan chose to proceed in the recommended order. Items 1 to 4 built, item 5 abandoned, item 6 dropped, items 7 and 8 found to exist already (ADR-0152) and switched on; see Addenda 1 to 9.

## Discussion
- Clustering by root pattern rather than by category merged the 20 "other"/"cross_field"/"secret_leak" rows that are really one defect (a sheet speaking about someone else's hidden facts) and split `cross_field_contradiction`, which mixed slip-draw conflicts (21 rows, one cause, already fixed upstream) with real cross-sheet contradictions.
- The redaction hypothesis was tested against the only data available and not supported; it is kept as a watch item for the next three detective packages rather than argued from one sample.
- The propagation finding is the highest-leverage discovery: a shipped, switched-on feature that has never produced a finding. Per the standing "cheap and deterministic" rule it should be fixed deterministically, not with another LLM call.
- Severity is not stored, so the stop criterion Jonathan asked for ("zero high-severity misses nothing caught") cannot be computed. That is why measurement hygiene is ranked first even though it prevents no defect by itself.

## Alternatives considered
- Declare an exit threshold on total reviewer findings per package: rejected, the reviewer finding counts vary 2 to 32 for reasons unrelated to quality (Golden Stars 14 on a broken package, Last Slice 2 on a clean one).
- Build a gate for every cluster: rejected for C4/C5 (high base rate, semantic); open findings and alerts only.

## Consequences
As proposed, nothing changed in production from the analysis itself; the later work changed production (Addenda 1 to 9: new columns and view, three read-only functions, two paid reviewer passes switched on, review-package-quality v34, hand edits to 10 delivered character rows). Phase 3 items will each need their own tests, a corpus check against the labelled misses and 20 clean packages, alert-only first, and ADR/CHANGELOG/vault entries.

## Key files
`supabase/functions/review-package-quality/review-core.ts` (anchorsFrom 455, PROPAGATION_CATEGORIES 451), `index.ts` (propagate 326), `package_relationship_matrix_contradiction()` (SQL), `docs/autonomy-scoreboard.md`, ADR-0103 Addenda 56/82/86/96/100, ADR-0136/0138/0140/0150/0155/0162.

## Addendum 1 (2026-10-14): item 1 built, measurement hygiene (migration `20261014140000_sweep_miss_measurement.sql`, applied live)

Jonathan chose to proceed in the recommended order. Item 1 shipped, free, additive only:

- `package_review_misses` gained `cluster` (C1..C16), `severity` (high/medium/low) and `layer_owner` (prevent/detect/heal/reviewer/none), all 128 rows backfilled (0 unset). Severity is the cluster default with row overrides (for example the debatable "presumes" questions are low, the paid-heal confession in a final statement is high); it is my judgment and Jonathan can re-rate any row. `found_by` normalised to `hand_sweep` (3 spellings before).
- `package_review_sweeps` gained `reviewer_ran_before_edit` (true on all 16, each sweep note states the reviewer ran first) and `sweep_started_at` (null; new sweeps set it).
- New view `sweep_exit_metrics`: last 8 valid sweeps per style plus both together. On the day it was created: all 53 percent recall (146 real findings, 128 misses), slip 57, detective 50; median misses per package 7.5 (slip 8.0, detective 6.5); 45 high-severity misses (slip 27, detective 18); 0 unrated.
- The view counts only `human_verdict = 'real'`, the same as `review_performance`. The 54 percent in the Context section also counted debatable findings; the view is the canonical number from now on.
- The earlier "proxy of 55 high-severity rows" in criterion 2 is replaced by the real count, 45. All five Stage 1 criteria now have a query except criterion 5 (cluster owner shipped plus 3 clean packages), which needs the per-cluster post-ship check once owners ship; `layer_owner` is the column to update when one does.
- Sweep protocol changed in CLAUDE.md step 7c: every new miss row carries `cluster`, `severity`, `layer_owner`; every sweep row sets `reviewer_ran_before_edit`.

## Addendum 2 (2026-10-14): item 2 built, `list_review_twin_candidates(package_id)`; useful as a sweep aid, NOT an alert and NOT a heal

Migration `20261014150000_review_twin_candidates.sql` (applied live; final state is the trigram version, `create or replace`, read-only SQL, no LLM). For every reviewer finding (any class, not `false`, not REQUIREMENTS) it lists the other fields of the same package (character fields, their `_pointform` twins, overview, detective script, materials, evidence cards) that repeat a three-word phrase of the flagged quote, with a package-local rarity filter (the phrase is in at most 4 fields, at least two content words, not three cast-name tokens). `exact_repeat` marks a whole-quote verbatim repeat; a `twin_field` ending in `_pointform` is the stale-summary kind.

What was tried and measured, so the next person does not repeat it:
- **Bigram version (built first, discarded).** Replay against the 128 labelled misses found 23 hits, about 18 genuine; but on live packages it produced 4 to 80 candidates per package and, read by hand on 33 rows from three unswept packages, about 40 percent were relevant (generic phrases such as "nothing about", "the world", "een handjevol"). A rare-word requirement cut the volume to 1 to 13 per package but still left about 20 percent relevant outside the pointform twins.
- **Trigram version (shipped).** Replay against the labelled misses: 13 hits (rows for Flin Flon x2, "sideboard", Daan/Anna, "die foto's destijds", "ruined red ink", the Pat guilty twins, and the three reviewer-fix side effects), all genuine siblings, no noise among them; that is 13 of 128 misses (10 percent) and 10 of the 24 rows whose notes say "same as something the reviewer fixed". It misses the paraphrased repeats (pronoun drift, label drift such as "Zur Person", "flour sacks" in a different construction). On the 24 live packages with findings it returns 1 to 30 candidates (median 8; 3 to 7 of them pointform twins). Read in full on The Night The Storm Hit (23 non-pointform rows): about 13 relevant (the same presumption repeated in three more question lists, the same contradicted detail, a second tip with the same flagged sentence), about 10 noise (a shared stock phrase, a secret that naturally contains the leaked fact, the overview vs descriptions). So roughly half of the rows are worth a look, measured on one package.
- **Heal for exact repeats: not built.** `exact_repeat` is true for 0 candidates across all 24 packages, so there is no verbatim sibling to heal automatically; a heal would only have guessed at paraphrases.
- **ADR-0140 propagation:** left as is. This function does not replace it for the paid path; it shows the same failure (the reviewer's anchors) is the reason it never fired.

Use: after reading the reviewer's findings for a package and before editing, run `select * from list_review_twin_candidates('<package_id>')` and read the cross-field rows in context (CLAUDE.md step 7b). It is not wired into the release path, the digest or any alert, deliberately: at about 50 percent relevance and about 8 rows per package it would train people to ignore it. If a later run shows precision above 70 percent on 3 more packages with verdicts recorded, promote the cross-field rows with `severity` high findings as parents to an open finding.

Not done and why: no change to `review-package-quality` (a paid-path change that needs paid runs to validate), no `package_review_findings` rows written.

## Addendum 3 (2026-10-14): items 3 and 4 built; the matrix-omission check is NOT worth alerting on, the stray-markup detector found 5 live defects in 5 delivered paid packages

**Item 3, `package_relationship_matrix_omission(package)` (migration `20261014170000_relationship_matrix_omission.sql`, applied live, read-only).** Lists mutual Friendly/Hostile pairs of the matrix that the character's sheet lists as neither ally nor rival, using the same name-matching rules as the contradiction detector (new helper `_rel_best_key`). Result over the 90 packages since 2026-08-26 that have a matrix: 43 (48 percent) have at least one omission, mean 4.1, maximum 94 (the 22-character Emma package); 17 have a contradiction. Six of the 16 swept packages return hits (Lip Sync 8, Golden Stars 4, Emma 94, Last Thanksgiving 5, Vellacourt 3, Hedberg 11) and the hand sweeps flagged none of them, while the three packages whose omission a sweep did flag (Josie/Harry, French Vanilla/Strawberry, Sheila/Shawna) are fixed by hand and now return nothing. By construction the function would have caught all three (recall 3 of 3 on the labelled rows, not re-runnable on live data). Precision as a defect is therefore low: matrix ties missing from the sheets are a corpus norm, as the 2026-10-04 corpus check already said. Decision: keep it as an on-demand sweep aid, do not turn it into an alert, gate, finding or heal. A refinement worth trying later: only count an omission when the sheet's ally or rival section is empty or says "none" while the matrix has a mutual pair (the Josie shape); not built because it needs verdicts on at least 10 live hits first.

**Item 4, `list_stray_markup(package default null, since default now()-60 days)` (migration `20261014180000_stray_markup_detector.sql`, applied live, read-only, alert-only).** Four string checks in guest-facing character and document fields: an odd number of `**` pairs, a stray `{` or `}`, a paragraph indented four spaces or more, a combining accent mark. Replay on the labelled misses: all four patterns match their labelled row (stray closing bold, stray brace, indent, U+0301). Corpus 2026-08-26 to 2026-10-14: 5 hits, all in the odd-bold check, 0 for the other three, and **all 5 are real defects, in paid, delivered packages that were never swept**:
- Love Island Season 8 Reunion (slip, 2026-08-29), Kenzie Annis `final_innocent`: stray closing `**` after the last sentence.
- The Hollingsworth Estate (slip, 2026-09-04), Ghost `round4_questions`: a leaked self-correction inside the question header, "**To Marcus Sinclair — wait, that is myself. To William Gray:'" (a self-directed question that no detector or the reviewer caught).
- Dead On Arrival: The Blackwood (slip, 2026-09-17), Ms. Wendalynne Ros(e) `relationships`: an ally line opened with `**` and never closed.
- Attendance For Dinner (detective, 2026-09-19), Jameson `rumors`: "**About Joel Pineda:' Everyone heard..." (header closed with `:'` instead of `:**`).
- The Night The Storm Hit (detective, 2026-10-01), Desmond Hartley `rumors`: "**About Wren Castellane:' 'Wren was in and out..." (same shape). This package had a reviewer run with 23 findings.
Four of the five are the same shape (a bold label closed with `:'` or never closed), which renders as stray asterisks to the guest. The "first paragraph bold" check was left out: it matched 1120 legitimate bold lines in the same window.

None of the five has been edited; they are customer-visible packages and the edit is Jonathan's call (the fixes are free, exact-match hand edits). Neither function is in the completion gate or any heal. If the stray-markup check stays at 100 percent precision over the next 5 purchases, the next step is a free deterministic heal for the `:'` header shape and a gate check on `odd_bold`.

## Addendum 4 (2026-10-14): item 5 (neutral-pronoun detector) tried and abandoned

Two regex designs were prototyped as `_pronoun_scan(package)` (a gendered pronoun within 30 characters after a character's first name, no sentence break, no capitalised word in between):
- **Per-name consistency** (flag a name that is followed by more than one pronoun class): 37 names flagged in 20 packages created since 2026-10-01, most of them "the majority class plus one stray" (Vincent 18 masculine / 2 feminine, Shania 9 / 1), which is what ordinary prose with a second person in the sentence looks like.
- **Dual-name only** (`X/Y` names): 31 packages since 2026-08-26 with 2 to 68 hits each. Read on Death And Dumplings and Last Thanksgiving, essentially every hit was noise ("Toni/Tony needed the hours she took" - the pronoun is the victim; "Perry has always been kind to her" - the pronoun is the sheet owner; the sheet's own `**Name:** Sebastian Beaumont III` header line). The hand sweeps flagged 1 of these packages' pronouns.
Conclusion: deciding who a pronoun refers to is a reading task, not a pattern. The labelled pronoun rows (C7, 8 rows) stay with the reviewer (it received a "VICTIM GENDER" line and package-language pronoun forms on 2026-10-14, still unvalidated live) and with prevention in the Child prompt (Child54, which did not hold on the first French package). Evidence that would justify revisiting: the next 3 dual-named-victim packages, comparing `pronoun_drift` findings with the hand count.

The prototype function stays in the database because the drop was declined; it is commented as abandoned and recorded in `supabase/migrations/20261014190000_pronoun_scan_prototype_abandoned.sql`. To remove it: `drop function public._pronoun_scan(uuid);`.

## Status after Addenda 1 to 4
Built: item 1 (measurement columns and `sweep_exit_metrics`), item 2 (twin finder, sweep aid), item 3 (matrix omission, sweep aid), item 4 (stray markup, alert-only, 5 of 5 real). Abandoned: item 5. Not started, need a yes: item 6 (cross-sheet claim index, deterministic, expected low recall), item 7 (reviewer prompt text, needs paid validation) and item 8 (paid cross-sheet pass, probe first). The unowned clusters C2, C3, C4, C5, C7, C8 (the semantic ones, 58 of the 66 unowned rows; first written as 55, corrected in Addendum 9) remain with hand sweeps until item 6/7/8 are decided.

## Addendum 5 (2026-10-14): the five stray-markup packages fixed (Jonathan: "yes to five delivered")

Applied through the Supabase MCP as one guarded transaction (every replace had to hit exactly one row; script in `temp-files/stray-markup-fixes-2026-10-14.sql`, gitignored). Verified afterwards: `list_stray_markup(null, '2026-08-26')` returns 0 rows and each edited line reads correctly.
- Love Island Season 8 Reunion, Kenzie Annis `final_innocent`: removed the stray trailing `**`.
- The Hollingsworth Estate, Ghost `round4_questions`: "3. **To Marcus Sinclair - wait, that is myself. To William Gray:' You are known" became "3. **To William Gray:** 'You are known" (the self-correction is gone; the question was always for William Gray).
- Dead On Arrival, Ms. Wendalynne Rose `relationships`: the unclosed bold line "**Mrs. Ivy Sable and I have spoken more honestly..." was merged into Ivy's entry as "We have spoken more honestly...".
- Attendance For Dinner, Jameson To `rumors`, and The Night The Storm Hit, Desmond Hartley `rumors`: the `:'` header closers became `:**`.
No pointform column holds these lines, so none went stale. No customer email was sent; the "package updated" note is Jonathan's call (these five were delivered 2026-08-29 to 2026-10-01 and are unlikely to still be in use).

## Addendum 6 (2026-10-14): items 6 to 8 run - the paid cross-sheet passes already exist (ADR-0152); measured on three unswept packages

**Correction to this ADR.** Items 7 and 8 were proposed as things to build. They are not: ADR-0152 already built both a cross-sheet secret check (`leak-probe.ts`, `mode: leak_probe`, switch `pipeline_settings.review_leak_probe`) and a cross-sheet contradiction check (`fact-check.ts`, `mode: fact_probe`, switch `review_fact_check`), both deployed (review-package-quality v33), both OFF, both wired into the second pass (index.ts lines 182 to 188) and writing open findings only (never auto-applied). The cost estimate in this ADR (0.3 to 0.5 USD per package) was right in size; the "build" part was wrong. Item 7 (reviewer prompt text) is already what these two passes are, so no separate prompt change was made.

**Item 6 (deterministic claim index): dropped before building.** The bar set beforehand was 30 percent recall on the labelled rows. Of the 27 labelled C2/C3/C4 quotes with text, only 8 name a cast member at all, and 5 of those share two or more words with the named character's secret or background: 19 percent at the very best, before any noise. The two ADR-0152 passes retrieve by the same signal and reach more, so they are the better route.

**Paid probe (Jonathan: "just run 6-8"), 0.80 USD in total, nothing stored** (read-only modes, no `write`; the spend is in `auto_remediation_log`). Packages: The Night The Storm Hit (detective, 14), Blackthorn Manor (detective, 11), Murder At Montero Manor (slip, 11), all delivered, unswept, already reviewed. Dry-run estimates first (about 200k input tokens in all). Per package: secret check 0.08 to 0.10 USD, contradiction check 0.13 to 0.24 USD, so about 0.27 USD for both (this ADR estimated 0.3 to 0.5).

11 findings, none of them already among the packages' reviewer findings (0 overlap on item and field). Read against the stored text:
- **Real (6 findings, 4 distinct defects):** Scarlet and Julian give each other as company during the dimming of the lamps while Julian says he drifted around alone (2 findings, Montero); Shane's question puts Marcus at the side door "around the time the cake was being cut" while Marcus's script and four other sheets say before the cake (Storm); Jackie states as fact that Anna and Chain traffic in illicit goods, Anna's hidden core (Blackthorn); Marcus's tips tell him to present identifying Max as Dennis Voss as a neutral service, though nothing in his sheet says he knows (2 findings, Storm).
- **Debatable (4):** Lex's question says Wendy sat "across" the card table where the sheets say beside; Danielle "side by side" with Vivienne in the kitchen while Vivienne cut at the table; Wendy's "the sort of vial Anna's world deals in"; Isabella's tip naming Celeste's shaped readings among the victim's secrets (a guilty-branch tip that may legitimately know).
- **False (1):** Trudy's question that the forged note asks Eleanora to come to the cellar alone: that is the Round 4 evidence card, public in the same round. Cheap prompt fix, not made: give the leak pass the titles and descriptions of evidence cards revealed up to that round as public facts.
So precision (real) 6 of 11, real or debatable 10 of 11, false 1 of 11; 4 genuine, previously unreported defects in 3 delivered packages for 0.80 USD. That is consistent with the ADR-0152 pilots (leak: about half genuine; contradiction: 1 in 3 to 2 in 3). Recall was not measurable here: the three swept packages with labelled misses have been hand-fixed, and the replay-from-snapshot route exists only for Last Thanksgiving (2 of 3 known misses, ADR-0152).

**Decision pending (Jonathan).** Turning both passes on is two reversible settings changes and adds roughly 0.27 USD per package (about 0.5 to 0.8 USD per package in all), inside the shared 10 USD daily cap and with no auto-apply:
`insert into pipeline_settings (key,value) values ('review_leak_probe','on'),('review_fact_check','on') on conflict (key) do update set value=excluded.value;`
Off again: the same with `'off'`. Not done without a yes (standing rule on paid use).

**Phase 2 criteria impact.** The passes target C2, C3, C4 and C5 (about 45 of the 66 unowned rows). If enabled, re-measure per cluster on the next 8 valid sweeps; the exit criteria in this ADR then apply unchanged.

## Addendum 7 (2026-10-14): both cross-sheet passes switched ON; the four real defects fixed

**Decision (Jonathan, "let's turn them both on, just ran the SQL"):** `pipeline_settings.review_leak_probe = 'on'` and `review_fact_check = 'on'` (verified in the table). They run in the second pass (cron every 5 minutes after release), write open findings only (never auto-applied), and share the 10 USD daily cap. Expected extra cost about 0.27 USD per package (measured 0.08 to 0.10 for the secret check, 0.13 to 0.24 for the contradiction check). Kill switch: set either value to `off`.

**Fixes (Jonathan: "fix the 4 real defects if they are packages within the last 90 days"; all four packages are 2 to 12 days old).** One guarded transaction through the Supabase MCP, every replace asserted to hit exactly one row, pointform twins in step, verified by reading the text back and `list_stray_markup` = 0:
- Murder At Montero Manor, Julian Blackwood `round4_innocent` and `round4_innocent_pointform`: at the dimming of the lamps Julian now says he and Scarlet stood talking quietly about what Vivienne might announce before he drifted off, matching Scarlet's own account.
- The Night The Storm Hit, Shane Prescott `round3_questions`: the question to Marcus now reads "near the side door for a while tonight" instead of "around the time the cake was being cut" (Marcus and four other sheets place his step outside before the cake).
- Blackthorn Manor, Jackie Winthrop `round3_script` and pointform: dropped the statement that Anna and Chain move goods no honest shop would sell (Anna's hidden trade); Jackie now says the trade that sells a vial like this is one no honest shop would touch.
- The Night The Storm Hit, Marcus Calloway `accusations` and pointform: the tips no longer presume Marcus knows Max is Dennis Voss or has a false identity; they keep steering at Max's needling about the Della Voss case, and "if fake IDs ever come up" present Marcus's own expertise (he is a forger) as a neutral service.
Left as found: the four debatable findings (Lex/Wendy seating, Danielle/Vivienne kitchen, Wendy's vial remark, Isabella's tip) and the false positive (the forged note is public Round 4 evidence). No customer email sent.

**To watch on the first real orders (delete once seen working):** the second pass should write `package_reviews` rows with `prompt_version` ending `+leak` and `+fact` and open `secret_leak` / `cross_field_contradiction` findings; record a `human_verdict` on each (precision so far: 6 real, 4 debatable, 1 false of 11); check `auto_remediation_log` shows `leak_probe:` and `fact_probe:` spend rows of about 0.1 to 0.25 USD; the evidence-card false-positive shape (a question about a card revealed in the same round) is the first thing to look for; do not mark a package swept for recall if those findings were applied before your read.

## Addendum 8 (2026-10-14): the evidence-card false positive fixed (review-package-quality v34); `_pronoun_scan` is gone

**Evidence-card false positive (Jonathan: "if you reco ... lets do that too").** The secret pass reported Trudy's Round 4 question "The forged note asks Eleanora to come to the cellar alone" as a leak of Pam's secret, though the forged note is a Round 4 evidence card shown to every guest. Fix in `leak-probe.ts`: `parseEvidenceCards` reads the stored `evidence_cards` text in any language (a `## ...` heading ending in the round number starts a card, `###` is the title, only the first `####` section, the description, is kept, never the host-only significance), `leakCandidates` attaches the cards, `leakPromptText` adds a PUBLIC EVIDENCE block (round, title, description, at most 700 characters each), and `LEAK_INSTRUCTIONS` says a sentence from a round-N field (finals and confessions count as round 4) may restate any card of round N or earlier and that this is never a leak, while a sentence that goes beyond the card or relies on a later round's card is judged as before. Non-string `evidence_cards` (1 of 53 recent detective packages is an array) or an unparsable value gives no cards, i.e. the old behaviour. Checked free first: all 52 string-valued `evidence_cards` created since 2026-09-15 have a round heading ending in 2 to 4 (English plus Danish, German, Dutch, Portuguese, Spanish, French, Italian headings), a `###` title and `####` sections. 4 new tests in `leak-probe.test.mjs`; `npm run test:reviewer` passes. Deployed with the CLI (`supabase functions deploy review-package-quality --use-api`), v33 to v34, `verify_jwt` still true.

Validation (paid, 0.0925 USD, one run, Blackthorn Manor, the package where it happened): the secret pass went from 3 findings (Jackie's line about Anna, Wendy's vial remark, Trudy's forged-note question) to 1 (Wendy's vial remark, rated debatable). Jackie's line is gone because it was fixed by hand in Addendum 7, Trudy's question is gone because of this change. Not shown by one run: recall on a leak that restates a LATER round's card. Cumulative spend of this session's paid probes: 0.89 USD (0.80 + 0.09), inside the 3 USD budget.

`_pronoun_scan` (Addendum 4) was dropped by Jonathan; verified absent from `pg_proc`. Its migration file `20261014190000_pronoun_scan_prototype_abandoned.sql` stays in the repo as history and would re-create the function if the migrations were ever replayed; do not replay it.

## Addendum 9 (2026-10-14): independent eval of this ADR, and what it fixed

A fresh-conversation eval re-derived every claim from git, the database, the deployed function and the vault. Verdict: numbers, spend (0.8932 USD), deploy (v34, files byte-identical to the repo) and the nine edited customer rows all hold. Fixed afterwards (Jonathan: "lets go with fixes"):

- **Wrong figure:** "55 of the 66 unowned rows" for C2, C3, C4, C5, C7, C8 is 58 (20+5+10+10+8+5). Corrected in the status paragraph. The "about 45 of 66" for C2 to C5 in Addendum 6 was right.
- **Stale sections:** Decision (was "Pending") and Consequences (said nothing changes in production) now say what happened.
- **Stale owners and severity in `package_review_misses`:** three C8 rows (Haggerton secret, Shawna secret, Garth/Trishkers confession "we" then "I") now `layer_owner = prevent`, because Child67 (second-person secrets and relationships, imported 2026-10-14 13:10 UTC) and Child65 (first-person plural) ship the prevention, and `list_packages_with_sheet_wrong_person` detects it; owned but unproven, like C1/C6/C9. The Golden Stars shared-"darling" row (customer asked for distinct quirks) is now `high`, as the severity rule says. `sweep_exit_metrics` after the change: high-severity misses 46 (slip 27, detective 19); recall and medians unchanged (53 percent, 7.5). The 45 in Addendum 1 is the figure at creation.
- **Twin finder precision:** "about half relevant" rested on one package (Storm, 13 of 23). Eval read 32 non-pointform rows on four other packages (Last Thanksgiving, Montero, Roslyn's Clay, Golden Stars): 9 relevant, about 28 percent; pooled with Storm 22 of 55, 40 percent. Noise: generic phrases ("earlier in the evening"), the same text under `secret` and `secrets` on the twin target (3 of 32), legitimate guilty-branch twins. CLAUDE.md step 7b now says "roughly 30 to 55 percent". Not changed in code (still a sweep aid, not an alert).
- **Missed twin, fixed:** Blackthorn Manor, Jacqueline "Jackie" Winthrop `round3_questions` #2 still presumed Anna's hidden poison trade ("The vial came from the underground trade ... people like you ... have you sold anything"), the same defect Addendum 7 fixed in `round3_script`. It now reads "You were seen near the back stairs in white. Did you notice anyone carrying a bottle or vial through the back hall, and did anyone speak to you there?" (no pointform column for questions; one row, guarded update).
- **Unreported real hit, fixed:** `list_stray_markup()` with its default 60-day window returned The Birthday Betrayal (2026-08-19), Quinn/Quincy Lee `final_statement`, a stray `"} ` after the last sentence (the dangling-quote shape). Removed; the function now returns nothing for that package. The check in Addendum 3 used the window from 2026-08-26 and missed it. Older hits outside any window were only listed, not changed: JSON dumps in BEFORE THE NIKAH relationships (April), Death At The Deadwood Saloon accusations (April), two odd-bold question lines in Death At Hollowcrest Manor, one in Death In The Cards; the IMG.LY code snippet is a deliberate false positive. Precision outside the window: 1 false positive in 19 hits.
- **Documentation:** CLAUDE.md said the two cross-sheet passes were OFF and that auto-apply was OFF; both corrected. The stray-markup migration comment said 4 odd-bold hits; 5 is right.

**Left as found, with the reason:**
- Julian Blackwood's `round4_guilty` and `round4_accomplice` still say he drifted around the rooms at the dimming, which Scarlet's account contradicts. A guilty player may lie to deflect, so this is probably by design; only the innocent branch was a defect. Revisit if a hand sweep reads it as a leak.
- **Latent risk, not fixed (code change plus a paid redeploy):** the fact pass writes open findings of category `cross_field_contradiction`, which is in `review_auto_apply_classes`. `applyOpenFindings` applies any open finding of those classes with no filter on its source. Today they are not applied only because the second pass applies before the probes run, once per package. The manual `apply_open` mode or a forced second pass would apply them. "Open findings only, never auto-applied" is therefore true by call order, not enforced. Proposed fix: skip findings whose review `prompt_version` ends in `+fact` or `+leak` in `applyOpenFindings`, plus a test. Needs Jonathan's go (deploy).
- `review_leak_probe`: its `updated_at` (2026-10-13 05:09) predates the switch-on SQL, so it is unknown whether the row was already `on` earlier; no `+leak` review row exists before today, so no earlier spend came from the second pass.
- Not built from the rank-1 proposal and not said so in Addendum 1: a `would_machinery_catch` column and recording of "left as found" items. Criterion 5 (3 clean post-ship packages per cluster) stays uncomputable: `layer_owner` has no ship date and nothing counts packages after a ship.
- No saved before-text exists for the Addendum 7 edits (no script was kept); the original wording is only in the prose of Addendum 6 and 7.
