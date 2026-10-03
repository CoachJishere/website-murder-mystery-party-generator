# ADR-0136: An LLM quality-review pass as the "last mile" of autonomous packages (PROPOSED, not built)

- **Status:** Proposed. Nothing is built and nothing spends money until Jonathan approves the calibration pilot below.
- **Date:** 2026-10-03
- **Related:** [ADR-0103](0103-new-purchase-coherence-sweep-ritual.md) Addenda 56 (declined an LLM judge), 79, 80; [ADR-0131](0131-quality-check-machinery-audit-and-consolidation-proposal.md); North Star "Operating Principle: Autonomous Quality".

## Context

ADR-0103 Addendum 56 (2026-09-26) declined a paid LLM-judge because widening the manual full-cast read closed the gap at no ongoing cost. Jonathan has since stated the goal that no package is swept by hand (time off, electrician training from September 2026), which removes the premise "a human reads everything anyway".

After Addendum 80, what the deterministic machinery can catch or heal is: stray tokens, quotes, tags, backticks, leaked self-corrections, missing headers, empty pointforms, plus the older classes. What remains is **semantic**: on "Boogie Nights, Bloody Nights" about 15 of the 57 hand-fixed fields were contradictions or wrong facts inside fluent prose (a character says she went to Sandro first one paragraph after saying she went to Dusty; two different lengths of service; a character hinting at another's secret; a victim written "they" called "she"). No regex finds those.

## What it would and would not do (the honest answer to "will this reach 100%?")

It should close **most** of the remaining semantic gap, not all of it, and it is not safe to assume it reaches 100% until measured.

- **Strengths:** reading a character against `master_context`, the roster and its own other branches and reporting "field A says X, field B says not-X" is what current models do well, and it is exactly the class that has needed a human reader.
- **Limits:** it is probabilistic. It will miss some real defects (recall below 100%) and will flag some non-defects (precision below 100%). Long contexts weaken recall on subtle items. Unknown unknowns (a defect class nobody has described yet) are invisible to it unless the review prompt is general enough to notice "this reads wrong".
- **"Revise everything" is the risky half.** Letting a model rewrite paid content freely can introduce new inconsistencies. The safe design is judge -> **minimal exact-span fix** -> deterministic validation -> apply, and anything uncertain escalates to Jonathan with a pre-digested summary.
- **So the realistic target is a measured miss rate, not a promise of zero.** A thin human audit (for example one package in five while Jonathan is around) stays as the measurement instrument, and the "missed" column of each audit is the roadmap.

## Proposed design (if approved)

1. New edge function `review-package-quality`, run by the existing auto-remediate worker after every deterministic detector is clean and **before** a package is released (a few minutes of added latency before the ready email; the same hold mechanism as today).
2. Input per call: one character's non-pointform fields + `master_context` (cached prefix) + roster + the victim's pronoun convention. Output: structured findings only: `{character, field, exact_quote, problem_type, severity, suggested_replacement}`. Problem types are the known ones (cross-field contradiction, wrong name/amount/title, innocent hinting at a culprit secret, victim pronoun drift, garbled sentence, English word in non-English text, formal/informal drift) plus "other: reads wrong".
3. Fix application reuses the worker's rails: only an **exact-quote replacement that matches exactly once**, bounded change size, the content-loss guard, **re-run every deterministic detector**, and a second cheap review of only that character. Max 2 loops, then escalate with the findings as the message. Same `auto_remediation_log` audit and per-package / daily caps ($10/day cap already exists).
4. Severity gate: low-severity style notes are logged, never applied or held.
5. Model: Sonnet 5.5 for the pass (best price/quality for structured reading); an Opus tie-break only if the pilot shows a recall gap worth the price.

## Cost (estimate, to be confirmed before any spend)

A 14-character package is roughly 500 KB of text, about 125K tokens, plus about 17K for `master_context`. Two shapes:
- One call per package (about 150K input tokens): roughly 0.5 USD at the 3 USD / million input price assumed in ADR-0135, but weaker recall on long input.
- One call per character with the shared prefix cached (about 14 calls of 26K, prefix cached): roughly 0.5 to 1.2 USD per package including output and one fix loop.

That is about 3 to 6 percent of the 19.99 price per order, and it applies to every order (English included), unlike the language pack. I have not verified current Sonnet 5.5 pricing; confirm before relying on these figures.

## Calibration pilot (needs Jonathan's explicit yes; about 3 to 4 USD one-off)

The decision should rest on data, and we already have labelled data:
- **Recall:** run the per-character review on the **pre-fix snapshot** of "Boogie Nights" (14 characters; ground truth = the 57 hand fixes, of which about 15 are semantic). Report how many of the ~15 it finds, and what it invents.
- **Precision / false-positive rate:** run it on two packages already swept clean by hand (for example "El Último Brindis De Laia" post-fix and one English slip package) and count findings that are not real.
- Pass criteria to propose: recall on the semantic items of at least 70%, and under 1 false finding per package, before any auto-apply is switched on. Until then it could run in **report-only** mode: findings go into the held-package alert so Jonathan's two-minute read replaces a forty-minute sweep.

## Alternatives considered

- **Keep sweeping by hand:** zero cost, does not meet the autonomy goal.
- **More regex detectors for semantic classes:** cheap but cannot express "field A contradicts field B"; Addendum 56 already concluded this.
- **Fix at the source only (prompts):** best where it applies (victim pronouns, headers, register: Child53/54) and should continue, but contradictions between independent Claude calls are structural to the 8-call Child design, so some will always slip through.

## Consequences if accepted

- The sweep ritual changes from "read everything" to "read the review's findings plus a sampled audit".
- A new recurring cost per order, and a new failure mode (the reviewer itself being wrong), bounded by the validation rails and the escalate path.

## Decision needed

Approve or decline the ~3 to 4 USD calibration pilot. Building anything beyond the pilot needs a second decision after the numbers are in.

## Addendum 1 (2026-10-03): what ADR-0137 measured, and what to build into the pilot

Added after Jonathan asked whether this ADR should account for the "calls cannot see each other" finding.

**What was missing from this ADR.** The "Alternatives considered" says contradictions between independent Claude calls "are structural to the 8-call Child design, so some will always slip through". More precisely: the calls already run one after another; they just do not receive each other's output (ADR-0137). That is fixable (Child55 chains background, secret and introduction into the four script-writing calls) and should be tried before paying a reviewer to find what a prompt change prevents. But the measurement below shows it removes only a sliver, which strengthens the case for this ADR rather than weakening it.

**Baseline for the pilot (the 66 hand-edits to "Boogie Nights", from the pre-fix edit list).** 32 missing headers, 8 formatting leaks and 2 missing pointforms (all now self-heal or are detected), 14 victim-pronoun edits (Child54), and **10 semantic edits** that nothing deterministic touches: **6 slips inside a single generation** (a garbled sentence, a character contradicting herself within one field, "a informant", "not short list", "last night" for the same night, a stray paragraph), **3 facts wrong against another character or master_context** (the coat-check instinct called "a bartender's", the owner "behind the bar", one character hinting at another's secret) and **1 same-character, different-call contradiction** (the only one chaining prevents). So a reviewer is the only thing that can catch about 9 of the 10.

**Build into the pilot:**
1. **Tag the ground truth by class** (the three semantic classes above, plus pronouns, register, leaks) and report recall **per class**, not one number. The expected-value question is "does it catch the single-generation slips and the wrong-fact items", which is exactly where nothing else helps.
2. **Run the pilot on a package generated after Child55 (and 53/54) are imported**, or at least report separately what the reviewer finds that chaining would have prevented. Otherwise the pilot partly pays to rediscover defects a prompt change removes. Recall measured on the existing pre-fix snapshots is still valid; only the "how many findings per order" estimate changes.
3. **Give the reviewer the same chained view the author should have had** (background, secret, introduction, innocent scripts of the same character, plus master_context and the roster), since cross-field and cross-character checks are its job.
4. **Count the single-generation slips as their own category.** If they dominate, a cheaper alternative worth pricing is a per-field proofreading pass, or lower temperature on the long calls, before a whole-package reviewer.

## Addendum 2 (2026-10-03): calibration pilot results (Jonathan approved the spend; total 2.61 USD)

**What was run.** A local, report-only per-character review (`docs/adr/0136-pilot/`, code and raw results committed) with `claude-sonnet-5-5`: one structured-output call per character, the package-level prefix (instructions + `master_context` + a roster dossier of every character's description and secret) prompt-cached, the character's full non-pointform text as the variable part, per Addendum 1 items 1 and 3. 54 calls, no refusals, no errors (poisoning-themed mystery text did not trip a safety classifier). Pricing used: 2 USD in / 10 USD out per million tokens, cache reads 0.20 (the API reference table; the 3 / 15 assumed above was too high).

**Runs.**
| Run | Package | Prompt / effort | Chars | Cost | Findings |
|---|---|---|---|---|---|
| 1 | Boogie, **pre-fix snapshot** | v1 / medium | 14 | 0.51 | 66 (32 of the 36 false ones were `low`) |
| 2 | Boogie snapshot | v2 / medium | 14 | 0.49 | 58 |
| 3 | Boogie snapshot | v2 / **high** | 14 | 0.69 | 25 (none `low`) |
| 4 | "A Feast For The Dying" (EN, hand-swept 10-01), **not seen when tuning** | v2 / high | 6 | 0.28 | 6 |
| 5 | "El Último Brindis De Laia" (ES, hand-swept and repaired), **not seen when tuning** | v2 / high | 10 | 0.63 | 15 |

v2 = v1 plus two rules: never list a finding you conclude is acceptable/minor/by design (the model had been listing items its own explanation called "not a defect"), and report `low` only if certain. **v2 was written after reading v1's Boogie output, so Boogie numbers for v2 are optimistic; Feast and Laia are the honest out-of-sample test.**

**Recall on Boogie's ground truth (v2 / high; v1 in brackets).** Single-generation slips **4/6** (3/6); wrong fact vs another character/`master_context` **2/3** (2/3); same-character cross-call **1/1** (1/1); victim pronouns **11/12** (11/12). So **7 of the 10 semantic edits and 18 of 22 semantic+pronoun items**. Missed by v2/high: Honey's garbled description, Pete's stray paragraph under ALLIES, Honey's "a bartender's instinct", Dot's "golden girl". Mechanical leaks were mostly not reported (it was told to ignore them; 1/6), which is fine because detectors and heals own them. Recall is measured on one package, with the prompt tuned on it, so treat 70 to 80 percent as an upper-ish estimate until a second labelled package exists.

**Precision (adjudicated by me, reading every finding against the source text).**
- Boogie v2/high: 25 findings, **0 false alarms**, 1 debatable (an innocent Gio knowing Sandro's secret policy, which other characters also mention in round 2). Beyond the ground truth it found **4 real defects the hand sweep missed**: Toni "paid to dance" (Toni is a singer), Gio "the poison worked its way through the dancing and the drink", Vera "bankrolling the place" (she bankrolled Dusty), Francesca contradicting herself inside one field ("stepped away from the booth" vs "didn't need to leave my post"); plus Dot's garbled "learned from Lena's stock over months of candid shots in that doorway" (v1).
- **Feast (unseen): 6 findings: 4 real, 2 debatable, 0 false.** Real: Percival "three hundred years of watching him" vs `master_context` "decades ago, Aldric turned Percival"; "decades of idle centuries"; "clear this entire table of suspicion for nobody"; "centuries of nights" (low). A package I had already swept by hand and called clean.
- **Laia (unseen, Spanish): 15 findings: 5 new real** (a non-word `aireroar`; an ungrammatical connector-less sentence in Jordi; Laura's incoherent "ninguna de ellas era yo sola la que"; a remaining ustedes slip, "Si querían", in a vosotros character; Sergi's "mi propia fiesta de pádel" at Laia's birthday), **3 real but already known and left alone** (Aida's duplicate Jordi entry; two ally-vs-matrix entries, ADR-0134), **5 debatable, 2 false** (both are the slip-style accomplice-confession-names-the-killer behaviour that I told it to ignore but it re-derived from `accomplicePairings`).
- **Out-of-sample total: 21 findings, 12 real (57%), 7 debatable (33%), 2 false (10%)**, about 1 false alarm per package, both of the one by-design kind that a prompt line (and dropping `accomplicePairings` from the prefix) removes.

**What this says about the question "will it reach 100%?"**
- It does **not** reach 100%: on the one labelled package it found 7 of 10 semantic defects and missed 3, and on the two unseen packages I cannot know what it missed.
- It **does** substantially beat the manual sweep on a thing the sweep cannot be audited on: **hand-swept packages still contained at least 9 real defects it found (4 in Feast, 5 in Laia)**, plus the 4 extra it found on Boogie. The ground truth is only "what I noticed", so recall against it flatters the human side.
- **The effort level matters a lot, and cheaply.** v2 at medium found 16/22 with 58 findings (34 low); v2 at high found 18/22 with 25 findings, none low, for 0.20 more per package. High effort (more thinking) is what turned noise into precision.
- **Single-generation slips dominate the real findings** (Feast 3 of 4, Laia about 4 of 5, Boogie most of the extras). Addendum 1 item 4 asked whether a cheaper proofreading pass would do; at about 0.05 USD per character the whole-package reviewer is already cheap, so a separate proofreading pass is not worth building.
- Chaining (Child55) would prevent only 1 of the 10 semantic items on Boogie; none of the real findings above on Feast or Laia are of the same-character-different-call kind except possibly Dani's "last to know" (debatable), so the pilot does not need re-running after Child55 to justify the reviewer.

**Cost and latency (real tokens).** v2/high: 0.050 USD per character on Boogie, 0.047 Feast, 0.063 Laia (the Spanish text is longer); a 14-character package about **0.70 USD**, about 3.5% of the 19.99 price; about 14 to 18 s median per call (about 2000 to 2600 output tokens including thinking), so a package finishes in roughly 1 to 2 minutes at 4 calls in parallel. Cache worked: about 75% of input tokens were cache reads.

**Pass criteria set in this ADR vs result.** Recall of at least 70% on the semantic items: **met on Boogie (7/10 and 18/22) but tuned and single-package**. Under 1 false finding per package: **about 1 per package out of sample, borderline, and removable** (see below). Not enough to switch on auto-apply; enough to justify **report-only on every paid order**.

**Recommended next steps (each needs Jonathan's go-ahead because they spend money or change behaviour).**
1. **Report-only reviewer in production:** a `review-package-quality` edge function that runs after all deterministic heals are clean, writes findings (never edits) to a new table, and puts the medium/high ones in the existing held-package alert and the sweep. About 0.70 USD per order. This replaces the forty-minute read with a two-minute read of a short list.
2. **Prompt v3 before that:** drop `accomplicePairings` from the prefix and tell it to ignore relationship-vs-matrix entries (ADR-0134 owns them); keep high effort; require `severity` of medium or high. Verify v3 on Feast and Laia (about 0.9 USD) before relying on it, because v2 was tuned on Boogie.
3. **A second labelled package** for recall: the next real purchase swept in two passes (reviewer first, then my manual sweep) gives an out-of-sample recall number and costs one order's worth of review.
4. **Only then** consider auto-apply of exact-quote replacements (the suggested_replacement field is present and mostly sensible), starting with `single_generation_slip` and `pronoun_drift` and the existing detector re-run as the safety net.

### Key files (Addendum 2)
- `docs/adr/0136-pilot/` (pilot.py, ground_truth.py, score.py, adjud_v1.py, README.md, results/)

## Addendum 3 (2026-10-03): prompt v3 check, an ensemble result, and what the pilot did not cover (Jonathan approved the spend; pilot total 3.46 USD)

**v3 on the two unseen packages (0.85 USD).** v3 = v2 plus: `accomplicePairings` removed from the context, an instruction to ignore which character a confession names and ally/rival entries versus the relationship matrix (ADR-0134 owns those), medium/high only, and "read description, background and relationships with equal care". Feast 6 -> 5 findings, Laia 15 -> 13, all medium/high. **The by-design false alarms went from 2 to 0** (Dani's and Jordi's accomplice naming, the two matrix entries). The real defects were kept: the same Percival, Laia and Sergi defects were re-found (some on a different quoted span), and v3 added a few more (Edmund's "said what prayers I still trust meaning in"; Ramón's "weeks" vs "a few days" and "welcome party" vs Laia's birthday, the last two debatable). Cost per package unchanged (0.27 and 0.58). Recall on Boogie was **not** re-measured with v3 (that would have been a further 0.7 USD).

**Free ensemble check on the existing Boogie runs.** v1/medium 17 of 22, v2/medium 16, v2/high 18; the **union of any two passes is 19 of 22 (86%)**. The 3 items that **every** run missed are all in the short structured fields (Honey's `description`, Pete's `relationships`, Dot's `background`); v3's equal-care instruction targets exactly that and is untested on Boogie. So recall is movable by design (a second pass, a field-attention instruction), not capped by the model.

**What the pilot did not cover (must be addressed before trusting it everywhere).**
1. **Detective-style packages.** All 54+ pilot calls were slip style. By corpus count about two thirds of packages since 2026-08-01 are detective style (71 vs 33), with a different structure (unified round scripts, a single killer, a detective script and host guide). The reviewer prompt has slip-specific rules and has not been calibrated on detective style.
2. **Package-level documents** (detective script, game overview, evidence cards) were not reviewed, only characters.
3. **Languages other than English and Spanish**, and a recall number from more than one labelled package.
4. **Whether the report-only list is short enough to be a two-minute read** on a typical order (in the pilot: 5 to 13 findings per package at medium/high).
