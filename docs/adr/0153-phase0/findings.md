# ADR-0153 Phase 0 findings: is the prompt "accretion" hypothesis true?

**Date:** 2026-10-13. **Scope:** read-only analysis of the Parent84 and Child62 blueprints, the 142 saved Parent and Child blueprint versions (81 Parent, versions 2 to 84; 61 Child, versions 1 to 62), `package_review_findings`, `auto_remediation_log` and the SQL detectors. No paid call, no database write, no blueprint or prompt change.

## Verdict: HYPOTHESIS UNSUPPORTED

The data does not show that failures follow rule position, rule count or prompt length. Two direct tests of the mechanism are negative, the length comparison flips sign depending on the category counted, and one narrower pattern is real but is a different problem (a later instruction contradicting an earlier one). Phase 1 to 3 as written are not justified by this evidence. "Unsupported" is not "disproved": Phase 0 can only look for patterns in existing data, and a causal test (does adding rule N weaken rule M) needs a paid A/B run, which I did not do.

## The three numbers

| Question | Number |
|---|---|
| (a) Rules with a deterministic detector or heal | **77 of 684 rule rows (11.3%)**; 21 of 354 unique rules (5.9%). With partial or advisory coverage added: 163 rows (23.8%). Reviewer-only: 77 rows (11.3%). No check at all: 444 rows (64.9%). |
| (b) Where the failing rule sits | **Closing arrest rule: position 2 of 20 from the end, unchanged since Parent71 (it failed there and in Parent73).** Dangling quote: the rule appears at position 16 to 18 of 27 to 29 (before the 83,000-character data block) and again at 3 to 7 from the end, and still fails on 13 of 36 packages (36%). Materials language: a 2,687-character prompt, rule last. No positional pattern across the 7 classes. |
| (c) Do failures cluster in the longest prompts | **Inconclusive, leaning no.** Spearman rank correlation of prompt length with finding rate across the 8 Child modules is +0.50 for all findings and -0.55 once the two categories that depend on how much the call must cross-check (wrong_fact, secret_leak) are removed. n = 8, 312 findings, 25 packages, 10 days. |

## What was built and how to read it

Prompt text has grown a lot: the 8 Child modules were 28,180 characters in total in Child14 (2026-04-26) and are 199,965 in Child62; the Parent modules (28 including the style copies) went from 191,092 in Parent36 to 270,046 in Parent84. Size is not in dispute; whether size causes failures is the question.

`rule-registry.csv`: 1,300 rows over 25 modules (17 Parent, 8 Child). Row kinds: 633 `rule`, 26 `schema-embedded`, 25 `language_instruction` (these 684 are the directive-bearing rows used in every percentage below), 533 `spec` (template lines such as "[1 paragraph ...]"), 42 data blocks, 25 role lines, 16 schema blocks. Columns beyond the ones requested: `kind`, `coverage_strength` (detector+heal, detector, partial, advisory-detector, llm-reviewer-only, none), `rewrites`, `emphatic_markers`, `emphatic_markers_after`, `char_offset_from_end`, `module_chars`, `before_data_block`, `est_runtime_chars_from_end`.

Things that differ from the kickoff and that the reader should know:

