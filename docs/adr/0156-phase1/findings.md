# ADR-0156 Phase 1 findings: what the per-character context hands over (2026-10-13)

Scope: a pure function, `buildCharacterContext` in `supabase/functions/_shared/characterContext.ts`, plus tests. Nothing is wired in. No paid call, no database write, no Make or prompt change. Phase 1 proves what the model is **no longer handed**. It does not show the model will leak less (that is Phase 2).

Data: the 14 most recent detective packages (created from 2026-09-20), their 153 characters, read-only over REST. Raw text stays in `temp-files/charctx/` (gitignored). The committed test also carries a small synthetic design, so it runs without the fixtures.

## Verdict: READY WITH CHANGES

The function does what Phase 1 asked and the leak checks pass on all 119 innocents of the 12 packages it supports. Four things must be settled before the paid replay, none of them a rewrite:

1. **Replay only packages that carry `keyMomentPositions`.** Only 4 of the 12 classic packages have it (the newest four, Silver Nightingale, Blackthorn Manor, The Last Slice, the Swedish Golden Stars one). In the other 8 an innocent gets no who-was-where information at all. A replay on those 8 would test a situation that future packages will not be in, and a replay on them would also look better than it is.
2. **Choose how a witness sees the murderer** (option `visibleMurderer`: `"claimed"` default per the ADR, or `"omit"`). See risk 2. Recommendation: replay with `"omit"` first, because `"claimed"` contradicts what the witness's own entry says in 1 of the 4 witnesses of the Silver Nightingale murderer and names a field the current Child rules call off limits.
3. **Define the caller's failure policy** before Phase 3: the function throws `CharacterContextError` on unreadable input or on the unsupported intrigue schema, and reports `... (NOT FOUND)` in `dropped` when a character has no entry in the design (2 characters in El Ultimo Trago). The edge function must treat both as "do not use the redacted text" and decide whether the fallback is the full context (today's behaviour) or an alert.
4. **Intrigue-type designs (2 of the 14) are out of scope** and refused loudly. They have a different shape (pair-list matrix with prose "relevantSecrets", `characterLocations` with alibi verdicts, no `wrongedEachCharacter`). Supporting them needs its own allowlist and its own check.

## Results

### Size, per package and role (input = full `master_context`)

Murderer and accomplice receive the input string unchanged (ratio 1.000, asserted byte for byte). Innocents:

| Package | Language | Input chars | Murderer / accomplice | Suspects n, median out (ratio) | Red herrings n, median out (ratio) | Position map |
|---|---|---|---|---|---|---|
| Golden Stars (Swedish) | sv | 61534 | M | 7, 9010 (0.146) | 3, 6526 (0.106) | 11 entries |
| The Last Slice | en | 49976 | M | 3, 7612 (0.152) | 3, 6838 (0.137) | 8 entries |
| Blackthorn Manor | en | 66608 | A+M | 3, 7045 (0.106) | 6, 7543 (0.113) | 11 entries |
| Murder On The Silver Nightingale | en | 68782 | A+M | 8, 8920 (0.130) | 2, 8789 (0.128) | 12 entries |
| Tijdcapsule Klas '96 (Dutch) | nl | 59174 | M | unsupported (intrigue), throws | none | none |
| The Last Thanksgiving | en | 65621 | M | 7, 6119 (0.093) | 3, 6097 (0.093) | none |
| The Vellacourt Gala | en | 61198 | M+A | 8, 5940 (0.097) | 3, 6095 (0.100) | none |
| El Ultimo Trago | es | 69030 | A+M | 10, 8087 (0.117) | 9, 8176 (0.118) | none |
| Great S'more Heist | en | 48496 | M | unsupported (intrigue), throws | none | none |
| Blood On The Mead-bench | en | 54521 | M | 2, 5290 (0.097) | 5, 5324 (0.098) | none |
| Paradis Perdu (French) | fr | 59699 | M | 7, 5463 (0.092) | 4, 5601 (0.094) | none |
| The Crown's Shadow | en | 46664 | M | 4, 5119 (0.110) | 3, 4989 (0.107) | none |
| The Night The Storm Hit | en | 76694 | M+A | 5, 6560 (0.086) | 7, 6788 (0.089) | none |
| The Last Invitation | en | 45167 | M | 4, 4635 (0.103) | 3, 4521 (0.100) | none |

