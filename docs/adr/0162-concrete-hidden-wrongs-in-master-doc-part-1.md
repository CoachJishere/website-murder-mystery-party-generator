# ADR-0162: Part 1 invents one concrete hidden wrong per character when the concept gives none (Parent87)

## Status
Accepted (built 2026-10-14, awaiting Make import)

## Date
2026-10-14

## Context
Secrets and motives come out abstract when the customer's concept does not define them: "a long-buried secret" (the murderer of "Dead Serious: The Br31 Unveiling", whose confession never says what the secret was), "a scandal" (Cherries Jubilee), "a careful invention" (The Flavour Man), Marcus's secret-identity twist (ADR-0103 Addendum 91) and Jessica's "Choose for yourself what this secret is" (Addendum 93). Neither the reviewer nor a detector can fix it later: a secret is repeated in 4 to 6 fields of a sheet plus the master design, so a one-field edit creates contradictions, and "is this specific enough" is a fuzzy judgement.

Root cause found by reading the Part 1 modules (171 Master Doc Part 1, 165 Character Murder Part 1): an instruction conflict. `<output_hygiene>` says "Do not invent ... biographical facts about ... the characters ... that the conversation or master_context does not state; when a specific is not given, use qualitative wording" (added to stop invented numbers and facts, ADR-0142), while `howVictimWrongedThem` asks for "concrete details from conversation". With no details in the conversation the model stays qualitative, and Part 2 and every Child sheet copy the vagueness faithfully. Part 1 even wrote "Specific sums and dates were not given in the conversation, so Part 2 should keep them qualitative" into the Br31 master design.

## Decision
Parent87 = Parent86 with two edits in each of modules 171 and 165, nothing else: (A) the `howVictimWrongedThem` placeholder becomes one concrete wrong stated as a fact, using the conversation's details exactly and inventing one specific plausible fact where the conversation gives none (no amounts, ages or years), never only "a secret", "a scandal", "a past"; (B) one sentence appended to the hygiene rule: the exception for `howVictimWrongedThem` and the accomplice's own motive, which once written in Part 1 is "stated in master_context". Part 2 (3000, 4010) and the Child modules already treat `howVictimWrongedThem` as the source of truth and are unchanged. Build script `temp-files/build-parent-v87.py` (gitignored; asserts only those two mappers differ).

## Rationale
Fix at the one place the fact is born (ADR-0153 Phase 0: causes were instruction conflicts, so replace the conflicting wording instead of stacking a new rule). Because the invention happens once, in Part 1, it is consistent across all sheets and cannot be flagged as an invented specific downstream. No new ongoing cost, no detector, no reviewer change.

## Alternatives considered
- Reviewer finding class "abstract secret" with auto-fix: rejected, a secret spans several fields and a single-field replacement contradicts the others.
- A detector: rejected, "concrete enough" is semantic; the free alternatives are prevention (this ADR) and a hand check in sweeps.
- A Child-side rule: rejected, the Child cannot invent a fact the master design and the other sheets do not share.
- Leave it: rejected, third and fourth sighting in 2 weeks, and the murderer's motive is the reveal's payoff.

## Consequences
More invented backstory per package, which is intended, but it also means more content a customer may not expect; the concept's own details are still used exactly. Risk: the invented wrong contradicts something the customer wrote later in the chat (the existing concept-extraction step still comes first). Validation is on the first real purchases, not a paid test: after import, on the next 3 purchases read every `wrongedEachCharacter[*].howVictimWrongedThem` and `specificMotive` in `master_context` (each names an act or fact), check the murderer's confession says what the secret was, check sheets repeat the same fact, and check the reviewer's invented-specific findings do not rise. Rollback: re-import Parent86.

## Key files
`temp-files/build-parent-v87.py`, `temp-files/MM Live - Parent87 (Concrete Hidden Wrongs).blueprint.json` (both gitignored), ADR-0103 Addendum 100.

## Discussion
Jonathan approved the prevention route on 2026-10-14 ("OK let's do it") together with a hand-written concrete secret for the Br31 murderer, and said choices like these should be made without him by following the recommendation based on the customer's conversation (saved as a working preference). The Br31 repair itself: French Vanilla took the recipe for the signature base from a small-town creamery's founder decades ago; the Critic traced it and kept the original recipe card. Written into French Vanilla's background, secret, `secrets`, final statement, point-form and the master design.