- **R0 to R3 are not retry copies.** They are the four style routes (R0 detective murder, R1 slip murder, R2 detective intrigue, R3 slip intrigue). Game Overview, Themed Materials and Evidence Cards are identical across the four apart from module references, so only R0 is registered. Detective/Investigator Script (4 variants, 12 to 40 differing lines, by design) and Image Prompts R1 (an older copy, see candidate 1) are registered too. That is 17 Parent modules, not 13.
- **Discrete rule** = a top-level bullet, numbered item or standalone instruction line inside a rule section. "Directive-bearing" = contains an emphatic word or an imperative verb from a short list; this is a heuristic and over-counts a little (Parent planning lists such as "Include: ..." count).
- **Emphatic** = case-sensitive CRITICAL, MUST, NEVER, ALWAYS, Do not, Do NOT, NO, ONLY, FORBIDDEN, mandatory. ADR-0153's own count used a slightly narrower list (so 405 shows 44 here against about 30 there).
- **Origin and rewrites** come from comparing every rule with all 142 saved blueprint versions using 4-word-shingle overlap of at least 0.5. The first version where a similar rule appears is the origin; the number of distinct wordings seen is `rewrites`. Heuristic: a rule rewritten past recognition looks like a new rule.
- **Coverage mapping is hand-written** (24 mapping rules in `tools/reg2.py`, each pinned to a section, a module family and, where needed, a module name). I read the bodies of the detectors it names (meta_text_leak, dangling_quote_mark, missing_branch_header, reveal_name_fusion, slip_reveal_names_cast_member, materials_language_mismatch, confession_names_cast_member, completion_blocking_defects) and wrote the scope into the `covered_by_detector_or_heal` text, so "covered" says what the check really covers (for example, dangling-quote detection covers 5 fields only; the identity detector covers kinship terms only).
- **Dashes** in quoted prompt text were replaced by hyphens in the CSV (no em dashes in anything written).
- Runtime position: the prompts contain `{{...}}` placeholders. At run time the master_context (about 61,000 characters on average for the reviewed packages) and the conversation (about 21,000) are inserted, so a rule that sits before the data block is about 80,000 characters further from the end than its static offset says. `est_runtime_chars_from_end` adds estimates (83,000 for Child, 62,000 for the Parent script modules). They are averages, not measurements.

## (a) Coverage

Over 684 directive-bearing rows:

| Coverage | Rows | Share |
|---|---|---|
| Detector or heal (deterministic) | 77 | 11.3% |
| Partial (the check covers part of what the rule says) | 85 | 12.4% |
| Advisory detector only | 1 | 0.1% |
| LLM reviewer only (paid, auto-apply for some classes) | 77 | 11.3% |
| Nothing | 444 | 64.9% |

By blueprint: Child 62 has 58 of 218 rows (26.6%) under a deterministic check, 56 partial, 61 reviewer-only, 43 with none. Parent 84 has 19 of 466 (4.1%), because most Parent rules are planning specifications for the master document ("distribute motives", "name 2 to 3 other characters who could have left the same evidence") and no machine can check those cheaply. Among the 309 rows with an emphatic marker: 51 deterministic (16.5%), 63 partial, 29 reviewer-only, 166 none (53.7%).

Duplication: the 684 rows collapse to 354 unique rules. 229,550 of the 286,238 characters of directive text sit in rules pasted into more than one module; each unique rule once would be 103,906. This is a maintenance fact, not a quality fact: every call sees each rule once, so pasting does not make a model weigh a rule more or less inside one prompt.

**Uncovered or reviewer-only rules that guard defects that have actually occurred** (defect evidence in parentheses):

1. INNOCENT IGNORANCE / SOLUTION NOTES OFF LIMITS, Child (secret_leak: 52 of 312 reviewer findings; 26 of the 93 findings in the detective Round Scripts call; Child49, 50, 51, 58 all reworded it).
2. ONE-NIGHT TIME FRAME, NO INVENTED SPECIFICS, EVIDENCE BY ROUND, POSITIONS AT THE KEY MOMENT, SECRET vs ESTABLISHED MOTIVE (wrong_fact 54 + cross_field_contradiction 26 = 80 findings, 25.6%).
3. VICTIM PRONOUNS (pronoun_drift, 10 findings in 2 packages).
4. LANGUAGE PACK register (tu/vous, du/Sie: pre-pack recurrences in ADR-0103 Addenda 13 and 56; no in-pipeline check, only the offline `lang_audit.py`) and the Parent "Always respond in the same language" line (language_slip 20 findings, 13 packages).
5. The closing arrest rule is only partly covered (name fusion is detected, the victim named in the arrest sentence is not).
6. REAL-WORLD-SENSITIVE HARM THEMES and ACCOMPLICE COHERENCE have no check and no recorded incident.

Reviewer-only categories account for 162 of 312 findings (51.9%). A further 139 (44.6%) are `single_generation_slip` (typos, odd phrasing, one-off glitches) that no prompt rule targets.

**What is not a prompt-rule failure at all:** of 475 `auto_remediation_log` rows in the last 60 days, 239 (50.3%) are `empty_character_content` (129 rows, 39 packages) and `missing_character_row` (110 rows, 29 packages), i.e. Make or webhook failures that leave a character blank or absent, all escalated, none fixed by the worker. The biggest heal volume in the system is not about rules.