All innocents (n=119): **median ratio 0.103**, range 0.084 to 0.163 (suspects 0.104, red herrings 0.101). Outputs are 4,500 to 11,200 characters. This is far below the ADR's estimate of a quarter to a half: the per-character blocks (about 35 percent of the document) collapse to one entry out of 8 to 21, and the solution blocks go entirely.

### What an innocent receives (kept) and what is dropped

Kept: `contextFor` (name, role), `mysteryStyle`, `victimProfile.{name, role, personality, powerSource}`, **its own** `wrongedEachCharacter` entry (`character`, `howVictimWrongedThem`, `motiveStrength`), the `relationshipMatrix`, `murderMethod.weapon`, the `item` of evidence rounds 2 to 4, `timelineFramework.{gatheringStarted, specificEvents, victimLastSeen, bodyDiscovered}`, the filtered `keyMomentPositions`, and **its own** `characterSpecificDetails` entry.

Dropped, on all 119: `murdererSelection`, `accompliceSelection`, `accompliceDetails`, `deceptionGuidelines`, `hostBriefing`, `motiveDistribution`; `victimProfile.activitiesAndSchemes` and the other 10 to 20 `wrongedEachCharacter` entries; the `isMurderer` and `isRedHerring` flags of the own entry; `murderMethod` except the weapon; every evidence field except `item`, plus `solutionLogic`; `timelineFramework.{keyEventsBeforeMurder, murderWindowStart, murderWindowEnd, murdererClaimedLocation, murdererAlibiGap, otherSuspectsAlibis, opportunityStatement}`; all of `conversationDetailsExtraction` except the own `characterSpecificDetails` entry. Any unknown top-level key is dropped and listed (`<key> (unknown key)`).

Where the data overruled the ADR's list or needed a rule it did not have:

