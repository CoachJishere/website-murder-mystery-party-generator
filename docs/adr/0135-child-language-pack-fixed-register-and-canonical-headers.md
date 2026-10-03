# ADR-0135: Child language pack: fixed speech register and canonical section headers per language

- **Status:** Accepted (direction); Child53 built, **not yet imported or tested in Make.com**
- **Date:** 2026-10-03
- **Related:** [ADR-0103](0103-new-purchase-coherence-sweep-ritual.md) Addenda 13, 56, 76, 78 (the drift cases), [ADR-0093](0093-explicit-language-parameter-for-child-generation.md) and [ADR-0112](0112-child-generation-language-should-follow-the-conversation-not-the-account.md) (how the language reaches the Child), [ADR-0134](0134-relationship-lists-follow-the-matrix.md) (Child52, which Child53 builds on)

## Context

Language drift keeps costing sweep time: formal/informal register slipping mid-character (German Sie/du, Spanish tú/usted, and in the 2026-10-02 Spanish package vosotros sliding into ustedes in 9 fields across 4 characters), English section labels in non-English packages (6 packages in 60 days), and inconsistent wording of the same label across characters. Jonathan asked whether a separate scenario per language would fix it.

Two structural causes found in the Child blueprint (Child52), neither of which a per-language scenario would touch:

1. **The register rule cannot be followed.** Child45's REGISTER CONSISTENCY bullet says a character's own introduction establishes their register for every other field. But the Child makes 8 independent Claude calls per character (401 background/relationships/secret/introduction, 405 rumors/accusations, 409 round scripts, and the 5xx slip equivalents) and **no call reads another call's output**: the only inputs are `{{63.*}}` and `{{142.master_context}}`. Seven of the eight calls never see the introduction, so each guesses. The rule also names only singular address ("Spanish tu/usted"); plural address (vosotros vs ustedes), the thing that drifted, is not mentioned. (Same shape elsewhere: node 513 tells the model its guilty scripts should be 85-90% similar to "the innocent scripts you produced in the previous step", which it also cannot see.)
2. **Headers are translated independently in every call.** Measured over the non-English packages since 2026-06-01 (1,971 header-bearing fields): distinct wordings per field averaged **de 10.2, it 13.8, pt 12.4, fr 6.8, es 4.0**, and the most common wording covered only 34 to 68% of fields. Worse, French and Portuguese frequently shipped **English** labels: every French "IF YOU'RE INNOCENT / GUILTY / THE ACCOMPLICE" header (36 of 36 each) and most Portuguese round headers and "YOUR SCRIPT" (30 of 30) were English. The existing instruction ("translate these") is not enough.

## Decision

1. **Child53** (`MM Live - Child (Unified)53-LanguagePack`, `temp-files/build-child-v53.py`, built from Child52 so it includes the ADR-0134 relationships fix; exactly the 8 prompt texts differ): in all 8 nodes the REGISTER CONSISTENCY bullet is replaced by a LANGUAGE PACK bullet, and the label-translation sentence in `language_instruction` now points at it.
   - **Register is fixed by language, never inferred:** always informal among guests, never formal. Spanish tú + vosotros (ustedes only if master_context places the story in Latin America), Portuguese você/vocês (tu only if set in Portugal), German du/ihr, French tu (one person) / vous (group), Italian tu/voi, Dutch je/jullie, plus one-line rules for Danish, Swedish, Finnish, Korean, Japanese and Chinese. The only per-package variable (Latin America, Portugal) comes from `master_context`, the one input all 8 calls share, so they decide the same way.
   - **Canonical labels:** an exact "English label => label to use" table per language for the labels each node writes, from `docs/language-pack/header-labels.json` (the reviewable source of truth). Spanish, German, French, Italian, Portuguese and Dutch have tables; other languages get the instruction to translate each label once and never leave English.
   - **No stray English:** an explicit rule against English words and other scripts inside sentences (the `until`/`more`/`last` and Cyrillic glitches of ADR-0103 Addendum 78).
   - The pack sits inside `{{if(63.language = "English"; ""; "...")}}`, so English packages (about 91% of orders) send nothing extra. The pack is one single-line string with no double quotes, backslashes, semicolons, braces or newlines, to stay safe inside a Make formula; the build script asserts that.
2. **No new scenarios or branches.** The change is data inside the existing prompts. If real divergence is ever needed, add a Router route inside the existing Child (the slip/detective split already works that way) before creating a new scenario and webhook.
3. **Jonathan imports and tests:** one English and one Spanish character fired at the Child webhook (as in ADR-0093) before relying on it; the English run is the important one because a formula error would fail every module.