## (b) The seven classes: where the failing rule sits

"Position" counts directive rules from the end of the module (1 = last). "Runtime" adds the estimated data block when the rule sits before it.

| Class | Module(s), static size | Rule position and distance | Emphatic markers after it | Later conflicting text | What happened |
|---|---|---|---|---|---|
| Closing arrest line names the victim | Detective/Investigator Script, 9.9k to 10.9k | NAME RULE position 2 of 20; CLOSING PARAGRAPH position 3. The rule was second to last in each saved version Parent71, 72, 73, 74, 76 and 77 (position 2 of 43 unfiltered rows; checked in each file). 660 to 1,150 chars from the end. | 6 to 7 (the final CRITICAL line only) | None found. The rule that failed was the last-but-one the whole time. | Failed as name fusion under Parent71 (Paradis Perdu sweep) and as victim-in-the-arrest-sentence under Parent73 (ADR-0103 Addendum 81); Parent77 changed the wording to a concrete example, not the position. Of 4 non-test detective packages created 2026-10-06, 3 put the victim in the arrest sentence (import hour not recorded, so some may predate Parent77); of 4 created 2026-10-09 to 10-12, none did. n = 4, so "held" is not yet shown. |
| Culprit named by an innocent | Child 405 (27.7k) and 409 (31.6k) | Position 20 of 29; 21.6k to 25.7k static, about 105k to 109k at runtime (before the data block). | 19 (409) to 31 (405) | The solution notes sit in the data block between the rule and the output. | Reworded four times (Child49, 50, 51, 58). secret_leak is 26 of 93 findings in 409 and 3 of 39 in the slip Innocent call 509, where the prompt does not contain the culprit. |
| Dangling quote at the end of a field | all 8 Child modules, 21.4k to 31.6k | Bullet at position 16 to 18 of 27 to 29 (before data, about 99k to 105k runtime); JSON rules 2, 4, 5 at position 3 to 7 from the end. | 0 to 4 after the JSON rules | **Yes.** JSON rule 5 or 6 tells the model to "verify the closing } and the final closing \" on the last field"; the bullet exists to say that this does not mean a literal quote (1,200 characters of disambiguation). | Fixed "at the source" in Child44 (2026-09-25). 13 of 36 paid non-test packages created since then (36%; the log is not filtered for test packages) needed the strip heal. Every field the heal touched (introduction, final_statement, final_innocent, reveal_confession_guilty) is the last field of its call. Caveat: the detector only scans 5 fields, so this partly reflects where it looks. |
| Pointform in the wrong language | not in these prompts | n/a | n/a | n/a | Pointform comes from the edge function `generate-pointform-summaries`, not from a Make prompt. It cannot be placed in this registry. |
| English headers in non-English packages | all Child modules, Parent scripts | `language_instruction` ("translate the headers") is the first block: position 26 to 29 of 26 to 29, about 105k to 115k from the end at runtime. | 21 to 42 | **Yes.** The `output_schema` block at the end shows the headers in literal English ("## ROUND 2: MOTIVES") in all 8 modules. | 6 packages in 60 days. Solved by moving labels into a language pack and a deterministic heal (Child53, ADR-0152), not by rewording. |
| Register drift (tu/vous, du/Sie) | Child coherence bullet; Script `register_consistency` | LANGUAGE PACK bullet position 15 to 17 of 27 to 29 (before data, 98k to 104k); Script rule position 18 of 20 (about 71.6k from the end at runtime). | 9 to 14 | Not found. | Two prompt fixes (Parent70/Child45) before the pack; recurrence after Child53 not measurable here (too few non-English orders). |
| Materials language | Themed Materials, 2,687 chars | Language rule last (position 1 of 5) since Parent84; earlier the only language text was the first line (65k from the end at runtime, 11 emphatic markers after). | 0 | No. | The prompt text was identical from Parent75 (10-04) to Parent83 (10-12). On 10-06 the same module changed from claude-sonnet-5, thinking disabled, max_tokens 1000 to claude-sonnet-5-5, adaptive thinking, max_tokens 8000. The failures (5 of 7 English packages, 10-09 to 10-12) started after that change, with no prompt edit in between. |

