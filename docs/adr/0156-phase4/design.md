# ADR-0156 Phase 4 design: `whatAnObserverSees`, an observer-safe description of what witnesses saw (2026-10-13)

Status: designed and built locally, nothing imported or deployed. Parent86 exists only as a local, gitignored blueprint; `buildCharacterContext` is still not wired into anything. No paid call, no database write, no Make import.

## 1. Problem in one paragraph

The Parent writes `master_context.timelineFramework.keyMomentPositions`: one entry per cast member with `truePosition`, `besideOrNear` and `canBeSeenBy`. For the culprit, `truePosition` contains the act ("where she dosed the glass set apart on its own napkin"), so `buildCharacterContext` must not hand it to an innocent. Without it, an eyewitness (Marcus and Harry in the Silver Nightingale replay) cannot say "I saw the steward at the sideboard with the tray", which is the clue that breaks the culprit's stated alibi. The fix is a second text per entry that is true, observable and safe to say aloud in front of any suspect.

## 2. Inventory (free, from the Parent85 and Child63 blueprints and 14 real packages)

### 2.1 Where the map is defined and consumed

| Module | Blueprint | Role | Schema it shows | Mystery types served |
|---|---|---|---|---|
| 3000 "Master Doc - Part 2 (Gameplay)" | Parent85 | **defines** `keyMomentPositions` (rule paragraph plus JSON schema line, both inside `timelineFramework`) | classic detective: `murdererClaimedLocation`, `murdererAlibiGap`, `otherSuspectsAlibis`, `keyMomentPositions` | detective style, fixed murderer, with or without accomplice |
| 4020 "Detective Intrigue - Part 2 (Gameplay)" | Parent85 | **defines** it (same rule paragraph; schema line inside a `timelineFramework` that also has `characterLocations`) | intrigue: `characterLocations` (claimed location, `alibiStatus`, `alibiDetails`) plus `keyMomentPositions` | detective style, `mysteryType = intrigue` (crime that is not a murder, for example a theft or an assault) |
| 401 "Call 1: Context", 405 "Call 2: Round 1 Setup", 409 "Call 3: Round Scripts" | Child63 | **consume**: one rule each, "POSITIONS AT THE KEY MOMENT: ... it must match that map exactly" | n/a (they read whatever `master_context` they are given) | detective style, all schemas |

Findings:

- Searching every `mapper` of Parent85 and Child63 for `keyMomentPositions`, `characterLocations`, `canBeSeenBy`, `truePosition`, `besideOrNear` finds exactly the five modules above. The build script asserts the Parent carrier list is `[3000, 4020]`, so a new definer cannot be missed silently.
- `characterLocations` is **not** an equivalent of the map: it is the intrigue schema's claimed locations and alibi verdicts (`alibiStatus: "false"` for the culprit). It is a separate leak that Phase 4 does not touch (see section 7).
- The slip route (modules 165, 4010 and the slip Child) has no map and no fixed culprit. Out of scope.
- In the Parent, the Part 2 output is read by Game Overview, Themed Materials, Detective or Investigator Script, Evidence Cards and Image Prompts (five modules per route, plus the database upsert). The new field adds about 20 words per cast member to their input (roughly 700 tokens at 21 characters, 0.01 USD per package). It is observer-safe by construction, so it adds no new risk to those modules.
- Nothing in the repository's code reads `keyMomentPositions` except `characterContext.ts` (and its test).
- Module 3000 and 4020 have `max_tokens` 32000 with adaptive thinking at medium effort. The addition is under 1,000 output tokens.

### 2.2 How 14 real recent packages use it (created since 2026-09-20; local copies in the gitignored `temp-files/charctx/`, read earlier from REST)