## Rationale

- It fixes both structural causes at once with one prompt change and no new moving parts: a rule that depends on data the call does not have is replaced by a rule that depends only on `{{63.language}}`.
- A per-language scenario would keep the same independent calls, so drift would remain; and it would multiply a blueprint that already needs a new version for almost every fix (Child is at 53, Parent at 73) by 13.
- The cost is confined to non-English orders: roughly 1.1 to 1.8K extra input tokens per call, about 100 to 170K per package (an assumption of about 0.35 to 0.5 USD at 3 USD per million input tokens; check against the real model price). English: zero.

## Alternatives Considered

- **13 per-language Child scenarios:** rejected (above).
- **Inject the pack from the edge function through the Parent:** cleaner to unit test but adds 8 Parent send modules and JSON-escaping of a long string in the Parent; rejected for now, revisit if the Make formula proves fragile.
- **Always-on static pack (no `if`):** zero formula risk but about 1.5K extra tokens on every English call (roughly 0.4 USD, 2% of the price of an order); the fallback if the `if()` wrapper misbehaves.
- **Let the character pick formal or informal from setting:** rejected; independent calls would decide differently, which is exactly the drift. Consistency beats period flavour.

## Consequences

- Characters in non-English packages will use one register everywhere and identical labels across all characters. A butler will say "tú" to a lord; accepted.
- Header wording for French, Italian and Portuguese changes from what earlier customers received (Italian "ROUND" becomes "TURNO", French "ROUND" becomes "MANCHE", Portuguese English labels become Portuguese). Dutch and the labels not already delivered were written for this pack and **have had no native-speaker review**: worth a pass by a speaker of each before the volume justifies it, and the JSON is the one file to edit.
- Not covered: the detective script and host guide (Parent), the pointform fields, and languages without a table (Danish, Swedish, Finnish, Korean, Japanese, Chinese), which only get the instruction.
- Verification is by the next real non-English purchase: check register, label wording, and that no English label remains.

## Key files
- `docs/language-pack/header-labels.json`
- `temp-files/build-child-v53.py`, `temp-files/MM Live - Child (Unified)53-LanguagePack.blueprint.json` (gitignored; import into Make)

## Addendum 1 (2026-10-03): Child54, victim pronouns

**Trigger.** "Boogie Nights, Bloody Nights" (ADR-0103 Addendum 79): the customer's concept and 12 of 14 characters wrote the victim gender-neutral ("they"), but Lena used she/her for the victim in about ten places, Pete wrote "Dusty herself", Francesca "a man's drink", Dot "golden girl". Same structural cause as the register drift above: the 8 Child calls are independent and each picks its own pronoun for the victim. It cannot be caught by a regex (it needs the per-package convention), so it is fixed at the source.

**Decision.** `Child54` (`MM Live - Child (Unified)54-VictimPronouns`, `temp-files/build-child-v54.py`, built from Child53 so it carries the ADR-0134 relationships fix and this ADR's language pack): one new `VICTIM PRONOUNS` bullet in all 8 nodes (401 405 409 501 505 509 513 517), inserted before the BLACKMAIL / SECRET LOGIC bullet and **outside** the language-pack `if()` so it applies to English (about 91% of orders) too. Rule: name the victim when possible; use a pronoun only when `master_context` refers to the victim with one consistent gender; if it uses none, mixes genders or never states one, treat the victim as gender-neutral (they/them/their or the natural neutral wording in the output language, rewording if needed), never he/she/man/woman/boy/girl/guy/lady, for every field and every character; other characters keep their own pronouns. The build script asserts the anchor appears exactly once per node and a diff against Child53 confirms exactly 8 changed strings, each +927 characters. The text has no double quotes, backslashes, braces or newlines, so it is safe in Make. Cost: about 230 extra input tokens per call, about 1.9K per package, on every package (roughly 0.006 USD at the 3 USD per million assumption).

**Known limit.** `master_context` itself is not always consistent (on this package it wrote "she" once for the victim in a long field), so a mixed `master_context` falls back to they/them by design. A cleaner fix is for the Parent to emit an explicit `victimPronouns` field; deferred until Child54 shows whether the fallback is enough.

**Jonathan imports and tests:** the English test is the important one (a formula or text error would fail every module): fire one English character at the Child webhook, then check the victim is "they" or the name throughout and that no other character's pronouns changed. Not yet imported.
