# ADR-0153: Prompt consolidation - stop fixing recurring defects by adding another rule to the end of a prompt (PROPOSED)

**Status:** Closed as a consolidation project 2026-10-13. Phase 0 ran: hypothesis UNSUPPORTED (see "Phase 0 result"); Phases 1 to 4 dropped; two cheap fixes built and two items left open (see "Update 1")
**Date:** 2026-10-13
**Related:** ADR-0103 Addendum 91 (the trigger), ADR-0142 (prompt prevention), ADR-0131 (quality-check machinery), ADR-0151 (Parent83 guards)

## Context

During the sweep of "Murder On The Silver Nightingale" a props list came out in Spanish on an English package, on 5 of 7 English packages in four days. The fix (Parent84) was one more sentence at the end of a prompt. Jonathan's observation: "every time something new comes up we add another signal at the end of the prompt, which supersedes the previous things at the end of the prompt". This ADR scopes whether that is true here, and what to do about it. It does not assume the hypothesis is right.

**What the prompts look like today** (measured 2026-10-13 from `MM Live - Parent84` and `Child (Unified)62`):

| Blueprint | Generating modules | Characters of prompt per run | Largest prompt | Emphatic markers in the largest (CRITICAL, MUST, NEVER, ALWAYS, "Do not", NO) |
|---|---|---|---|---|
| Child (per-character sheets) | 8 (two scenarios x 4 calls; the five-call slip path and the detective path) | about 200,000 | 31,600 (Round Scripts) | 32 |
| Parent, unique modules | 13 | about 270,000 including the R1 to R3 retry copies | 29,300 (Master Doc Part 2) | 20 |

Every Child prompt is 21,000 to 32,000 characters with 25 to 32 emphatic markers; the Master Doc prompts are 24,000 to 29,000 characters with 17 to 20. The small modules are small: Themed Materials 2,700, Game Overview 3,800, Evidence Cards 2,900.

**Duplication inside the prompts.** Make has no includes, so shared rules are pasted into every module: the `<output_hygiene>` paragraph (995 characters) in 13 Parent modules, `<no_chain_of_thought_in_output>` (1,100 to 1,200) in 5 Child modules, `<critical_json_rules>` (1,700) in 3, `<no_markdown_critical>` (550) in 3. Each copy must be edited separately in every release (Parent75 touched 28 blocks, Child57 touched 8 prompts), which is how copies drift.

**How often a prompt fix has had to be redone** (from CLAUDE.md and the ADR-0103 addenda):
- Closing arrest line naming the victim next to the murderer: Parent73, failed (Addendum 81), then Parent77/Child58; ADR-0103 Addendum 86 already says "a fourth failure means move the control to a post-generation check, not another rewording".
- Culprit named by an innocent (Child51): failed on its first purchase, reworded in Child58.
- Dangling quote at the end of a field: "fixed at the source" in blueprint v44, recurred twice (Addendum 90 note), healed by a strip each time.
- Pointform in the wrong language: "has failed to converge 4 times".
- English section headers in non-English packages: 6 packages in 60 days; solved only when moved out of the prompt into a language pack and a deterministic heal (ADR-0135, ADR-0152).
- Register drift (tu/vous, Sie/du): Parent70/Child45, then the language pack in Child53.
- Parent versions since the project began: about 80; roughly 40 of them since August.

The pattern in that list is not "prompts are bad". It is that rules which could be turned into a check or a table (headers, quotes, stage-direction brackets) were solved when they left the prompt, and rules that stayed prompt-only (names near the victim, who knows what) keep recurring.

## What we do not know (and the plan must test)

1. **Whether position or count matters.** The accretion hypothesis (the last rule wins, so earlier rules weaken) is plausible for 25-to-32-marker prompts but is unproven. Evidence for it: repeated rewording of the same rule; failures concentrated in the longest prompts. Evidence against it for the materials bug: that prompt is 2,700 characters and its fault looks like a weak language anchor next to a 68,000-character JSON input.
2. **Whether the model actually weighs emphatic words** differently from plain rules. Unknown for Sonnet 5.5 at medium effort with adaptive thinking; "CRITICAL" repeated 30 times may act as no emphasis at all.
3. **The cost of a measured comparison.** A full package run is paid (the cost per character regeneration is about 0.15 USD; a whole package is more). Any test run needs Jonathan's explicit yes with an estimate; this ADR only proposes a plan.

## Proposal (phases; each ends with a stop-and-look)

