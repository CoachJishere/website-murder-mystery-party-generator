# ADR-0156 Phase 1b findings: the customer's chat, redacted per character (2026-10-13)

Why: the Phase 2 replay showed the chat is the larger leak path (2 of 10 replayed sheets repeated Harry's secret from the customer's own character list). The Child receives the full chat (`conversationContent`) and, per character, every message that names the character (`characterChatExcerpts`, built in `mystery-webhook-trigger`; a concept message names everyone, so each excerpt carries the whole cast list).

Built (pure functions, no Deno APIs, no production change): `supabase/functions/_shared/characterChat.ts` with `buildCharacterChat`, `buildCharacterChatSafe`, `otherCharactersHiddenText`, `hiddenSurvivors`. Tests: `npm run test:charchat` (14 tests: 10 synthetic committed; real-data checks skip cleanly without `temp-files/charctx/`). To support it, `fold`, `tokenSet` and `culpritRegex` in `characterContext.ts` are now exported (no behaviour change; `test:charcontext` still passes).

## What it does

Culprit and accomplice get the chat unchanged. Everyone else gets it with: (1) every OTHER character's blurb withheld ("Harry Dunmore (played by Cole M) - [details withheld]"; numbered, bulleted, bold, heading-block and plain-line formats; dual-gender names such as "Theo/Thea Baptiste" matched by either part); (2) sections headed as the killer or solution dropped; (3) sentences that name the murderer or accomplice next to a guilt word removed; (4) lines that name another character beside a secret cue word withheld. `buildCharacterChatSafe` checks the design's hidden text about the other characters against the result and, if any 6-word run survives, redoes the pass in **strict** mode (every line that names another character is withheld). If the character list cannot be recognised the chat is not blanked and `flags` says `character-list-not-recognised` (fail open, as today).

## Results on the 12 real detective chats (119 innocents, six languages' worth of formats: en, sv, fr, es, nl-style lists)

| Measure | Before | After |
|---|---|---|
| Character-to-character pairs whose hidden text from the design appears in the chat | 822 | **50** (Thanksgiving 28, Storm Hit 22, all other 10 packages 0) |
| Lists recognised | n/a | 12 of 12 (an earlier version missed 3 packages with dual-gender names; fixed) |
| Silver Nightingale: Bartholomew sees "journalist"; Harry sees it | yes / yes | **no / yes** |
| Sentences naming the murderer or accomplice next to a guilt word | 19 (Thanksgiving), 12 (Storm Hit), 2, 1 | **0** survive (a test asserts it) |
| Median chat size kept | | 76 percent (range 21 to 100); 42 of 119 needed the strict pass |

Mutation checks (by hand, not committed): never withholding other characters' blurbs, and not dropping killer sections, each make the suite fail.

## Limits, stated plainly

- **Two packages are customer-written story bibles** (The Last Thanksgiving, 48,000 characters; The Night The Storm Hit, 27,000 with a minute-by-minute timeline). Even strict mode leaves a remainder (28 and 22 pairs): facts about other characters stated in lines that never name them (pronoun continuations, descriptors such as "the patriarch"). The strict pass also cuts these chats to 21 to 42 percent, so the Child will have less of the customer's design intent for those packages; whether the sheets suffer is not measured (Phase 2 used a plain-list package).
- Line-based: a secret stated in prose that names no one, or by role ("the steward", "the physician"), is not caught.
- The measure is text overlap with the design's own hidden text, so a paraphrase would not register. `characterChatExcerpts` was not tested as a separate input; it is the same text (messages that name the character) and goes through the same function, but only the full chat was measured.
- Intrigue-type designs (2 of 14 packages) and the slip style are out of scope as in Phase 1.

## What this changes for the plan

With Phase 1 (master_context) and Phase 1b (chat) the model is handed none of the other characters' secrets on 10 of the 12 packages and a much smaller remainder on the two story-bible ones. Child64 can now be built against both functions behind one edge function (`child-context`) that returns the redacted context, chat and excerpts; the switch stays. A second replay (about 2 USD) should use **Blackthorn Manor** (different cast, plain list) and, if budget allows, one story-bible package, to see what strict mode costs in sheet quality. The eyewitness field for the Parent (item 2) is independent and can proceed in parallel in another tab.