Reading the table: two of the six placeable classes fail with the rule in the last quarter of its prompt (closing arrest: position 2 of 20 in a 10.9k prompt; the JSON-rule copy of the quote rule: position 3 to 7 of 26 to 29 in 21k to 32k prompts). Materials failed with its language line first in a tiny prompt and has not yet been observed with the rule last. Two (headers, dangling quote) fail when a later instruction or template contradicts an earlier one. That is a real mechanism, but it is a conflict, and the fix is removing the conflict or moving the check to code, not shortening the prompt or reordering the rules.

**Where do new rules go?** Of the 45 distinct rules added since 2026-08-15 (found by the version comparison), 13 (29%) landed in the last three positions of their module, 17 (38%) in the last quarter, 11 (24%) in the first quarter; the mean relative position is 0.47 (0.5 would be uniform). New Child rules (Child57, Child58) were inserted among the related bullets near the front of the coherence list, not appended. Parent script rules (reveal and closing) are appended near the end. So "we add at the end" is true for the Parent scripts and false for Child.

## (c) Do failing classes cluster in the longest prompts?

Failure measure: `package_review_findings`, which only exists from 2026-10-03 (10 days, 312 findings, 25 packages, 28 reviews; 166 verdicts "real", 1 "false", 14 "debatable", 131 unverified). The 60-day window the kickoff asked for does not exist for the reviewer. The 60-day `auto_remediation_log` is used for class counts. The first 36 paid non-test packages after Child44 and the 20 after 2026-10-03 are the denominators where stated.

Findings per field written, by call (character counts: detective 141 characters in 13 packages, slip 120 in 12, slip with accomplice 80 in 5):

| Call | Prompt chars | Directive rules | Findings | Per field written | of which secret_leak | wrong_fact + cross_field | single_generation_slip |
|---|---|---|---|---|---|---|---|
| 409 detective Round Scripts | 31,602 | 29 | 93 | 0.094 | 26 | 34 | 32 |
| 401 detective Context | 27,897 | 27 | 37 | 0.052 | 5 | 9 | 20 |
| 405 detective Rumors | 27,741 | 29 | 12 | 0.043 | 6 | 3 | 2 |
| 501 slip Context | 25,797 | 27 | 21 | 0.035 | 0 | 6 | 10 |
| 513 slip Guilty | 22,264 | 27 | 28 | 0.047 | 0 | 5 | 20 |
| 509 slip Innocent | 21,683 | 26 | 39 | 0.046 | 3 | 7 | 21 |
| 505 slip Rumors | 21,561 | 26 | 10 | 0.042 | 0 | 2 | 6 |
| 517 slip Accomplice | 21,420 | 27 | 18 | 0.045 | 0 | 2 | 15 |

- Total rate against length: Spearman +0.50 (n = 8; |rho| would need to exceed about 0.71 to be significant). The longest prompt (409) is also the worst, but it is one point.
- Remove secret_leak and wrong_fact/cross_field (categories whose volume depends on how much the call must cross-check against master_context) and the remaining findings per field give rho = -0.55. The single_generation_slip rate per field is 0.017 to 0.037 in seven of the eight calls (detective Rumors is 0.007), with no relation to length (rho -0.23).
- The 409 excess is almost entirely secret_leak and cross-field facts. 409 is the only call that writes alibis, evidence references and timeline statements for all three roles with the solution in view. Slip Innocent (509) has the same rule count (26 to 27) and a similar length to slip Guilty (513) and shows 3 secret_leak findings against 26.
- Across module types the relation reverses: the short Parent modules show higher per-package finding rates than the long Child modules. Game Overview (3,849 chars) 10 findings in 13 detective packages, 9 of them secret_leak (Parent83 targets this); Script (10,876) 13 in 13; Evidence Cards (2,882) 7 in 13; Themed Materials (2,687) 4 in 13, 3 of them language. These are per-package, not per-field, rates and the fields differ in size and task, so they are not comparable to the Child table; they do show that short prompts fail too.