| Package | Style / schema | Language | Map | Culprit entry | Culprit seen by | Accomplice entry seen by |
|---|---|---|---|---|---|---|
| Murder On The Silver Nightingale | classic, accomplice | en | 12 entries | murderer at the sideboard, `truePosition` 259 chars, contains "dosed the glass" | Percival, Marcus, Harry, Josie | none |
| Blackthorn Manor | classic, accomplice | en | 11 | murderer alone in the cellar hallway (no witnesses) | none | Anna |
| The Last Slice | classic, no accomplice | en | 8 | murderer alone by the dessert table | none | n/a |
| Murder Under Golden Stars | classic, no accomplice | sv | 11 | murderer alone with a non-cast character | none | n/a |
| The Last Thanksgiving, Vellacourt Gala, El Ultimo Trago, Mead-bench, Paradis Perdu, Crown's Shadow, Night The Storm Hit, Last Invitation | classic | en, es, fr | **none** (made before Parent77, 2026-10-06) | n/a | n/a | n/a |
| Tijdcapsule Klas '96, Great S'more Heist | **intrigue** | nl, en | none (made before Parent77) | n/a | n/a | n/a |

What the real maps teach the design:

1. **Only 4 of 14 packages carry a map, and only 2 of the 6 culprit and accomplice entries in those 4 are seen by anybody** (Silver: murderer; Blackthorn: accomplice). In 4 of 6 the culprit is alone and unseen. So the field is consumed rarely for culprits, but where it is consumed (Silver) it carries the case's key alibi-breaking clue. Unseen entries must produce an empty string, not an invented description.
2. **Today's culprit entry is recognisable by itself**: Silver's murderer is 259 characters and says what she did, against 76 to 191 for the other eleven. Whatever the Parent writes in the new field must not repeat that pattern, or it hands the culprit to the Child by style.
3. Innocents' `truePosition` also contains things a bystander would not see (for example Blackthorn's doctor "searching their pockets for a lost notebook", Golden Stars' "pressing Camillo about the embezzled fee", an argument's subject). Using the observer text for every entry the viewer can see, not only the culprit's, fixes that too and makes the shapes uniform.
4. Languages in the sample: English, Swedish (maps), Spanish, French, Dutch (no maps yet). The field must be written in the package language.

## 3. The field

### 3.1 Name and placement

`whatAnObserverSees`, a string, last key of each `timelineFramework.keyMomentPositions[]` entry:

```json
{"character": "...", "truePosition": "...", "besideOrNear": ["..."], "canBeSeenBy": ["..."], "whatAnObserverSees": "..."}
```

- Last, so the model writes it after it has decided who can see whom, and can derive it from the finished entry.
- One entry per cast member, as the existing rule already requires. For an entry with empty `canBeSeenBy` the value is `""` (nobody can see them, so nobody can say anything about them). This keeps the field mandatory in structure without inventing sightings.
- The same key in both schemas (classic and intrigue).

### 3.2 Wording rules for the Parent prompt (exact text is in `temp-files/build-parent-v86.py`, identical in modules 3000 and 4020)

One plain sentence, 8 to 25 words, written last, saying only what a bystander on `canBeSeenBy` would literally see and could repeat aloud: where the character stands or sits, what they hold or carry, who they speak with or look at, ordinary visible movements. Rules:

1. Observable verbs only.
2. No intent, motive, method, secrecy, preparation, concealment or result. No words of secrecy or purpose ("secretly", "quietly", "carefully", "while nobody was looking", "to make sure", "in order to"); no verbs of tampering, hiding or taking (slips, adds, doses, swaps, plants, hides, steals, spikes, removes); nothing about what was done to the victim, a drink, a dish or an object, or what it contained. A visible act is described in its ordinary outward form ("hands the victim a glass").
3. Same length, tone and detail for every character; the culprit's and accomplice's sentence must be indistinguishable from an innocent's.
4. True and adding nothing: every fact must already be in `truePosition`; names only cast members listed in `besideOrNear`; covers only what is visible from where the observers stand; the culprit's false claim never appears (it stays in the claimed-location and alibi fields).
5. Empty `canBeSeenBy` means `""`.
6. Same language as the rest of the document; the English words in the rules are to be taken as examples and the natural equivalents used.
7. One contrast example in the prompt (a buffet and a swapped bottle, deliberately not a poison at a sideboard so the Parent does not copy it into every story).

