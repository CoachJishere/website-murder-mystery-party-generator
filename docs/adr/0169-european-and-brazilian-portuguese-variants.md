# ADR-0169: European and Brazilian Portuguese as two variants, chosen by the browser's language

- **Status:** Accepted 2026-10-17 (Jonathan: "do your reco"); LIVE since 2026-10-17 19:20 UTC (Child69 imported, `portuguese_variants` on); not yet seen on a real Portuguese purchase.
- **Date:** 2026-10-17
- **Related:** ADR-0135 (language pack), ADR-0152 (label conformity heal), ADR-0161 (scaffold localization), ADR-0112 (language detection), ADR-0103 Addendum 108 (Parent89 pins `{{63.language}}`).

## Context

Everything Portuguese the product writes is Brazilian: the language pack ("RODADA", "SEU SEGREDO", "você"), the scaffold table ("ROTEIRO"), the Parent and Child output (the model defaults to Brazilian) and the concept chat. Jonathan expects most Portuguese customers to come from Portugal. The three Portuguese-language paid purchases on record split both ways (September 2026 Brazil, July 2026 Portugal, February unknown), so one fixed dialect would be wrong for some customers. Nothing we store tells the two apart (no country, currency, locale or IP; profile language is `pt` for both; reading the chat does not work, the Portugal customer used no marker words, and the concept chat answers in Brazilian wording for everyone).

## Decision

1. **Two variants.** European Portuguese (informal "tu", ronda, guião, ficheiro, personagem feminine, "a fazer") and Brazilian Portuguese (today's pack, unchanged).
2. **The browser decides.** `AuthContext` stores `profiles.language_region` (`pt-PT` or `pt-BR`) from `navigator.languages` (`src/lib/portugueseRegion.ts`), only when the browser says which one. When it does not, the server defaults to European Portuguese (Jonathan's call).
3. **The trigger sends the name.** `mystery-webhook-trigger`, behind `pipeline_settings.portuguese_variants` (default `off`), sends `{{63.language}}` = "European Portuguese" for pt-PT or unknown and "Portuguese" (the Brazilian pack) for pt-BR, and writes `conversations.language_variant` on every generation (null included, so a re-fire never leaves a stale value). An operator can pin a re-fire with `languageOverride` "pt-pt" or "pt-br". A failure in this step never blocks generation.
4. **One new table per heal.** `docs/language-pack/header-labels.json` and `scaffold-labels.json` gain "European Portuguese" (code `pt-pt` in the generated TypeScript tables). Brazil keeps the key "Portuguese". The Child blueprint carries the pack per language name, so Child69 adds a "## European Portuguese:" block next to the Brazilian one in the 8 modules that carry the pack, plus a register and vocabulary rule. The Parent needs nothing: Parent89 already writes in `{{63.language}}`, and the scaffold heal localizes the English template with the matching table.
5. **Heals pick the table from the stored variant.** `tableCode(detected, variant)` turns a `pt` detection into `pt-pt` only when `conversations.language_variant` is `pt-PT`; the label-conformity heal, the scaffold-localization heal and `regenerate-parent-content` use it. Null (every package before this, every other language) keeps the Brazilian tables.

## Rationale

- The language name already flows from one place (the trigger) to every Make module, so the variant rides on it with no new plumbing in the Parent and no model-side detection.
- Browser language is free, needs no extra step for the customer and is reliable for the two audiences (pt-PT and pt-BR browsers report their region). A chat-text guess would be wrong for the one confirmed Portugal customer.
- The switch keeps today's behaviour until the Child blueprint (which holds the labels) has the European block; turning it on earlier would produce European prose under Brazilian headers.

## Alternatives considered

- **One fixed dialect (European or Brazilian):** simplest, but wrong for half of the known sample.
- **Ask the customer:** most accurate, one more step and a UI change in 13 locales.
- **Detect from the chat:** unreliable (see Context).
- **Two full site locales (`pt-PT.json`, `pt-BR.json`):** the right end state for the UI but a large content job with SEO consequences; phase 2.

## Consequences

- **Side effect on Brazilian packages (measured):** the label heal now treats the European wording of a label as another variant's pack wording and rewrites it to the Brazilian label (a dry run on Festa Fatal: 8 of 27 label edits were "RUMORES PARA ESPALHAR" to "BOATOS PARA ESPALHAR", sheets where the Child had mixed both). This makes labels consistent inside a package, which is the heal's purpose, but Brazil is not literally untouched.
- **Unreviewed wording:** the European tables were written by Claude and have not had native review (like Danish, Swedish and the others).
- **Not covered (phase 2, not built):** the concept chat (`mystery-ai`, answers Brazilian), the transactional emails (ready, host, character, guest feedback, discount reminders, contact: "sua experiência" style), the website's `pt.json` (mixed wording) and the host-guide UI strings. The package content, the product, is covered. A customer in Portugal will still see Brazilian wording in the chat and emails until phase 2.
- **Known gap:** a customer whose browser says pt-BR but who lives in Portugal gets Brazilian output; the operator override fixes a single order.
- **Historical packages** keep the Brazilian tables (`language_variant` null).

## Turning it on (CLAUDE.md item 11)

1. Jonathan imports `MM Live - Child (Unified)69-EuropeanPortuguesePack` (built by `temp-files/build-child-v69.py` from Child68; only the 8 pack-carrying modules change; reversing the edits gives Child68 back). Log it in `prompt_version_history` at once.
2. `update pipeline_settings set value = 'on' where key = 'portuguese_variants';`
3. On the first Portuguese purchase: `language_variant` is set, `{{63.language}}` was "European Portuguese" (function log `[Language] Portuguese variant ...`), the sheets carry "RONDA" and "O TEU SEGREDO", the scaffold carries "GUIÃO DO DETETIVE", `label_conformity` rows are few, and the text reads European. Kill switch: set it back to `off`; the Child69 block is then simply unused.
4. If a Portuguese customer writes to say the wording is wrong, check `profiles.language_region` and `conversations.language_variant` first.

## Discussion

Jonathan first assumed most customers come from Portugal, then reported the known split (September Brazil, July Portugal). That moved the design from "make it European" to "support both and choose per customer". The default for an unknown region stays European, his stated expectation, and is a one-word change in `resolvePortugueseVariant`. The first plan considered only the trigger's language name; reading the Child blueprint showed the label pack is keyed by that name and the heals would "correct" European labels back to Brazilian, which is why the stored variant and the table code exist.

## Key files

`supabase/functions/_shared/languageVariant.ts` (variant helpers), `supabase/functions/mystery-webhook-trigger/index.ts`, `src/lib/portugueseRegion.ts`, `src/context/AuthContext.tsx`, `supabase/migrations/20261017040000_portuguese_variants.sql`, `docs/language-pack/*` (+ generated `label-tables.ts`, `packageScaffoldTables.ts`), `supabase/functions/review-package-quality/index.ts`, `supabase/functions/regenerate-parent-content/index.ts`, `temp-files/build-child-v69.py` (local), tests: `label-conformity.test.mjs`, `packageScaffold.test.mjs`, `scripts/__tests__/portugueseRegion.test.mjs`.