**Phase 0 - Evidence, free.** Build a rule registry: one row per rule in the Child and Parent prompts (module, text, the incident that added it, the version that added it, whether a detector or a heal now covers it, how many times the defect has recurred since). Answer with data: (a) what fraction of rules are covered by a detector; (b) for the recurring classes above, where in the prompt the failing rule sits (position from the end, distance to a conflicting rule); (c) do the classes that failed cluster in the longest prompts. If (b) and (c) show nothing, the hypothesis is rejected and Phase 1 onward is not worth doing.

**Phase 1 - Dedupe and shrink, no behaviour change intended.** Generate the shared blocks (hygiene, chain-of-thought, JSON rules) from one source text with a script that rebuilds every module, as `build-child-v57.py` already does for single edits, so a rule changes in one place. Delete rules whose defect is now caught by a detector or heal and has not recurred since (candidates to be listed in Phase 0, with each deletion argued). Keep every other rule verbatim. Success: prompt characters down by a stated percentage; reviewer findings per package and detector hit rates unchanged over the next 5 to 10 purchases.

**Phase 2 - Structure, behaviour change.** Per module: a short ranked "hard rules" block (at most about 8, written once, near the start and restated in one line at the end) and a reference block for everything else; plain wording instead of repeated CRITICAL. Ship one Child scenario first (not all eight modules at once), compare against the Phase 1 baseline.

**Phase 3 - Move, don't reword.** Apply the Addendum 86 rule systematically: any defect that has recurred after two prompt fixes gets a post-generation check or heal (Parent73/77 arrest line, Child51 culprit naming) and its prompt text is removed or reduced to one line.

**Phase 4 - Regression discipline (permanent).** A new prompt rule is only added with (i) the incident, (ii) why a detector or heal is not possible, (iii) an entry in the registry. The sweep checklist asks that question before a new prompt sentence is written.

## Alternatives considered