### 3.3 Worked examples, one per mystery type found

All `truePosition` texts below are real (quoted or lightly shortened) unless marked synthetic. The `whatAnObserverSees` texts are hand-written illustrations of what the rules should produce; no model wrote them, and whether the Parent does is exactly what the verification in section 6 tests.

**A. Classic detective, fixed murderer seen by witnesses (Silver Nightingale, English).**
- Murderer. `truePosition`: "At the service sideboard at the bar end of the dining car with the brandy tray, where she dosed the glass set apart on its own napkin and handed it to Reginald as part of ordinary service while all eyes were on the head table toast. She was not in the pantry." (259 chars). `whatAnObserverSees`: "At the service sideboard at the bar end of the dining car, holding the brandy tray and handing Reginald his glass during the toast." (22 words). The witness now has the clue (she was at the sideboard, not in the pantry) and nothing about the glass.
- Innocent Percival. `truePosition`: "... pressing Reginald about their dealings. He moved Reginald's glass aside once during the argument, after Simone had handed it to Reginald." `whatAnObserverSees`: "Standing at the bar end beside the service sideboard, speaking with Reginald and moving his glass aside once." (18 words, same register).

**B. Classic detective with accomplice (Blackthorn Manor, English).**
- Accomplice Pam, seen by Anna. `truePosition`: "In the back hall near the kitchen passage, carrying lamp oil and clearing plates, a short way from the cellar door after delivering the note." `whatAnObserverSees`: "In the back hall near the kitchen passage, carrying lamp oil and clearing plates." The phrase "after delivering the note" is out of sight and is left out. Before Phase 4 this entry was dropped entirely for Anna.
- Murderer Sheila, alone in the cellar hallway, `canBeSeenBy` empty: `whatAnObserverSees` is `""`.

**C. Classic detective, no accomplice, culprit unseen (The Last Slice, English).**
- Murderer Morgan, `truePosition` "In the dining room, alone beside the dessert table, ... while the other guests had drifted away." `canBeSeenBy` is empty, so `whatAnObserverSees` is `""`. No innocent gets any entry for her, exactly as today.

**D. Non-English (Murder Under Golden Stars, Swedish).** Real innocent entry: "Vid baren i salen under pausen efter skålen, i samtal med Miia/Mio, med pianogruppen i sikte över rummet." Its observer text can be nearly identical (it is already observable): "Vid baren i salen under pausen efter skålen, i samtal med Miia/Mio." For a hypothetical visible culprit (synthetic): `truePosition` "Vid baren med en bricka i handen, där hon hällde något i Xorgs glas och räckte honom det under pausen efter skålen" becomes "Vid baren i salen med en bricka i handen, där hon räcker Xorg ett glas under pausen efter skålen." The verb list in the rule is English; the rule tells the model to use the language's natural equivalents.

