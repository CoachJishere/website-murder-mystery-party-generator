# ADR-0137: Chain earlier outputs into the script-writing Child calls (Child55), and what the hand-fix data says about how much that buys

- **Status:** Accepted as a low-cost experiment; Child55 built, **not yet imported or tested in Make.com**. The measured payoff is small (below), so it is not the priority.
- **Date:** 2026-10-03
- **Related:** [ADR-0135](0135-child-language-pack-fixed-register-and-canonical-headers.md) (Child53/54), [ADR-0136](0136-llm-quality-review-pass-for-autonomous-packages.md) (the LLM review pass), [ADR-0103](0103-new-purchase-coherence-sweep-ritual.md) Addenda 78-80

## Context

Jonathan asked whether running each Child call only after the previous one finishes would stop later calls contradicting earlier ones (register, facts), even at the cost of time. Reading the blueprint shows the calls **already** run strictly one after another per character (Call 1 -> parse -> save -> Call 2 -> ...; characters run in parallel). What is missing is not ordering but **visibility**: no prompt reads an earlier call's output. The only inputs are `{{63.*}}` and `{{142.master_context}}`, although the parsed outputs exist (`{{402.data.*}}` detective, `{{502.data.*}}` and `{{510.data.*}}` slip). Node 513 even tells the model its guilty scripts must be 85-90% similar to "the innocent scripts you produced in the previous step", which it never receives.

## Measurement (done before building, because I first guessed "about half" of the semantic defects would be prevented)

Ground truth: the 66 edits (57 fields) that were hand-applied to "Boogie Nights, Bloody Nights" (ADR-0103 Addendum 79), read from the pre-fix edit list, classified by what would have prevented or caught each:

| Class | Edits | Prevented or caught by |
|---|---|---|
| Missing branch headers | 32 | self-heal (Addendum 80) |
| Stray quotes, tag, backtick, leaked self-correction, whitespace-only line | 8 | detectors + self-heal |
| Missing pointforms | 2 | self-heal (Addendum 80) |
| Victim pronouns (Dusty "she/her/man/girl", 4 characters) | 14 | Child54 |
| Semantic, **inside one generation** (garbled sentence, a character contradicting herself within one field, "a informant", "not short list", "last night" for the same night, a stray paragraph under ALLIES) | 6 | only a reviewer (or a proofreading pass) |
| Semantic, **a fact wrong against another character or master_context** (Pete's coat-check instinct called "a bartender's", the owner "behind the bar", one character hinting at another's secret "a badge") | 3 | a reviewer; the secret-hint also by a prompt rule for slip nodes |
| Semantic, **same character, different calls** (Honey: three years in a script vs "a couple of years" in her introduction) | 1 | **chaining (this ADR)** |

So on this package chaining prevents **1 of the 10 non-pronoun semantic edits (about 1 in 14 of all semantic edits)**. The Laia package (Addendum 78) adds one more cross-call case (Aida's who-read-whose-cards, background vs scripts), the rest being register, stray tokens, a cross-character self-name and a cross-document contradiction. Across the two packages roughly 2 of about 25 semantic items. My earlier estimate ("a bigger win", "perhaps half") was wrong.

## Decision

1. **Child55** (`MM Live - Child (Unified)55-ChainedContext`, `temp-files/build-child-v55.py`, built from Child54; exactly 8 prompt texts differ): a new `<already_written_for_this_character>` block, just before `<output_schema>`, in the four calls that write first-person scripts and confessions: 409 (detective rounds + final), 509 (innocent), 513 (guilty; also gets the innocent scripts it is already told to mirror), 517 (accomplice). It contains the character's background, secret and introduction, tells the model to agree with them and to follow master_context if they disagree. Calls 401/501 are first; 405/505 (rumors, accusations) are skipped because their risk is cross-character. The Child53 pack sentence and the Child54 pronoun bullet that said "you cannot see this character's other fields" are reworded because that is no longer true for these four calls.
2. **No new scenario, webhook or extra delay.** Same chain, more text in four prompts.
3. **Treat it as an experiment.** Given the measured payoff, import is low priority; the case for it is that it also makes the existing "85-90% similar to the innocent scripts" instruction true, and it is cheap and reversible. Re-count cross-call, same-character contradictions after a few packages and keep it only if it earns its cost.

## Cost

About 1.4K input tokens (background, secret, introduction) per script call, plus about 2.5K of innocent scripts into the guilty call: roughly 2.8K tokens per detective character and 6.7K per slip character, about 0.1 USD (detective) to 0.3 USD (slip) per 12-character package at the 3 USD per million input tokens assumed in ADR-0135 (unverified; applies to English too).

## Consequences

- Within-character register, pronoun and fact consistency improves modestly; cross-character facts, single-generation slips and cross-document contradictions are untouched.
- This result is the main argument for ADR-0136: **most remaining semantic defects (9 of 10 on this package) are not preventable by giving the calls more context**, they need a reviewer.

## Key files
- `temp-files/build-child-v55.py`, `temp-files/MM Live - Child (Unified)55-ChainedContext.blueprint.json` (gitignored; import into Make)