- **`activitiesAndSchemes` dropped**, as the task allowed: it names the murderer or accomplice in 8 of 12 packages and describes hidden wrongdoing.
- **`murderWindowStart/End` and `keyEventsBeforeMurder` dropped**: several name the method or the act (a window described as the moment the poison was placed, a "window for tampering", a description of how the victim later drank it and died alone).
- **Sentence-level scrub of the "public" fields.** Even the public fields name the culprit: `specificEvents` (6 of 12 packages), `victimLastSeen` (1), `bodyDiscovered` (1), and `weapon` (1: the murderer's act, "brought up to the roof by <name> under the pretext ..."). Any sentence naming the murderer or accomplice (full name, nickname, dual-gender form, first name or surname of 4+ letters; titles ignored) is removed from those fields. Effect: 62 innocents lose a `specificEvents` sentence (the Swedish package costs everyone the same sentence), 20 lose a `victimLastSeen` sentence, 12 a `weapon` sentence, 10 a `bodyDiscovered` sentence. The cost is real public information (for example "the victim was last seen walking off with <the murderer>" in Paradis Perdu); see risk 5.
- **Other innocents' position entries are scrubbed the same way** (sentences naming a culprit and culprit names in `besideOrNear`), so a witness does not receive the culprit's true position through a third person's sentence. When every sentence names a culprit the text is withheld (`position: null`) but who stood beside whom and who can see whom still travels. The viewer's **own** entry is never scrubbed.

### Leak checks (all pass on 119 innocents, 12 packages)

For every innocent of every supported package the test asserts: (a) no 8-word run from the culprit's deception guidelines, murderer reasoning, accomplice details and selection, host briefing, alibi gap, opportunity statement, or the culprits' own `secret`/`secrets` columns appears in the output; (b) no 8-word run from any other character's `secret`/`secrets` appears; (c) the own `wrongedEachCharacter` and `characterSpecificDetails` entries are present (exception: 2 characters absent from the design, below); (d) the output parses as JSON; (e) it is smaller than the input; plus: none of the solution keys survive, and no position entry other than the viewer's own or one that lists the viewer in `canBeSeenBy`.

The 8-word check ignores runs that also occur in text every innocent is meant to receive (victim profile, weapon, evidence items, public timeline, matrix, cast names): without that, a generated secret that quotes a public line (for example "<victim> alive in his dressing room right at the start") is wrongly flagged. The culprit's `murdererClaimedLocation` is not in the banned set because the `"claimed"` option hands it over on purpose.

Mutation check (done by hand on copies, not committed): returning the full text, adding `deceptionGuidelines` or `murdererSelection` to the output, adding `murdererAlibiGap` or `otherSuspectsAlibis`, passing every position entry, not scrubbing, leaking the culprit's true position, keeping all `wrongedEachCharacter` entries, keeping all `characterSpecificDetails` entries, and the same leaks under a renamed key (`notes`) each make the suite fail. `CHARCTX_REAL_ONLY=1` skips the synthetic tests so the real-data checks can be mutation-tested alone.

Honest limit: this is a check on text overlap. 25 of the 119 innocents still have a culprit's name in their own entries (16 in their own `relationships`, 9 in `otherDetails`, 4 in the stated position, 2 each in `pastEvents` and the `wrongedEachCharacter` text; fields overlap). That is each character's own knowledge of the culprit and is intended, but it shows names are not the same as the solution. A leak by paraphrase would not be caught.

### Not in the design (2 characters)

El Ultimo Trago: "Juanpa Comunica" (the victim, also saved as a red-herring sheet) and "Consuelo Arriaga" were added to the roster after `master_context` was written, so the design has no entry for either. The function returns a context without own entries and reports `(NOT FOUND)` in `dropped`. The test lists these two explicitly. In production this must raise, not proceed (failure policy above).

### The eyewitness question (Silver Nightingale, Percival and the steward)

- **Percival keeps what he saw.** His own entry is passed whole, including its sentence saying that he moved the victim's glass aside after the steward had handed it over. So he can say he saw the steward hand the glass. Asserted in the test.
- **What the culprit entry looks like to him** (default `"claimed"`): `{character: Simone Delacroix, position: <the stated alibi, that she went back to the pantry>, besideOrNear: [], canBeSeenBy: [Percival Okafor]}`. Same shape as every other entry, `truePosition` ("dosed the glass") never travels. But it **contradicts his own entry**, which puts her at the sideboard beside him. 4 of the 10 Silver innocents can see the murderer and 1 of those (Percival) has an own entry that puts them beside her.
- **Marcus and Harry** (also in her `canBeSeenBy`, with a clear view of the bar end) lose Percival's sentence about Simone and the `besideOrNear: [Simone]` tag, because those are third-person sentences naming the culprit. They can no longer write "I saw Simone at the sideboard". That clue lived only in the true positions and cannot be passed safely by text filtering. This is exactly the case Phase 4 (`whatAnObserverSees`) exists for. With `visibleMurderer: "omit"` the stated alibi disappears for all witnesses instead of contradicting some.
- **Accomplice**: no field gives her stated position, so a visible accomplice entry is dropped and reported (once in the 4 map packages: Blackthorn Manor).

### Silver Nightingale regression

Juliet's confrontation of Reginald in the compartment corridor exists only in `timelineFramework.otherSuspectsAlibis`, which every sheet received. With the allowlist **nobody** receives it: Vivian does not (the regression holds), but neither do Juliet (who lived it), Beatrice (watched her) or Marcus. Asserted for all four. Vivian also gets none of "slipped away only afterwards" or "spoke with Reginald privately". The loss is bounded: `otherSuspectsAlibis` has per-name segments for innocents in only 2 of the 12 packages (this one and the Swedish one); the other 10 hold one short paragraph about the culprit's cover. Juliet therefore cannot write her own corridor scene from `master_context`; she has only the chat excerpts and her description. A later option is to pass the own-name segment with culprit sentences removed; not built because it was outside the ADR's rules.

### Over-redaction: what an innocent plainly needs and may now lack

Read against Child modules 401, 405 and 409 (`temp-files/MM Live - Child (Unified)63-QuoteTalkRemoved.blueprint.json`): the prompts name `murdererSelection`, `murderMethod`, `motiveDistribution`, `timelineFramework`, `evidenceProgression`, `deceptionGuidelines`, `accompliceDetails`, `hostBriefing`, `solutionLogic`, `murdererFlaw`, `murdererAlibiGap`, `murdererClaimedLocation`, `opportunityStatement` and `wrongedEachCharacter` only inside the "SOLUTION NOTES ARE OFF LIMITS" rule for innocents. The positive references are `timelineFramework.keyMomentPositions` and `relationshipMatrix`. So nothing the innocent's instructions *require* is gone. What may be missing is content the model would otherwise reuse:

- **Other characters' public facts** (occupation, role at the event), which lived in everyone's `characterSpecificDetails`. The Child still gets the full concept chat (`conversationContent`) with the approved cast list, so most is covered, but not guaranteed.
- **World facts**: `settingAndLocationDetails` (named locations and items), `themeSpecificDetails`. The data shows these cannot simply be re-added: their `significance`, `owner`, `outcome` and `relevance` fields carry the solution ("source of the poison", "murder weapon", "the murderer's motive"), and 14 of their entries name a culprit. A field-level allowlist (name and description only) would be needed, and even descriptions sometimes hint ("where the herbs are managed by the steward"). Not added in Phase 1.
- **Evidence ownership** (`namedItems.owner`, ADR-0103 Addendum 56's bug class): dropped. A character that mentions an item can now misattribute it; watch `cross_field_contradiction` in Phase 2.
- **Own motive nuance**: the `motiveDistribution.specificMotive` of the character is dropped; `wrongedEachCharacter.howVictimWrongedThem` and the own `threatsOrPressures` remain. Not measured whether this loses substance.

## The 5 riskiest spots for Phase 2

1. **No position map in 8 of 12 packages.** Phase 2 must use map-bearing packages, and Child64 depends on Parent77 and later always emitting `keyMomentPositions`. Without the map the Child's own rule ("name an alibi witness only if the background establishes that person, otherwise say nobody can vouch") will produce lonely alibis.
2. **The visible-murderer entry.** `"claimed"` gives a witness a position that contradicts their own entry (1 of 4 Silver witnesses), the wording ("claims", "says") marks which character is the liar, and the Child prompts list `murdererClaimedLocation` as off limits. `"omit"` avoids all three but removes the stated alibi for every witness. The replay should compare both on the same package.
3. **Lost eyewitness and off-camera facts.** Marcus and Harry cannot say what they saw of the steward; Juliet cannot recount her corridor scene. Expect fewer alibi-breaking clues, and possibly weaker mystery solvability (not measurable by the reviewer, which checks leaks and contradictions, not whether the case is still solvable). Phase 4's `whatAnObserverSees` is the fix, and needs a Parent change.
4. **Characters know less, so wrong_fact and cross_field_contradiction may rise.** Phase 0 found wrong_fact is the largest finding class. Other characters' occupations, named items and locations are no longer in the context. Compare those categories, not just secret leaks.
5. **Name heuristics and role words.** The scrub removes sentences by name (4+ letter tokens, 3+ letters for a whole first name such as "Jay"). It cannot catch "the head steward" or "the physician" when those roles point to the culprit, and it over-drops harmless sentences (one `specificEvents` sentence for every innocent of the Swedish package). Also, a mid-run language or rename difference between the design and the sheet fails the own-entry match (2 cases here), so the caller needs the failure policy above.

## Tests and how to run

`npm run test:charcontext`: 45 tests (16 synthetic, committed, plus real-data checks that skip cleanly with a `SKIP` line and exit 0 when `temp-files/charctx/` is absent). Fixtures are two REST reads, listed at the top of `characterContext.test.mjs`. On this machine, with the fixtures, all 45 passed; the run reports 12 supported packages, 2 unsupported, 119 innocents checked.
