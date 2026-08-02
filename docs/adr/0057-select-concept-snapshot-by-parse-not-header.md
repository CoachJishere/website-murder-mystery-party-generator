# ADR-0057: Choose the concept snapshot by parsing for a cast, not by matching a header

- **Status:** Accepted
- **Date:** 2026-08-02
- **Related:** ADR-0043 (concept-completeness entry gate), ADR-0055, ADR-0056

## Context

On 2026-08-01 a customer bought "The Case Of The Stolen Golden Flamingo" and received a mystery with an entirely different cast, setting and premise from the one she had designed in chat. She emailed: *"The mystery I generated using the AI tool you provided is completely different then the one that I'm seeing after my purchase."*

She was right, and generation had not failed. It had succeeded perfectly — from the wrong draft.

Her chat produced three concept messages:

| Time | Concept | Section header the model chose |
|---|---|---|
| 17:21 | generic names, guests roleplay the suspects | `## Character List (8 players)` |
| 17:31 | Hawaiian luau, players investigate | `## Suspect List (8 fictional characters — players investigate them)` |
| 17:35 | + Polly Paradise / Captain Kei / Tiki Tina | `## Suspect List (…)` |

`conversations.approved_concept_message_id` pointed at **17:21**.

The snapshot was chosen by testing each assistant message against a hardcoded header allow-list:

```ts
/^#{2,3}\s+(?:Character List|Characters|Cast of Characters|Complete Character List|COMPLETE CHARACTER LIST|Full Character List)/im
```

When her revision request ("can there be 8 fictional suspects and the players act as the investigators instead?") caused the model to rename the section **"Suspect List"**, her two later drafts stopped matching. "Latest match" therefore resolved to the only message that still matched — her first draft. The written value was non-null, so the edge function's null-only auto-snapshot fallback never corrected it, and nothing errored.

The failure is completely silent. Correct title, correct `player_count`, `generation_status = completed`, one clean run in `child_generation_attempts`. No detector covers it. It surfaced only because the customer complained.

This is the same shape as ADR-0055 and ADR-0056, both found the same day: **two predicates that must agree about one concept, expressed differently and updated independently.** Here the chooser tested header *wording* while the reader (`extractCharactersFromMessages`) parsed *lines* — so the chooser could hand the reader a message the reader could not read, and vice versa.

## Decision

Stop testing header wording. Introduce one function, `extractRosterFromMessage(content)`, that answers "what cast does this message propose?" — explicit-header section first, then a header-agnostic batch pattern (4+ consecutive numbered or bold `Name - description` lines) — and use it for **both** jobs:

- `findLatestConceptMessage(messages)` selects the snapshot: the chronologically last assistant message whose parse yields ≥ `MIN_ROSTER_SIZE` (4) names.
- `extractCharactersFromMessages` reads the approved message through the same function.

Because selection and extraction are now the *same code*, not two agreeing predicates, the snapshot can never point at a message the extractor cannot read. The header allow-list survives only as the preferred *starting point* inside the parser, never as the gate.

