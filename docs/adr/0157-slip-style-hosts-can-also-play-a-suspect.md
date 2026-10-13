# ADR-0157: Host guide lets the host of a slip-style game also play a suspect

- **Status:** Accepted
- **Date:** 2026-10-13

## Context

A paying customer ("Dead Man's Saddle", slip style, 6 players, ADR-0103 Addendum 93) wrote on 2026-10-12 that she wanted to host and also play a character without learning the other scripts, the clues or the killer, and that the guide did not seem to allow it. She was right about the guide, not about the product.

What the guide says today (`HostGuideTemplate.tsx`, `hostGuide.*` keys, 13 locales):
- Option 1, "Host as Detective", for character-based (slip) games: "you do NOT participate as a suspect".
- Option 2, "Audio Detective", is the only route where the host plays a suspect, and it needs the host to generate audio of the detective script first.
- Checklist item 2 tells every host to skim every character's secret.

What the product does for a slip-style game: the culprit is drawn from slips at game time, so nothing is predetermined. The detective script says only "Whoever drew the Culprit slip" and names no one (ADR-0103 Addendum 84 and the `slip_reveal_names_cast_member` and `slip_culprit_leak` detectors enforce this); the evidence cards' "Host Only" notes are checked by `evidence_culprit_spoiler`. So the narration and the host guide are spoiler-free for the culprit, and a host who draws a slip like everyone else can read them aloud and play. The only thing a playing host sees early is each round's evidence, at the same moment as the guests.

In detective style this is not true: the detective script and Detective Guide name the murderer, so the same advice would spoil the game. Option 2 (audio) remains the only route there and is unchanged.

## Decision

For `mystery_style = 'character'` (slip) only, add to the guide:
1. A short block after Option 2, "Host who also plays a suspect (slip-draw mysteries)": take a character page and draw a slip like everyone else; read the narration script aloud between rounds (it never names the guilty player); skip the other characters' pages (you will see each round's evidence at the same time as your guests, and nothing in the guide names who is guilty); fold and shuffle the slips without looking, or let a guest prepare them, so you do not know who drew what.
2. A character-based variant of checklist item 2 that says to skip the other characters' secrets when you are also playing.
3. Reword the character-based Option 1 note so it no longer says the host does not participate as a suspect: it now says "if you will not play a suspect...".

No change for detective style. No change to generated content, prompts, Make.com or the database. Translated into all 12 non-English locales by hand (no paid API).

## Rationale

The feature already exists in the product; only the guide denies it. Fixing the text is free, deterministic and removes a support cost and a refund risk (the customer's Oct 10 mails asked for a refund; the Oct 12 mail shows the guide is the remaining friction). Scoping to slip style keeps the claim true by construction.

## Alternatives Considered

- **Reply to the customer only.** Done as well (Jonathan sent it), but every slip-style host reads the same guide, so the next one hits the same wall.
- **A "host plays" toggle at order time that changes generation.** Unnecessary: slip-style generation is already host-neutral; a toggle would add a branch to Make.com and the reviewer for no content difference.
- **Also cover detective style by generating a spoiler-free host version of the Detective Guide.** Large, touches generation, and not requested. Deferred; Option 2 (audio) remains.
- **Only English.** Rejected: 13 locales are supported and the guide must not contradict itself by language.

## Consequences

- 10 new `hostGuide` keys in 13 locales and two reworded keys; the guide for slip-style games grows by one short block.
- The claim "nothing in the guide names who is guilty" now rests on the slip-style leak detectors staying healthy; a regression there is also a regression of this text. Note in the sweep: a slip package whose detective script names a cast member is more serious than before.
- The Game Overview of packages generated before Parent83 (2026-10-12) still names some characters' hidden motives; the text promises only that the culprit is not named, not that no secrets are.

## Discussion

Jonathan approved scoping to slip style and building it in this session after the sweep ("yes 3"). The trade-off debated was how much to promise: "you will not learn the killer" is guaranteed by design, "you will not learn any clue" is not (the host presents each round's evidence), so the text says the host sees the evidence when the guests do.

## Key files

- `src/components/HostGuideTemplate.tsx`
- `src/i18n/locales/*.json` (`hostGuide.setupChoice.*`, `hostGuide.checklist.*`)
