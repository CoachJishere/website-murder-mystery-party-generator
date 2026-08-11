# ADR-0073: Purchase-preview character parser was English-only, blocking non-English checkout

- **Status:** Accepted
- **Date:** 2026-08-11
- **Related:** ADR-0057 (select concept by parse, not header), ADR-0063 (structural roster continuation parsing), ADR-0068 (roster annotation breaks character-line regex)

## Context

Customer (Julia Sobral Perpétuo Cardeal, `juliaperpetuounioeste@gmail.com`, user `4550a06b-65ea-444d-8799-fd95450cdf1e`, conversations `0c8ac967-61df-4630-b5b6-38efac25dff4` and `d70eb6b6-c215-4123-8221-27bb6db3eeea`) contacted support (pt) unable to finish checkout: "Não conseguimos detectar sua lista de personagens. Volte e verifique se o design do seu mistério inclui todos os personagens."

Her approved concept was well-formed:

```
## Lista de Personagens (6 jogadores)

1. **Valentina Duarte** – A mega-estrela da novela, carismática e talentosa...
2. **Morgan Castelli** – Diretora visionária da novela "Destinos Cruzados"...
...
```

Root cause: `parseCharacters()` in `src/pages/MysteryPurchase.tsx` — a separate, client-side parser used only to build the pre-purchase preview card — looked for the character-list section using an English-only header allow-list:

```js
const characterSectionsPatterns = [
  /(?:##?\s*(?:CHARACTER LIST|Characters|CHARACTERS|CHARACTER|SUSPECTS))([\s\S]*?)(?=##|$)/i,
  ...
];
...
if (!characterSection) return characters; // empty array
```

"Lista de Personagens" never matches. `characters.length` stays 0, which drives two effects in the same render: `MysteryPreviewCard.tsx` shows the amber "couldn't detect your character list" warning, and `MysteryPurchase.tsx` (line ~667) hides the normal checkout button entirely, replacing it with a "back to design" prompt — a real blocker, not a cosmetic warning.

The actual generation backend, `supabase/functions/mystery-webhook-trigger/index.ts`, had already been through this exact problem and was fixed for it: `extractRosterFromMessage()` carries a `CHARACTER_LIST_HEADERS` list covering all 13 site locales (including "Lista de Personagens"), and — per ADR-0057 — also has a fully header-agnostic batch path that requires no header match at all, just 4+ consecutive numbered/bold "Name – description" lines. Julia's roster would have generated correctly had she been able to get past the purchase-preview gate. This is the same "paired-predicate drift" class already logged for this codebase: two independent implementations of "does this message contain a character list," evolved on separate timelines, one fixed and one left stale.

## Decision

Fixed `parseCharacters()` in `src/pages/MysteryPurchase.tsx` to fall back to a header-agnostic scan (same principle as the edge function's batch path) when no English header section is found: scan the whole message for a run of 4+ consecutive numbered/bold `**Name** – description` lines and use that run directly, regardless of what heading (if any) preceded it or what language it's in.

Did not port the `CHARACTER_LIST_HEADERS` locale list into this file. A second copy of a 26-entry locale list is exactly the drift risk that caused this bug — the header-agnostic scan needs no header text at all, so there is nothing to keep in sync.

## Rationale

- **Structure over wording, again.** Same lesson as ADR-0057/0063/0068 in the sibling file: the model's header phrasing is free to vary (by language, by prompt revision, by the model choosing a synonym), so gating on a fixed vocabulary is inherently fragile. A run-length check on the actual roster shape does not care what language or heading precedes it.
- **Don't duplicate a maintained list.** Copying `CHARACTER_LIST_HEADERS` would fix this incident but reintroduce the two-implementations-drift risk this ADR is about — a 14th locale added to the site, or a new header variant the model starts using, would only get fixed in one of the two places again.
- **Fix scoped to the client preview only.** The backend extractor was already correct; no changes to `mystery-webhook-trigger`.

## Alternatives Considered

- **Import/duplicate `CHARACTER_LIST_HEADERS` from the edge function into the client parser.** Rejected — see Rationale; keeps the two-parser drift risk alive.
- **Extract a shared parsing module used by both the Vite frontend and the Deno edge function.** More correct long-term (one implementation, not two structurally-similar ones), but a larger refactor than this incident calls for; left as a follow-up, not done here.
- **Loosen the gate to always show the purchase button regardless of parse result.** Rejected — the button gate exists deliberately (ADR-0044, "the Victorian mansion incident") to stop taking payment for a mystery that doesn't have an approved concept yet; the fix needed to be a better parse, not a weaker gate.

## Consequences

- Non-English customers whose approved concept uses a localized section header (or no recognizable header at all) can now reach checkout. This was blocking 100% of such cases, not an edge case — likely to have affected checkout completion for pt/es/fr/de/it/nl/da/sv/fi/ko/ja/zh-cn customers generally, not just Julia.
- **No backfill/sweep done.** This blocks checkout before payment — nobody in this state has a package to fix — so there's no equivalent of the ADR-0068 hand-patch. Julia was told to retry the purchase flow.
- **Follow-up not done:** extracting a single shared roster-parser module for both the frontend and the edge function, so this class of drift structurally can't recur. Logged here rather than actioned.

## Key files

- `src/pages/MysteryPurchase.tsx` — `parseCharacters()`
- `src/components/purchase/MysteryPreviewCard.tsx` — renders the warning this bug triggered (unchanged)
- `supabase/functions/mystery-webhook-trigger/index.ts` — `extractRosterFromMessage()`, the already-correct sibling implementation this fix takes its structural-fallback approach from

## Discussion

The chain that surfaced this: the customer's own bug report was specific enough ("Não conseguimos detectar sua lista de personagens" — the exact frontend copy) to go straight to the string, `noCharactersWarning`, then to its one call site, then to the boolean gate one component up controlling the checkout button. Confirming her roster was actually well-formed (not a real content problem) took pulling her live `messages` rows and testing them against both parsers side by side — the edge function's parser matched fine, the client parser didn't, which is what pinned the cause to the client-only file rather than anything server-side or content-side.
