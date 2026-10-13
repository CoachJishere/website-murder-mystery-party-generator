# ADR-0156: Give each detective character only the part of master_context it may know (PROPOSED)

**Status:** Proposed. Phases 1, 1b, 2 done; Phase 4 built and verified on real model output 2026-10-13 (pure functions and tests, a local Parent86 blueprint; nothing wired in or imported); Phase 3 not started
**Date:** 2026-10-13
**Related:** ADR-0153 (Phase 0 candidate 4, where this came from), ADR-0103 Addenda 81, 86, 91 (Child51 and the Silver Nightingale leaks), ADR-0142 (prompt prevention), ADR-0140 (propagation)

## Context

The detective Child writes each character's sheet from the **full** `master_context`: module 142 fetches the whole document and the prompt says "Master context (the mystery's full design)". That document contains the solution (who did it, how, the murderer's lies and alibi gap, the accomplice's role, the host briefing) and every other character's secret. A long rule block then tells the model not to use it ("An innocent character never refers to another character's hidden secret or to the murderer's hidden movements"). The role is not even given: the prompt asks the model to work out "murderer / accomplice / redHerring / suspect" by comparing the character name to the master context.

Evidence that this is a real, recurring problem and not a wording problem:
- Secret leaks are the second-largest reviewer category: **52 of 312 findings**, and **26 of the 93 findings in the detective Round Scripts call** (ADR-0153 Phase 0). The rule has been reworded in Child49, 50, 51 and 58.
- Child51 failed on its first purchase (Chef Gus named the culprit in three fields, Addendum 81). Parent73 and Parent77 reworded the matching closing-line rule.
- The Silver Nightingale sweep (Addendum 91): Vivian's and Felicity's questions to Juliet said "you spoke with Reginald privately", which only Juliet, Beatrice and the murderer's steward could know. The text is in `master_context.timelineFramework.otherSuspectsAlibis`, which every character received.

Phase 0's competing explanation 2 was "solution visibility": defects cluster where the generator holds the answer and is told not to use it. This ADR acts on that.

**What is in `master_context`** (14 recent detective packages, same structure in all, 45,000 to 77,000 characters each; average share of the document):

| Block | Share | Kind |
|---|---|---|
| murdererSelection, accompliceSelection, accompliceDetails, deceptionGuidelines, hostBriefing | about 18% | Pure solution: no innocent needs any of it |
| motiveDistribution (roles, elimination reasons), evidenceProgression (solutionLogic, murdererFlaw, whyOthersEliminated), murderMethod (execution, evidence left), timelineFramework (claimed location, alibi gap, other suspects' alibis, true positions) | about 37% | Mixed: public facts plus solution fields |
| conversationDetailsExtraction.characterSpecificDetails, victimProfile.wrongedEachCharacter | about 35% | Per-character secrets: a character needs its own entry only |
| relationshipMatrix, victimProfile public fields, evidence item descriptions | the rest | Public or needed |

## Decision (proposed)

Build `buildCharacterContext(masterContext, characterName, role)` and use it so each detective character receives a context made for it:

1. **Allowlist, not blocklist.** The output is built from named fields; any key the function does not know is dropped. A new key added to the Parent later is excluded by default and must be added on purpose.
2. **Culprit and accomplice** get the full context (they must lie consistently and confess correctly).
3. **Everyone else** gets: style/type; the victim's public profile; **its own** `wrongedEachCharacter` and `characterSpecificDetails` entries; the relationship matrix; the weapon and the Round 2 to 4 evidence item descriptions (not what they imply); public timeline facts; and `keyMomentPositions` filtered by what this character could observe (the character's own position, plus any character whose `canBeSeenBy` includes it).
4. **The role is passed explicitly** (from `mystery_characters.character_role`, already stored) instead of being inferred by name matching.
5. **Where it runs:** a new edge function `child-context` (TypeScript, shared module with Node tests, no LLM, 0 USD) called by one HTTP module in the Make detective route. The prompts reference its output instead of `{{142.master_context}}`. A `pipeline_settings.child_context_redaction` switch (`on` / `off`) makes the function return the full context when off, so a bad result is reverted without a Make import.
6. **Scope:** detective style only. Slip style has no fixed culprit in `master_context` (drawn at game time), so the leak class does not exist there.

## Phases