**E. Intrigue variant (The Great S'more Heist, English; a theft over a long window).** Synthetic `keyMomentPositions` for the moment the crates vanish. Camper Daisy (culprit), seen by Ranger Pete from the path. `truePosition`: "Slipping out of the Mess Hall along the path toward the supply cabin with two flour sacks, to swap them for the crates, unseen by Ruby." `whatAnObserverSees`: "Walking along the path from the Mess Hall toward the supply cabin, carrying two flour sacks." The real intrigue package had no map (Parent77 is newer), and `characterLocations` still holds `alibiStatus: "false"` for Daisy, so the intrigue design is not usable by `buildCharacterContext` yet (section 5). For the Klas '96 package (an assault at a grave the previous Monday, outside the party) nearly every `canBeSeenBy` would be empty and nearly every field `""`: the field degrades gracefully when there is no shared "key moment".

**F. Older package (no map or no field).** Nothing changes: `buildCharacterContext` behaves exactly as in Phase 1 (section 4.3).

## 4. How `buildCharacterContext` uses it (built and tested, `supabase/functions/_shared/characterContext.ts`)

### 4.1 Rule

For an entry the viewer is allowed to see (viewer is the subject, or is listed in the entry's `canBeSeenBy`):

| Entry | Viewer gets | Why |
|---|---|---|
| The viewer's **own** | `truePosition` unchanged (and its own `whatAnObserverSees` is not repeated) | It is the viewer's first-hand knowledge, including private reasons ("pressing Reginald about their dealings"). The observer text is a strictly smaller statement about the same facts, so adding it would only duplicate. Unchanged from Phase 1: no behaviour change for own entries. |
| **Another character's** entry (innocent, murderer or accomplice) **with usable `whatAnObserverSees`** | `position` = that text, `besideOrNear` and `canBeSeenBy` as listed, **minus any culprit the viewer cannot see** | One rule for everyone. The murderer's entry is no longer special-cased, so its shape and style cannot give it away. It also removes unobservable material from innocents' entries (finding 3 in 2.2). |
| Another character's entry **without** usable text (field missing, empty, not a string, or over 45 words) | Phase 1 behaviour: murderer by `visibleMurderer` (`claimed` or `omit`); accomplice dropped; other innocents `truePosition` with culprit sentences and names removed | Fail closed to today's behaviour. Mixed maps work entry by entry. |
| Not visible to the viewer | Nothing | Unchanged. Only `canBeSeenBy` opens an entry, not being listed in someone's `besideOrNear`. |

Culprit names inside other entries: an observer text, neighbour list or witness list that names a culprit is only passed on if the viewer can see that culprit (the viewer is in the culprit's `canBeSeenBy` and the culprit's entry has usable text). Otherwise the whole text is withheld (`position: null`; neighbours and witnesses still travel, as in Phase 1, because alibi witnesses matter) and the name is removed from the lists. The observer text is treated as one sentence on purpose: Phase 1's sentence splitter cuts "Dr. Quill" at the full stop, and a test caught it leaving a dangling "speaking with Dr.".

The murderer and the accomplice still receive the stored text byte for byte. `visibleMurderer` stays for old packages and is ignored for an entry that has observer text.

### 4.2 What is deliberately not done

- No wording filter in code. I measured a guard that rejects an observer text sharing a run of words with the solution text (`murderMethod.execution`, alibi gap, deception guidelines and so on, with public text exempted): it flags (using the 36 innocent `truePosition` texts of the four real maps as stand-ins for honest observer sentences) 34 of 36 at 4 words, 19 at 5 words and 11 at 6 words, because solution text and positions share location and timing phrases ("just after the appetizer plates were cleared"). A guard that false-flags a third of honest text would silently put the clue back to missing; it was not built. A multi-language list of tampering verbs was also not built (13 languages, easy to look complete and not be). The only code guard is a length cap of 45 words (the prompt asks for 8 to 25), which catches a model that starts explaining the act. Wording safety therefore rests on the Parent rule, the verification run below and the reviewer.
- The Child prompt is not changed (that is Phase 3, Child64). Its existing rule says to match the map exactly and that a question may assume a character could see something only if the map says so; both still hold. When Child64 is built, add one clause: an entry for another character says only what you could see of them, never why or what happened out of sight.

### 4.3 Tests (`npm run test:charcontext`, 58 tests, 12 synthetic and 1 real-data new)

Cases: visible murderer as observer text with the same shape and no true position or stated alibi; same under `visibleMurderer: omit`; murderer not visible (absent, text does not travel, and `besideOrNear` of someone else does not open it); visible accomplice now given; own entry stays `truePosition` and the observer text is not repeated; another innocent's entry given as observer text; culprit name in another entry withheld unless visible; hidden accomplice stripped from lists; absent, empty, blank, number, object, 60 words each fall back to the old behaviour; mixed map; murderer and accomplice byte for byte; a design where the field exists but is empty everywhere gives output identical to a design without it. Real data (skips cleanly without `temp-files/charctx/`): Silver Nightingale with hand-written observer texts injected into the real map: Marcus, Harry and Josie get Simone's observer entry; Vivian and the others who cannot see her get no entry and no sentence about her; no innocent's context contains "dosed", "set apart on its own napkin", "She was not in the pantry" or the accomplice's post. With the field absent the 45 Phase 1 tests and the size figures (median 0.104 of the input for 119 innocents) are unchanged.

Mutation checks (by hand on a copy, 9 synthetic and 3 real-only, all killed): leak `truePosition` for the culprit entry; show the culprit entry to a viewer who cannot see it; remove the length cap; use the observer text for the viewer's own entry; keep hidden culprit names in lists; do not withhold text that names a hidden culprit; keep dropping the accomplice; keep `truePosition` for innocents; treat a visible culprit as hidden; never use the field.

## 5. Generality and limits

| Case | Parent86 produces | `buildCharacterContext` does |
|---|---|---|
| Classic, fixed murderer, with or without accomplice, any cast size (5 to 21: one sentence each, under 1,000 tokens) | the field on every entry, `""` when unseen | uses it as in 4.1 |
| Non-English | the field in the package language | language-neutral (it forwards the text; the length cap counts whitespace-separated words, so Chinese or Japanese text, which has no spaces, is never capped; accepted, the prompt still asks for one short sentence) |
| Older packages (no map, or map without the field) | n/a | Phase 1 behaviour, unchanged |
| Intrigue | the field in module 4020 as well | **still refused** with "unsupported schema": its design has a different shape (pair-list matrix, `characterLocations`, no `wrongedEachCharacter`). The data is prepared but nobody can use it until an intrigue allowlist exists (Phase 1 finding 4). |
| Slip style | nothing (no map) | out of scope (no fixed culprit) |
| A customer renames a character after approval | names come from the patched roster (`applyLaterRenames` patches the roster before generation, not `master_context`), so the Parent writes the new name into the field like everywhere else | unaffected |

Assumptions that held only for the Silver Nightingale and were avoided: a poison or a drink (the contrast example is a bottle swap at a buffet; the rules speak of "an object"); a seen culprit (4 of 6 culprits in real maps are unseen); an accomplice (Last Slice and Golden Stars have none); English (Swedish example, rule 6); a murder (the intrigue example is a theft, and the rules say "crime" nowhere that requires a death).

Known weaknesses:

1. **Wording safety is not enforced in code.** A model can still write "quietly slips something into the glass" and the length cap will not stop it; section 6 measures how often this happens before anyone relies on it.
2. **Paraphrase of the act.** "Stands at the sideboard, the only person to touch his glass" is a conclusion, not an observation; the rule's "no result" and "true and adds nothing" clauses address it but are judgment calls for the model.
3. **The observer text can still be incriminating** (a person seen at the sideboard when they claimed the pantry). That is the design: the clue must exist for the case to be solvable.
4. **Reciprocity edge**: a viewer who sees X but not the culprit standing beside X gets X's text withheld if it names the culprit; this costs a witness sentence in some cases (the same cost Phase 1 had, now smaller because the culprit is usually described by observation instead of by name).
5. **Parent77-style maps only**: packages made before 2026-10-06 have no map; for them the whole mechanism is a no-op.

## 6. Verification plan (not executed; needs a yes)

Goal: show that Parent86's prompt makes the model write safe, uniform, true observer sentences, and that the witnesses get the clue back without the Child leaking. Method: a local replay in the style of `docs/adr/0156-phase2/tools/phase2_replay.py`, not through Make and with no database write, outputs in the gitignored `temp-files/charctx/phase4_out/`.

**Tier 1: Parent Part 2 replay (the field itself).** Rebuild the Part 2 prompt of module 3000 (or 4020) from Parent86 with the stored Part 1 (first JSON object of the package's `master_context`), the cast list and the conversation text from the local fixtures, and call the model with the same settings as the module (Sonnet 5.5, medium effort, adaptive thinking, temperature 1, max tokens 32000). Seven calls:

| # | Package | Why |
|---|---|---|
| 1 to 3 | Silver Nightingale (classic, accomplice, culprit seen by 4) | three samples to see variance in wording |
| 4 | Blackthorn Manor (accomplice seen) | accomplice path |
| 5 | The Last Slice (no accomplice, culprit alone) | `""` behaviour |
| 6 | Murder Under Golden Stars (Swedish) | non-English |
| 7 | The Great S'more Heist (module 4020, intrigue) | second schema |

Checks per output (scripted where possible): (a) parses; one entry per cast member; the field present on every entry; (b) empty exactly when `canBeSeenBy` is empty; (c) word counts: the culprit's and accomplice's sentence within the innocents' min to max range, none over 25 words; (d) scan culprit and accomplice sentences for tamper and secrecy words (English list, Swedish list written by hand for run 6); (e) every character named in a sentence is in that entry's `besideOrNear`; (f) run `buildCharacterContext` for every innocent on the output and confirm that no 6-word run of any culprit `truePosition` that is not in the observer sentence appears; (g) I read all seven maps and check each observer sentence against its `truePosition` for invented facts or hints; (h) a blind test: I try to pick the culprit from the shuffled observer sentences of run 1 without seeing `truePosition`; (i) the rest of the map (reciprocity, nobody in two places, entry count) against the stored Parent77-era map of the same package, to catch collateral damage from the extra instruction.

Pass: at least 6 of 7 runs satisfy (a) to (e); zero tamper or secrecy words in any culprit or accomplice sentence; (f) clean in all runs; no invented fact in (g); (h) no better than chance (for Silver, 1 in 12); (i) no new reciprocity errors. Any failure goes into the prompt wording, not into new code, and the failing run is shown in the Phase 4 follow-up.

**Tier 2: witnesses recover the clue (the purpose).** Take Tier 1 run 1 for Silver, build the contexts for Marcus, Harry, Percival and Josie with the new function, and regenerate their sheets with the Child63 prompts exactly as in Phase 2 (four calls). Compare with the Phase 2 outputs: do Marcus and Harry again say they saw the steward at the sideboard, and does any sheet repeat the act, the stated alibi gap or a secret? This is the check that the field gives the clue back without a leak.

**Estimate (token-count estimate at the 3 and 15 USD per MTok assumed in Phase 2, which I could not check against a price list here):** a Part 2 call has about 25,000 input tokens (the module prompt about 7,500, Part 1 about 8,000, the conversation up to about 9,000) and 10,000 to 20,000 output tokens including adaptive thinking, so 0.25 to 0.50 USD each, about **2.5 USD for Tier 1 (range 1.8 to 3.5)**. Tier 2 is four Child calls at about 0.20 USD (Phase 2 measured this), **about 0.8 USD (0.6 to 1.0)**. **Total about 3.3 USD, range 2.4 to 4.5.** Tier 1 alone is a meaningful answer on wording safety; Tier 2 can be skipped or reduced to Marcus and Harry (0.4 USD) if budget matters. A control arm (the unchanged Parent85 prompt on the same inputs) is not proposed: the stored maps of these packages already are Parent77-era samples of the same prompt, and a doubled cost would not remove the sample noise of single calls.

**After a yes and a pass:** Jonathan imports Parent86 into Make; record `insert into prompt_version_history (kind, version, name, effective_from, approximate, note) values ('parent', 86, 'MM Live - Parent86 (Observer Field)', now(), false, '<note>')`. On the first detective purchase after import check that every `keyMomentPositions` entry in the stored `master_context` carries the field and that culprit sentences read like the others. A cheap SQL detector for a missing field is a sensible follow-up; it was not built here because it is only useful after the import.

## 7. Related gaps found while doing this (not fixed here)

- The intrigue design keeps the culprit's `alibiStatus: "false"` and the alibi details in `characterLocations`; an intrigue allowlist (Phase 1 finding 4) must drop or reduce them before intrigue can use any of this.
- Phase 3 needs the Child64 clause in 4.2, the `child-context` edge function, the failure policy for `CharacterContextError` and `(NOT FOUND)`, and the chat redaction from Phase 1b.

## 8. Files

`temp-files/build-parent-v86.py` and `temp-files/MM Live - Parent86 (Observer Field).blueprint.json` (both local, gitignored by `temp-files/*.py` and `temp-files/**/*.json`; the script is the reproducible record), `supabase/functions/_shared/characterContext.ts` and `.test.mjs`, `docs/adr/0156-per-character-redacted-master-context-for-detective-child.md`, `docs/adr/0156-phase1/findings.md`, `docs/adr/0156-phase2/findings.md`.

## Appendix: the exact text inserted into Parent86

Rule paragraph, inserted after the existing KEY-MOMENT POSITIONS paragraph, identical in modules 3000 and 4020:

```text
**WHAT AN OBSERVER SEES (field "whatAnObserverSees" on EVERY keyMomentPositions entry):** this is the only part of an entry that other characters' scripts will ever be shown, so it must be safe to say out loud in front of any suspect. Write it last, as one plain sentence of 8 to 25 words that says only what a bystander on this entry's canBeSeenBy list would literally see of this character at the key moment and could repeat aloud: where the character stands or sits, what they hold or carry, who they are speaking with or looking at, and ordinary visible movements.
Rules for whatAnObserverSees:
1. Observable verbs only: stands, sits, holds, carries, hands over, walks, speaks with, looks at, leans, laughs.
2. Never state or hint at intent, motive, method, secrecy, preparation, concealment or a result. No words of secrecy or purpose ("secretly", "quietly", "carefully", "while nobody was looking", "to make sure", "in order to"), no verbs of tampering, hiding or taking (slips, adds, doses, swaps, plants, hides, steals, spikes, removes), and nothing about what was done to the victim, a drink, a dish or any object, or what it contained. Describe a visible act in its ordinary outward form: "hands the victim a glass", never what was done to the glass.
3. Same length, tone and level of detail for every character. The culprit's and the accomplice's sentence must be indistinguishable from an innocent's: not longer, not more specific, not more suspicious.
4. It is true and adds nothing new: every fact in it must already be in truePosition, and it may name only cast members listed in besideOrNear. It covers only what is visible from where the observers stand; anything out of sight (behind a door, in another room, in a pocket) is left out. The culprit's false claim never appears here; it stays in the claimed-location and alibi fields.
5. If canBeSeenBy is empty, set whatAnObserverSees to "" (nobody can see this character, so nobody can say anything about them).
6. Write it in the same language as the rest of this document, using the natural equivalents of the words in these rules.
Example (do not copy): truePosition "At the buffet, where he swapped the labelled bottle for his own and passed the tray along" becomes whatAnObserverSees "At the buffet, holding a bottle and passing a tray along to the next guest."
```

Schema line in module 3000:

```text
{"character": "[Cast name]", "truePosition": "[Where they really were at the key moment, event-relative]", "besideOrNear": ["[cast names physically beside or near them]"], "canBeSeenBy": ["[cast names who could see them]"], "whatAnObserverSees": "[One plain sentence: only what a bystander would literally see of them at the key moment, no intent, method or result; empty string if canBeSeenBy is empty]"}
```

Schema line in module 4020 (the existing `truePosition` text in this line uses an em dash in the blueprint; shown here with a hyphen):

```text
{"character": "string", "truePosition": "string - where they really were at the key moment, event-relative", "besideOrNear": ["cast names physically beside or near them"], "canBeSeenBy": ["cast names who could see them"], "whatAnObserverSees": "string: one plain sentence: only what a bystander would literally see of them at the key moment, no intent, method or result; empty string if canBeSeenBy is empty"}
```