Sample size and what is too thin to conclude: 10 days of reviewer data, 25 packages, 8 modules, 5 packages with an accomplice, 4 detective packages after Parent77, and no non-English package in the verdict-bearing sample large enough to judge the language classes. Findings are the reviewer's, with 42% unverified. I cannot separate prompt length from task difficulty with these numbers.

## Competing explanations the data points to

1. **Instruction conflict, not accumulation.** The two classes where the "later text wins" shape is visible are a rule contradicted by a literal template (headers) and a rule contradicted by a JSON instruction (quotes). Both are removable conflicts.
2. **Solution visibility.** Defects cluster where the generator holds the answer and is told not to use it (detective innocents; the Game Overview built from master_context). The fix class is structural (do not give the call what it must not use), not wording.
3. **Model and configuration changes.** The materials-language failure begins after the 10-06 model and thinking change on a module whose text did not change; Parent79/81 and the `textResponse` read changes (10-07, 10-08) are the other recent variables. One class, one onset date; not proof, but a prompt-accretion story has no edit to point at.
4. **Pipeline failures dominate the logs** (239 of 475 heal rows) and **half of reviewer findings are not tied to any rule** (139 single slips). Neither is touched by consolidating prompts.
5. **Selection effects.** The reviewer runs on every new paid order, but human verdicts, sweeps and "recurred" evidence come from the packages Jonathan sweeps; detector scans only look at fields that have been seen to fail (5 fields for quotes); the heal log started 2026-10-01 for quotes, so earlier incidence is not comparable.

## Candidates found while reading (recorded, not fixed)

1. **Prompt drift between pasted copies.** Image Prompts R1 to R3 (modules 5006, 5010, 5014) are an older copy of R0 (5002): they still carry "CRITICAL: Do NOT use the double-quote character" and lack the Imagen single-subject and legible-text rules that R0 has. Slip and intrigue routes therefore generate image prompts under the older rules.
2. **Wording differences between Child 4xx and 5xx copies** of the same JSON rules ("two apostrophes in a row" against "double apostrophe on a quoted field"; 6 rules against 5).
3. **The dangling-quote conflict** (JSON rule 5 or 6, "verify the final closing quote on the last field", and the 409 schema footer "verify the comma and closing double-quote ... then close the string") sits next to a 1,200-character clarification rule. Removing the quote talk from the JSON rules and the footer is a candidate prompt edit; the strip heal should stay either way.
4. **Detective innocents receive the full master_context including the solution notes**, then a rule asks them to ignore parts of it. A redacted master_context for innocent and rumor calls is a structural candidate (it removes the temptation instead of rewording the ban). Needs its own ADR.
5. **Closing arrest rule**: four 2026-10-09 to 10-12 detective packages passed. If the next 5 to 10 also pass, Parent77's concrete-example wording is the template for rewriting other recurring rules; if not, Addendum 86 already says to move it to a post-generation check.
6. **Registry gap**: 401 of the 444 unchecked rows are Parent planning rules that nobody can check cheaply; Phase 4 ("a new rule needs a registry entry") would only pay off for the Child side and the script and overview modules.

## What would settle the hypothesis

- A paid A/B on one Child call (for example 509) with the same input: the current prompt against the same prompt with 10 of the 27 rules removed and one added at the end, 20 runs each, scored by the existing detectors. Rough scale is 40 calls at about 0.15 USD, so about 6 USD; needs a yes and was not run.
- More reviewer weeks: 60 days of findings with verdicts, per prompt version, so that a rule added in version N can be compared before and after for the rules around it.
- A decision to log the Make prompt version on each package row (today it must be inferred from dates).

## Phase 1 recommendation

None on the strength of this hypothesis. If dedupe is wanted, the case is maintenance: 229,550 characters of directive text exist as pasted copies, and Parent Image Prompts R1 to R3 have already drifted from R0. That is a separate, smaller decision for Jonathan.

## Reproduce

`tools/` holds the scripts (order: `dump.py` to extract prompts, `hist.py` and `build.py` for lineage, `vinfo.py` for version info, `reg2.py` to write the CSV, `stats.py` for the percentages). They read the gitignored blueprints from `temp-files/`, and `dump.py` and the later steps expect to run in one working folder.