- **Phase 1 (free, one session).** Write and unit-test the function against the 14 real master contexts: for every innocent in every package, assert the output contains none of the culprit's name in a solution field, none of the culprit's/accomplice's secret sentences and none of another character's secret sentences, does contain the character's own entries, and report size (expected: a quarter to a half of the original). Check the Silver Nightingale case: Vivian's context must not contain Juliet's confrontation.
- **Phase 2 (paid, needs a yes with an estimate).** Replay: regenerate the innocents of two existing packages with the redacted context through `regenerate-child-content` and compare reviewer findings (secret leak, culprit named, wrong fact) with the originals. Rough cost: about 0.15 USD per character, so about 2 to 3 USD per 11-character package.
- **Phase 3.** Child64: add the HTTP module, swap the context reference in the detective calls (401, 405, 409), pass the role, keep the existing rules unchanged for one release so any change is attributable.
- **Phase 4 (only if Phase 3 shows eyewitness clues lost).** Parent: add `whatAnObserverSees` to each `keyMomentPositions` entry so a witness can state what they saw (for example "the steward at the sideboard with the tray") without receiving `truePosition` ("dosed the glass"). Until then the culprit's entry is omitted for characters who cannot see them, and for those who can it carries the claimed position only.

**How to judge it** (using `mystery_packages_prompt_versions`, ADR-0153 Update 1): secret_leak and culprit-named findings per detective package, before (about 2 secret_leak findings per package in the Round Scripts call, 13 detective packages) against the first 5 detective packages after Child64; also watch wrong_fact and cross_field_contradiction for a rise (characters knowing less could contradict each other more).

## Alternatives considered

- **Reword the rule again** (current practice): four attempts, still failing; Addendum 86 already says to stop.
- **Catch it afterwards** (reviewer): already the case, recall about 60 percent; it fixes, it does not prevent.
- **Ask an LLM to redact per character:** paid, unreliable on the exact thing it must not miss, rejected.
- **A blocklist of known solution keys:** simpler but fails open when the Parent adds a field; rejected for the allowlist.
- **Do it in Postgres instead of an edge function:** master_context is two JSON objects concatenated; parsing and filtering is clearer and testable in TypeScript.

## Consequences

- No new LLM spend. One extra HTTP operation per character in Make (a few dozen per package).
- Characters know less, so some cross-references that came from the full document (who saw what) rely on the position filter being right; Phase 1 and 2 exist to test exactly that.
- If it works, the long "innocent ignorance" rules in `content_coherence_rules` can be shortened later (a decision for a later ADR, measured, not assumed).
- Risk: a schema change in the Parent breaks the allowlist silently. Mitigation: the function logs the keys it dropped and a test fails if a known required key is missing.

## Discussion

Jonathan asked to scope this after ADR-0153 Phase 0 rejected prompt accretion as the cause but found that the best-supported lever was structural: do not hand the call what it must not use. The Silver Nightingale leak made it concrete, because the leaked fact was in a field every sheet received. The main design choice was allowlist versus blocklist, and filtered observation versus removal for positions: removal is safer and loses the eyewitness clues the game relies on, so Phase 1 filters by `canBeSeenBy` and Phase 4 adds an observer-safe description if needed. Whether the model then leaks less is not proven; Phase 2 is the cheap way to find out before any Make change.

## Phase 2 result (2026-10-13)

