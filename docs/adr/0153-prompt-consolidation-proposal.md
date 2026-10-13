# ADR-0153: Prompt consolidation - stop fixing recurring defects by adding another rule to the end of a prompt (PROPOSED)

**Status:** Proposed (nothing built; Phase 0 is free and can start on a yes)
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

## Key files

`temp-files/MM Live - Parent84 (Materials Language Anchor).blueprint.json`, `temp-files/MM Live - Child (Unified)62-DanishSwedishPack.blueprint.json`, `temp-files/build-child-v57.py` and `build-parent-v75.py` (local, gitignored), `docs/adr/0103-new-purchase-coherence-sweep-ritual.md` (Addenda 81, 86, 91), `docs/autonomy-scoreboard.md`.
