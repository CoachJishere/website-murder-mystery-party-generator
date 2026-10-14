# ADR-0161: Localize the package-level scaffolding (detective script, evidence cards, Game Overview, removal note and email)

- **Status:** Accepted (heal, consumers, tables, removal note, removal email and print page live 2026-10-14; backfill of delivered packages and a Parent prompt fix pending, see Consequences)
- **Date:** 2026-10-14

## Context

Jonathan's rule (2026-10-14, while sweeping the French package "La Malédiction Du Rang Du Vieux Moulin", ADR-0103 Addendum 97): **the entire product experience, start to finish, must always be localized.**

The character sheets already are (ADR-0135 language pack, ADR-0152 label heal). The package-level documents are not. The Parent prompts (Make modules 5000, 5004, 5008, 5012 for the detective script, the evidence module, the overview module) hold their template as a literal English document, and the model translates the prose but copies the template. Measured on all 20 paid non-English packages created since 2026-06-01:

- the **detective script** keeps English headers ("## NOTE FOR HOST", "## RECORDING GUIDELINES FOR AUDIO OPTION", "## ROUND 2: MOTIVES", "## THE REVEAL"), the English audio-recording bullets and the English bracketed stage directions ("*[Read this when guests are gathered...]*", "*[Present Round 2 Evidence]*"); 19 of 19 carry "## NOTE FOR HOST" in English;
- the **evidence cards** keep "## EVIDENCE CARDS", "*Display these one per round...*", "## EVIDENCE: ROUND N", "#### DESCRIPTION", "#### SIGNIFICANCE (Host Only)" (19 of 19);
- the **Game Overview** starts with the English "## Game Overview" (20 of 20);
- the **"Remove a Character"** feature appends an English host note to the detective script and sends an English-only completion email;
- the **evidence card print page** and the card labels in the Evidence tab are hard-coded English UI.

Earlier policy pointed the other way: `regenerate-parent-content` told the model that "*[...]*" stage directions "stay in English regardless of master_context's language" (ADR-0112 addendum, 2026-08-29). This ADR supersedes that rule.

## Decision