Replay of the 10 Silver Nightingale innocents with the redacted context (omit variant), about 2.2 USD, nothing written to the database. Verdict: **partly works**. The `master_context` leak (Juliet's confrontation) is gone from every other sheet; 2 of 10 sheets now state Harry's secret, copied from the customer's character list in the chat; Marcus and Harry lost the eyewitness clue about the steward. Recommendation: redact the chat's character list per character (Phase 1b) and add `whatAnObserverSees` (Phase 4) before Child64. Details: `docs/adr/0156-phase2/findings.md`.

## Phase 1b result (2026-10-13)

Chat redaction built and tested (`characterChat.ts`, `npm run test:charchat`, 14 tests, mutation-checked). On the 12 real chats the pairs where one character's hidden text is in another's chat fall from 822 to 50 (zero in 10 packages; the two customer-written story bibles keep a remainder, and strict mode keeps only 21 to 42 percent of their chat). No killer-plus-guilt sentence survives. Details and limits: `docs/adr/0156-phase1b/findings.md`.

## Phase 4 result (2026-10-13)

Built, not imported, no paid call. `whatAnObserverSees`: a new last key on every `timelineFramework.keyMomentPositions` entry, one plain sentence of 8 to 25 words saying only what a bystander on `canBeSeenBy` would literally see (empty string when nobody can see the character). Added to both Parent modules that define the map: 3000 (classic detective) and 4020 (intrigue), by `temp-files/build-parent-v86.py` into the local, gitignored `MM Live - Parent86 (Observer Field).blueprint.json`; the diff against Parent85 is three leaves (those two prompt texts, pure insertions, and the blueprint name). The three Child modules that read the map (401, 405, 409) are unchanged. Full design, wording rules, worked examples per type and the verification plan: `docs/adr/0156-phase4/design.md`.

- **`buildCharacterContext`:** an entry the viewer can see is given as that text for every character, culprit and accomplice included (the accomplice used to be dropped), so a culprit's entry has the same shape and style as an innocent's; the viewer's own entry stays `truePosition`; culprit names in other entries survive only for a culprit the viewer can see; an entry whose field is missing, empty, not a string or over 45 words falls back to the Phase 1 rules entry by entry. 58 tests (13 new, one on the real Silver design with hand-written observer texts), 12 mutations killed; Phase 1 sizes unchanged (median 0.104). One real bug found by the tests: the sentence splitter cut "Dr. Quill" at the full stop, so the observer text is treated as one unit.
- **Real maps:** only 4 of 14 recent packages carry a map and in 4 of the 6 culprit and accomplice entries among them nobody can see the culprit, so the field matters for culprits in about a third of the cases, but where it does (Silver Nightingale) it is the alibi-breaking clue.
- **Decision against a code wording filter:** an n-gram overlap guard against the solution text flagged 34 of 36 honest entries at 4 words and 11 of 36 at 6, so it was not built; a multi-language tamper-verb list was not built either. Wording safety rests on the Parent rule, the paid verification and the reviewer. This is the weakest point of the design.
- **Verification done (paid, approved, about 3.90 of the 4.5 USD cap; `docs/adr/0156-phase4/tier1-findings.md`):** the first wording (observer sentence derived from `truePosition`) kept the culprit clean but invented props in about 60 percent of sentences, once pointing at Harry's hidden identity ("holding a notebook"), so the order was inverted: the sentence is written first, before `truePosition`, which must begin with it. Final wording: 0 act, intent or secrecy words in 7 of 7 culprit and accomplice sentences over Silver Nightingale, Blackthorn, The Last Slice, the Swedish package and the intrigue S'more Heist, 0 invented details, field present on every entry. Tier 2 with `buildCharacterChatSafe`: 3 of 3 witnesses regain the "Simone behind Reginald's chair handing him his glass" clue, 0 of 4 sheets leak a secret or the act (Phase 2: 2 of 10). Limits: one sample per package, n = 4 sheets, Harry was not a witness in the sample, no reviewer run, no control for the Child.
- **Not done:** the Make import of Parent86 (Jonathan; a two-line wording tweak is recommended first: rule 4 "or already named in truePosition", rule 5 firmer), the Child64 clause, intrigue support in `buildCharacterContext` (still refused), a SQL detector for a missing field.

## Phase 3 scope (2026-10-13, free read of the code; nothing built)

What the code actually does today, which changes the ADR's Phase 3 sketch in three places:

1. **The Child never receives a role as input.** Modules 401/405/409 (detective route, router 200 route 0, filter `142.mystery_style = detective`) read `{{142.master_context}}` (Supabase search by `63.packageId`), `{{63.characterChatExcerpts}}` and `{{63.conversationContent}}`; the webhook payload built in the Parent (module 179 iterator) has name, description, index, packageId, scriptType, hasAccomplice, language, mysteryType, the chat excerpt and the chat, and no role. `characterRole` is an OUTPUT of Call 1, determined by the model from the design ("role_determination"). So "the role is passed explicitly from `mystery_characters.character_role`" needs checking first: if the row has no role before Call 1 (the Child upserts the row after Call 1), the edge function must derive the role from `master_context` itself (murderer and accomplice names via `sameCharacter`), which `buildCharacterContext` already does internally. Deriving it is deterministic and independent of row timing; recommended.
2. **There is a second consumer of the full design: `supabase/functions/regenerate-child-content/index.ts`** (1,325 lines; line 1088 `masterContextStr` goes whole into its prompts, line 1179 a truncated excerpt of the chat). Every sweep and auto-heal that regenerates a character goes through it, so redacting only the Make route would leave the leak open on every regeneration. It must use the same functions (or be consciously left out and documented).
3. **Two prompt surfaces per call, not one:** besides `{{142.master_context}}` the chat arrives twice (`characterChatExcerpts` and `conversationContent`); Phase 1b's functions replace both.

Proposed shape: edge function `child-context` (input `packageId`, `characterName`; reads master_context and the chat from the database, derives the role, returns `{context, chat, excerpt, flags, redacted: bool}`), one HTTP module in the detective route after 142, Child64 (401/405/409 reference its outputs; the long innocent-ignorance rules stay for one release so any change is attributable), `pipeline_settings.child_context_redaction` = `on` / `off` / `test_only` (default `off`; `off` returns the full context and the full chat, i.e. today's behaviour). Failure policy to decide with Jonathan: unsupported schema (intrigue), unreadable `master_context`, own entry not found, chat list not recognised: recommended fallback to today's full inputs plus a logged row and an alert, never a blank sheet. Verification: unit tests for the function, then a Child-only re-fire on an `is_test` package (paid, about 0.2 USD per character, needs a yes) before any real purchase; compare reviewer findings per `mystery_packages_prompt_versions` over the first 5 detective purchases.

## Key files

`temp-files/MM Live - Child (Unified)63-QuoteTalkRemoved.blueprint.json` (module 142, prompts 401, 405, 409), `docs/adr/0153-phase0/findings.md`, `docs/adr/0103-new-purchase-coherence-sweep-ritual.md` (Addenda 81, 86, 91), `supabase/functions/regenerate-child-content/index.ts`, `supabase/migrations/20261013140000_prompt_version_history.sql`.

## Phase 1 result (2026-10-13)

Built `buildCharacterContext(masterContext, characterName, role, options?)` in `supabase/functions/_shared/characterContext.ts` (pure, allowlist, no LLM) with `npm run test:charcontext` (45 tests; the real-data ones skip cleanly when `temp-files/charctx/` is absent). Full evidence: `docs/adr/0156-phase1/findings.md`. No paid call, database write, edge function, Make edit or prompt change.

- **Verdict: READY WITH CHANGES.** All leak checks pass for 119 innocents in 12 packages (culprit deception, alibi gap, reasoning and secrets; every other character's secret; solution keys). Murderer and accomplice get the input byte for byte. Two of the 14 packages use a different "intrigue" shape and are refused (throws), not guessed.
- **Median innocent context is 10.3 percent of the full document** (range 8.4 to 16.3, 4,500 to 11,200 characters), not the quarter to a half estimated above: the per-character blocks collapse to one entry in 8 to 21.
- **Decisions the data forced:** `activitiesAndSchemes`, `murderWindowStart/End` and `keyEventsBeforeMurder` are dropped (they name the culprit or the method); sentences naming the murderer or accomplice are removed from the "public" fields (`specificEvents`, `victimLastSeen`, `bodyDiscovered`, `weapon`) and from other characters' position entries, because even those leaked in 6 to 8 of 12 packages; an unknown or empty role is treated as an innocent; unreadable input throws and never returns the full text for an innocent.
- **Changes needed before Phase 2 (paid):** (1) replay only packages that carry `keyMomentPositions` (4 of the 12; the other 8 give an innocent no position information); (2) choose how a witness sees the murderer, option `visibleMurderer: "claimed"` (ADR default, contradicts a witness's own entry in 1 of 4 Silver witnesses and uses a field the Child rules call off limits) or `"omit"` (recommended first arm); (3) fix the caller's failure policy for thrown errors and `(NOT FOUND)` own entries (2 characters in El Ultimo Trago); (4) intrigue designs are out of scope.
- **Known cost:** nobody receives Juliet's corridor confrontation (it lives only in `otherSuspectsAlibis`), so Juliet cannot write her own scene; witnesses Marcus and Harry lose their view of the steward; evidence ownership (`namedItems`) and other characters' occupations are no longer in the context. Phase 4's `whatAnObserverSees` is the structural fix for the first two. Phase 2 must watch wrong_fact and cross_field_contradiction, not only secret_leak.
- **Not claimed:** that the model leaks less. Phase 1 shows only what it is no longer handed.