Also **delete `src/components/MysteryChatCreator.tsx`** (290 lines), which carried a second, already-divergent copy of the same allow-list (`Character List|Characters|Cast of Characters` — even shorter than the edge function's) and also wrote `approved_concept_message_id`. It was dead: imported nowhere in `src/`, and its update wrote `conversations.generation_requested`, a column that does not exist, so the call would have failed outright. Build and typecheck pass without it.

## Rationale

- **Header text is model output; it will keep drifting.** Every fix that extends the allow-list buys time until the model picks the next synonym. "Suspect List" was not exotic — it was the natural wording once the customer asked for players-as-investigators. Parsing for a cast is a property of the content, not of the phrasing.
- **One function beats two agreeing predicates.** Three separate instances of predicate drift landed in a single day. The durable move is to remove the second predicate rather than to keep them synchronised by discipline.
- **The batch path already existed and already worked.** `extractCharactersFromMessages`' secondary extraction successfully read her "Suspect List" message during recovery — the parsing capability was there all along; only the *chooser* lacked it. This change mostly relocates existing logic to where it was missing.
- **Deleting the dead component removes a trap, not working code.** A future maintainer grepping for `approved_concept_message_id` would have found two writers with different rules and no indication that one is unreachable.

## Alternatives Considered

- **Add "Suspect List" (and friends) to `CHARACTER_LIST_HEADERS`.** The obvious one-line fix, and the one originally scoped. Rejected as the primary fix: it treats the instance, leaves the chooser/reader split intact, and the next synonym reproduces the bug on another paying customer. The header list is retained inside the parser, so this case is covered anyway.
- **Warn when assistant messages exist after the snapshot.** Useful as detection, not as a fix, and noisy — plenty of post-snapshot chatter is innocuous. Better expressed as a sweep query (below) than a runtime gate.
- **Ask the customer to confirm what will be sent to the generator before payment.** The most robust answer, and still open. It is a product/UX change needing design, not a bug fix, and it would not have helped the customers already affected.
- **Keep `MysteryChatCreator.tsx` and fix its copy too.** Rejected: fixing unreachable code that writes a non-existent column preserves the hazard (two writers, divergent rules) for no benefit.

## Consequences

- The snapshot now follows the customer's latest concept regardless of how the model titles the section.
- Conversations whose roster is prose-only (no numbered/bold list) select nothing and fall through to the existing Claude-based extraction — unchanged behaviour.
- `MIN_ROSTER_SIZE = 4` is inherited from the pre-existing batch threshold, so a genuine 3-player mystery would not be recognised as a cast. No such package exists; noted rather than fixed.
- One writer of `approved_concept_message_id` remains (the edge function).
- Regression coverage in `scripts/__tests__/conceptSnapshot.test.mjs`, including an assertion that the selection block does **not** contain a header-name test — so reintroducing the allow-list as the gate fails the test regardless of which names are used.
- **Not addressed:** the affected-customer sweep. This fixes new generations; it does not identify past packages built from a superseded draft. That query is still outstanding.

## Key files

- `supabase/functions/mystery-webhook-trigger/index.ts` — `extractRosterFromMessage`, `findLatestConceptMessage`, snapshot block
- `scripts/__tests__/conceptSnapshot.test.mjs` — 9 checks incl. the live regression
- `src/components/MysteryChatCreator.tsx` — deleted
- `docs/adr/0043-concept-completeness-entry-gate.md` — the gate that assumed a findable concept message

## Discussion

The instinct was to add `"Suspect List"` to the array and move on; it is one line and it fixes the reported case. What argued against it is that the same class of bug had already been found twice that morning in unrelated code — the completion gate versus the detector RPCs (ADR-0055), and the detector versus the retargeter (ADR-0056). Three instances in a day is not coincidence, it is a pattern: this codebase repeatedly encodes one concept as two predicates in two languages, and they drift.

The strongest available fix is not "keep them in sync" but "have only one." That was achievable here because the parsing logic already existed on the reading side; the chooser simply never used it.

Worth being clear about what this does *not* fix. The customer's underlying request — guests act as investigators, the eight suspects are fictional characters nobody plays — is a format the generator does not build. Her rebuilt package has the right theme, cast, plot and culprit, but it is still eight playable roles. That is a product gap, not a bug, and no amount of snapshot correctness addresses it. It is recorded here so the connection between "she asked for investigators" and "the header got renamed" is not lost: the format request is what triggered the rename that triggered the bug.

The verification approach follows ADR-0056: transpile the shipped prelude with esbuild and test the real functions, never a copy. The most valuable assertion is arguably the negative one — that the selection block contains no header-name test — because it guards the *shape* of the mistake rather than the specific strings, and that is what would otherwise creep back in.