1. **A deterministic, free, idempotent localizer** (`supabase/functions/_shared/packageScaffold.ts`) rewrites exactly the known English template strings of the three documents into the package language and nothing else: whole template lines (headers, audio bullets, card legend), whole-line stage directions (wrapper `*[ ]*` or `[ ]` kept), the inline cue `*[Present Round N Evidence]*`, and the mixed `## ROUND 2: MOVENTI` shape. A line that is already in the target language, in any wording, is left alone (the principle of ADR-0152). "Investigator" and "detective" variants are one entry.
2. **One reviewable table**, `docs/language-pack/scaffold-labels.json`, for 12 languages (es fr de it pt nl da sv fi ko ja zh-cn); `docs/language-pack/build-scaffold-tables.mjs` generates `_shared/packageScaffoldTables.ts` (edge functions cannot read `docs/`); a test fails when the copy is stale. Round words follow the character pack (MANCHE, TURNO, RODADA, RONDE, ...), vocabulary for evidence and detective script follows the site's own locale files. No translation has had native-speaker review (same caveat as the character pack).
3. **Pre-release free heal** `scaffold_localization` in `review-package-quality` (`healScaffold`, next to `healLabels`; `pipeline_settings.scaffold_localization`, `on` since 2026-10-14, `report`/`off` available; manual mode `localize_scaffold` with `dry_run`, corpus mode `heal_scan` includes it). Same safety shape as the label heal: gate defects before and after, revert on anything new, every run logged in `auto_remediation_log`.
4. **Consumers that read these markers were made language-aware first**, because a localized "SIGNIFICANCE (Host Only)" that the strips do not recognise would print the culprit on the guests' cards:
   - `src/utils/evidenceCardUtils.ts` (print strip, host-only label, round boundary, optional translated card label), `review-core.ts` (`HOST_ONLY_HEADING`, the reviewer's printed-evidence culprit check), `auto-remediate-packages/evidence-card.ts` (`extractCard`, split out of `index.ts` so it can be tested);
   - SQL (migration `20261014140000`): `list_packages_missing_evidence_images`, `list_packages_with_evidence_culprit_spoiler`, `package_victim_mismatch_candidate`; unchanged results on the existing corpus (20 / 15 / 0 before and after).
   The host-play seal (ADR-0158) already recognised localized reveal headings; the test proves every translation is found and that "accusations and resolution" is not mistaken for the reveal (German "Auflösung" was, and was renamed "Abschluss").
5. **`regenerate-parent-content`** now asks the model for a fully localized document (no English exception) and runs the localizer on the result.
6. **Removal feature:** the host-only note is written from the same table in the package language (`absentHostNote`, language fixed once per run from `master_context` so append, reassignment strip and verify agree), and `send-adaptation-complete-email` is localized in 13 languages in the mystery's language. The English sentence "No charge lost the change" was garbled and is dropped in every language.
7. **UI:** the evidence card print page and the card round label in the Evidence tab use i18n (`evidencePrint.*` in all 13 locale files).

## Rationale

- The model copies a literal template. Prompt wording alone is the weaker lever (the character label history: 36 of 36 French headers stayed English until an exact table was injected), a post-generation exact-match rewrite cannot miss a known string and costs nothing.
- Exact whole-line matching keeps the blast radius at the template: no prose, name or card title can be touched, and a second run is a no-op.
- Localizing before the consumers were fixed would have been a spoiler leak, so the consumers and a 12-language parity test (seal, print strip, card parsing, image recovery, reviewer strip) came first.

## Alternatives Considered

- **Display-time translation of the stored English markers.** Rejected: the documents are shown and edited in `EditableSection`, so an edit would save the translated text back; and emails and exports read the stored field.
- **Keep English markers as machine anchors and localize only the prose around them.** Rejected: leaves the headings English, which is the defect.
- **Only fix the Parent prompt (Parent87).** Not enough alone (see Rationale) and needs an import by Jonathan; kept as a follow-up for prevention.
- **An LLM translation pass per package.** Rejected: paid, non-deterministic, and the strings are a closed set.

## Consequences

- New non-English orders are localized before the customer sees them, in report-only-able, revertible form.
- **Pending Jonathan's yes:** the same heal on the 17 delivered non-English packages that would change (dry run 2026-10-14: sv 11 edits, da 32, nl 22, es 21/30/49/50/11, fr 14/46, it 25/14/49, de 50/52/51, pt 23; 0 unmatched English lines). The French sweep package was done the same day. Delivered customer documents are changed in bulk, so this is a separate approval.
- **Pending:** Parent87 (prompt-level prevention for modules 5000, 5004, 5008, 5012, the evidence and the overview module); not built. Until then every new order relies on the heal.
- The detector for a stage direction the model rewrote in English with different wording is the heal's `unmatched_english_lines` field (report only).
- Known remaining English surfaces, not yet audited: other transactional emails that are not yet in 13 languages, Admin pages, and any UI string outside `src/i18n/locales`. A grep for hard-coded English in user-facing pages is the next audit.
- Brazilian Portuguese vocabulary (Rodada, roteiro, arquivos) was used to match the character pack; the site's own pt locale leans European. Native review is needed for all 12 tables.

## Discussion

The sweep that surfaced this was reading a French package whose detective script was English from header to stage direction. Jonathan's answer to the question "worth localizing?" was a product rule, not a one-off. The risky part turned out not to be the translation but the readers of the English words: the guest-facing card strip, the host-play seal, three SQL detectors and the image recovery all key on them. The test file enumerates each consumer for each language so a future edit to either side fails loudly.

## Key files

`docs/language-pack/scaffold-labels.json`, `docs/language-pack/build-scaffold-tables.mjs`, `supabase/functions/_shared/packageScaffold.ts` (+ `packageScaffoldTables.ts`, `packageScaffold.test.mjs`), `supabase/functions/review-package-quality/index.ts` (`healScaffold`), `supabase/functions/auto-remediate-packages/evidence-card.ts`, `supabase/functions/regenerate-parent-content/index.ts`, `supabase/functions/adapt-mystery-apply/index.ts`, `supabase/functions/send-adaptation-complete-email/index.ts`, `src/utils/evidenceCardUtils.ts`, `src/pages/EvidenceCardPrint.tsx`, `src/i18n/locales/*.json` (`evidencePrint`), `supabase/migrations/20261014140000_localized_evidence_markers.sql`.