- **Keep adding rules at the end** (current practice): cheap per fix, proven to work for narrow cases (Parent84 may fix the materials bug). Rejected as the default because the registry will show whether it is eroding the earlier rules; kept as the fallback for one-off fixes.
- **Split modules into more, smaller calls** (Jonathan's offer): reduces prompt size and isolates rules, but multiplies calls, latency (a 17-character package already took 66 minutes), Make operations and token cost, and changes the data flow. Worth it only for the specific modules Phase 0 shows are overloaded (the Child Round Scripts call at 31,600 characters is the first candidate).
- **Rewrite the prompts from scratch**: highest potential gain, highest risk; every current rule exists because of a real defect, and the registry is what tells us which ones can go. Rejected until Phase 0.
- **Move more of the work into code** (more detectors and heals, fewer prompt rules): already the direction of ADR-0131 and 0152; it is Phase 3, not an alternative.

## Consequences

- Phase 0 costs one session and nothing in API spend. Phases 1 to 3 are each a Make blueprint version that Jonathan imports, so each is one import and a few purchases of observation.
- Short term, nothing changes for customers. Long term, fewer repeated defects and prompts that a cold session can read in one sitting.
- Risk: consolidation removes a rule that was quietly holding something up. Mitigation: Phase 1 keeps behaviour-bearing rules verbatim and is judged on the existing baselines (about 13 reviewer findings per English package, ADR-0142; detector hit rates in `docs/autonomy-scoreboard.md`).

## Discussion

Jonathan's question was whether the materials bug showed that the scenario is "too dense". Reading the module showed it is not (2,700 characters, one job), which is the honest reason this ADR does not start from "the prompts are too big". The accretion argument is stronger for the Master Doc and Child prompts, where a rule added in October sits under 20 to 30 earlier emphatic ones. The proposal is deliberately falsifiable: Phase 0 either finds the pattern or stops the project cheaply. The alternative Jonathan offered, splitting prompts into more scenarios, is kept as a targeted tool for the overloaded modules rather than a blanket change.

## Phase 0 result (2026-10-13)

**Verdict: HYPOTHESIS UNSUPPORTED.** Full analysis in `docs/adr/0153-phase0/findings.md`; rule registry in `docs/adr/0153-phase0/rule-registry.csv` (1,300 rows, 25 modules; scripts in `tools/`). Read-only: no paid call, no database write, no blueprint change.

- **Coverage:** 77 of 684 directive rule rows (11.3%) have a deterministic detector or heal; 85 more are partly covered; 77 are reviewer-only; 444 (64.9%) have no check. By unique rule: 21 of 354 (5.9%).
- **Position:** the closing-arrest rule that failed under Parent71 and Parent73 was second to last in every version; the dangling-quote rule exists twice (position 16 to 18 and position 3 to 7 from the end) and still needed the strip heal on 13 of 36 packages since Child44; the materials prompt is 2,687 characters. No positional pattern. New rules added since 2026-08-15 landed in the last 3 positions only 29% of the time (Child rules are inserted among related bullets, not appended).
- **Length:** rank correlation of Child prompt length with findings per field is +0.50 overall and -0.55 without the cross-checking categories (n = 8 calls; reviewer data covers 10 days and 25 packages). Inconclusive, leaning no.
- **What the data points to instead:** (1) a later instruction or literal template contradicting an earlier rule (JSON "verify the closing quote on the last field" against the stray-quote rule; English schema headers against "translate the headers"); (2) calls that hold the solution and are told not to use it (secret_leak 26 of 93 in the detective Round Scripts call, 3 of 39 in the slip Innocent call); (3) a model and thinking change on 2026-10-06 for the materials module with no prompt edit before the failures; (4) half of the heal log is missing or empty character rows, and 44.6% of reviewer findings are single slips no rule targets.
- **Decision:** do not start Phase 1 to 3 on the accretion argument. Recorded candidates (not fixed): Image Prompts R1 to R3 are an older copy of R0; Child 4xx and 5xx JSON rules differ in wording; the quote conflict in the JSON rules and the 409 footer; a redacted master_context for innocent and rumor calls. Phase 4 (registry entry for every new prompt rule) stays a cheap, optional discipline. Dedupe remains available as a pure maintenance decision. A causal test needs a paid A/B (about 6 USD, not run).

## Key files

`temp-files/MM Live - Parent84 (Materials Language Anchor).blueprint.json`, `temp-files/MM Live - Child (Unified)62-DanishSwedishPack.blueprint.json`, `temp-files/build-child-v57.py` and `build-parent-v75.py` (local, gitignored), `docs/adr/0103-new-purchase-coherence-sweep-ritual.md` (Addenda 81, 86, 91), `docs/autonomy-scoreboard.md`.

## Update 1 (2026-10-13): what we do instead, after Phase 0 returned HYPOTHESIS UNSUPPORTED

Jonathan chose to drop Phases 1 to 4 and take only the cheap items Phase 0 surfaced (`docs/adr/0153-phase0/findings.md`, "Candidates found while reading"). Status of the proposal: closed as a consolidation project; the remaining items are tracked below.

1. **Image Prompts R1 to R3 resynced to R0 (done, Parent85, built not imported).** Modules 5006, 5010 and 5014 were an older copy of 5002. Checked every retry family: Game Overview, Themed Materials and Evidence Cards R1 to R3 are identical to R0 after normalising the module references; Detective Script R1 and Investigator Script R3 differ from R0 on purpose (slip routes name no culprit). Only Image Prompts had drifted. Parent85 sets their text to R0's, changing only the three upstream references per route; every other module is byte-identical (the Parent84 file round-trips exactly, so the diff is prompt text and the name).
2. **Quote conflict removed (done, Child63, built not imported).** Four edits in all 8 Child prompts, counts asserted: the "Verify the closing } and (the) final closing \" ..." line in the JSON rules (3 detective, 5 slip) now says "End the response with the closing brace of the JSON object"; the 409 footer no longer asks to verify "the comma and closing double-quote"; and the sentence in NO STRAY QUOTATION MARKS that existed only to explain those lines away is gone. Kept: the first sentence of that rule, JSON rules 2 to 5, and the strip heal. The rule that remains is one instruction about unmatched quotes instead of one instruction plus two that contradict it. Measure after import: `dangling_quote` strip rows per package against 13 of 36 (36 percent).
3. **Redacted `master_context` for detective innocents and rumors (not done).** Needs its own ADR: the generator is handed the solution and told not to use it. Solution-visibility is the best-supported lever in the Phase 0 data.
4. **Prompt version on each package row (not done).** Today the Make prompt version is inferred from dates; logging it would let any later prompt change be compared before and after.

**Decision record.** The accretion hypothesis was tested and not supported on 10 days of reviewer data (n = 8 modules, 312 findings); a causal test needs a paid A/B (about 6 USD) and was declined as not worth it for the expected return. The prompt-rule discipline in Phase 4 (a new rule needs an incident, a reason no detector or heal fits, and a registry entry) is kept as a habit, not a project.

