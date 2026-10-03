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
