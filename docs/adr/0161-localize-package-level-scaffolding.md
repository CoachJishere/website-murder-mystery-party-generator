# ADR-0161: Localize the package-level scaffolding (detective script, evidence cards, Game Overview, removal note and email)

- **Status:** Accepted (heal, consumers, tables, removal note, removal email, print page and the backfill of delivered packages live 2026-10-14; Parent prompt fix decided against, see Update 1)
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

## Update 1 (2026-10-14): backfill done, Parent87 not built

**Backfill (Jonathan: yes).** The heal was run with `force` on the 18 delivered non-English paid packages (sv 11, da 32, nl 22 and 50, es 21/30/49/50/11, fr 14/46, it 25/14/49, de 50/52/51, pt 23; the French sweep package had been done earlier). Every run passed the before/after gate check, none reverted, and the three SQL detectors returned the same counts afterwards (20 missing-image packages, 15 spoiler flags). A second dry run now finds nothing to change in any of them.

Three things the first pass did not cover, fixed the same day: (1) the English host note that earlier removals had appended (`**Note (host only):** X could not attend ...`, 7 notes in 2 packages) is now matched by the localizer and rewritten with the same text a new removal writes; (2) the Portuguese package "Morte No Topo" was detected as English by the stopword detector, so the heal gained a manual `language` override (manual `force` runs only) and its 10 one-off stage directions ("Read after approximately 12-15 minutes...") were translated by hand; (3) `unmatched_english_lines` undercounts short directions (it needs 3 English words), so the corpus scan above used a wider regex instead.

**Left English on purpose:** in "Morte No Topo" the three `*[Present Round N Evidence: <long English description>]*` cues carry the evidence description itself in English; that is content, not scaffolding, and rewriting it is a regeneration decision.

**Parent87 (prompt-level prevention): decided against for the scaffold.** Reasons: the model already copies the template verbatim, which is exactly what makes the exact-match heal 100 percent reliable (0 unmatched lines in the 17 packages generated since July; the only reworded directions were in one July package); asking the model to translate would trade a closed, tested vocabulary for free wording that the consumers (the host-play seal's reveal words, the card strips, the SQL detectors) do not know, so a model-chosen translation of "THE REVEAL" could make the seal fail closed; the four detective modules already carry many rules (naming, register, hygiene, timing), and the character-label history (36 of 36 French headers English until an exact table was injected) says prompt-only translation is the weaker lever. Revisit only if new orders show `unmatched_english_lines` or a `scaffold_localization` revert.

## Update 2 (2026-10-14): localization audit (read-only, nothing changed)

**Locale files:** all 12 non-English files have all 1,388 keys of `en.json`; at most 4 long strings per file are identical to English (ko, ja 4; the rest 1). No gaps there.

**Emails:** every customer-facing transactional email is locale-aware (ready, welcome, host, character, follow-ups, discount reminders, guest feedback, and now the removal completion email). The exception is the **Cold Case buyer confirmation** in `stripe-webhook` ("Your cold case is being assembled", "v1 ships English-only", although the order stores `buyer_language`). Internal alerts to support@ (purchase notices, `notify-*`, SEO digest) are English by design.

**Hard-coded English in the UI** (heuristic scan of JSX text, attributes and toast strings that are not inside `t()`; 176 hits in 30 files, so an upper bound and it misses `.ts` services and hooks):
- Customer-facing, about 110: Privacy page 22 (a legal text, may be a deliberate English-only decision), Cold Case landing and delivery pages 23, account settings (Billing 8, Profile 4, Password 3, Delete account 3), home page `Index.tsx` 9 and hero 3, `MysteryPackage.tsx` 6 (loading text, feature bullets), Evidence tab 4 ("Print Evidence Cards" button, feedback thanks and question), character role selector and assignment 6, email verification banner 3, About 3, form validation messages in `MysteryForm.tsx` 2, import button 2.
- Dev or preview routes, about 65, English is fine: `/dark-preview`, `/font-preview`, `/home-parallax`, `/email-preview`, `/evidence-card-preview`, `/guest-dropout-preview`, ColorSystemGuide.
- Not UI: `ConversationManager.tsx` system prompts (English by design).

**Not yet checked:** strings in `.ts` files (toasts and errors raised by hooks and services), the admin dashboard, and the Cold Case worker's generated documents. Proposed next step if you want it: move the roughly 110 customer-facing strings into `t()` keys with 13 translations (about 1,400 new strings), Privacy and Cold Case as separate decisions.

## Update 3 (2026-10-14): customer-facing UI strings moved to i18n (Jonathan: yes)

**Done (109 new keys in all 13 locale files, one commit):**
- Account settings, all four live components (`ProfileSettings`, `PasswordSettings`, `DeleteAccount`, `BillingSettings`: the page had no `useTranslation` at all) under `accountSettings.*`; purchase dates now use the active language through `src/utils/dateLocale.ts` (date-fns locales) instead of `MMM d, yyyy`.
- `EmailVerificationBanner`, `SkipToContent`, dashboard `MysteryFilters`, the feedback nudge on the package page ("How was your mystery party?"), the home page headings and SEO link blurbs in `Index.tsx` (`features.title` and `testimonials.title` reused), and the form validation messages in `MysteryForm` (the zod schema is now built with `t`).
- Toasts raised outside components, through `i18n.t`: sign in, sign up, reset, sign out (`AuthContext`), OAuth callback, purchase success and load failure (`MysteryView`), the home prompt box, guest manager, `characterService`.
- A gap found by the parity check: the purchase page's list of notes had one extra English-only item (renaming a character does not update scripts) that the 12 other locales never had; added.

**Checked:** key parity (1,521 keys, every locale complete, every `{{placeholder}}` identical to English), production bundle builds, and the home page rendered in a real browser in French, German, Japanese and Chinese with no English heading left. The account pages need a signed-in session and were not rendered.

**Not done, on purpose:** Privacy page (legal text, own decision), Cold Case pages and buyer email (own decision), About page (founder bio, long-form content), dev and preview routes, the admin dashboard, and dead code (`MysteryPackage.tsx`, `CharacterRoleSelector`, `CharacterRoleAssignment`, `ImportCharactersButton`, which nothing imports). Still English: the character import dialog toasts (`ImportCharactersDialog`, `batchCharacterImport`).

**Found, not changed:** `BillingSettings` shows every purchase as a fixed "$24.99" (`amount: 24.99, // Fixed price` and a literal `$`), although the real prices differ by currency and discount (the French sweep customer paid USD 19.99). A purchase history that shows the wrong amount is a separate bug.

## Key files

`docs/language-pack/scaffold-labels.json`, `docs/language-pack/build-scaffold-tables.mjs`, `supabase/functions/_shared/packageScaffold.ts` (+ `packageScaffoldTables.ts`, `packageScaffold.test.mjs`), `supabase/functions/review-package-quality/index.ts` (`healScaffold`), `supabase/functions/auto-remediate-packages/evidence-card.ts`, `supabase/functions/regenerate-parent-content/index.ts`, `supabase/functions/adapt-mystery-apply/index.ts`, `supabase/functions/send-adaptation-complete-email/index.ts`, `src/utils/evidenceCardUtils.ts`, `src/pages/EvidenceCardPrint.tsx`, `src/i18n/locales/*.json` (`evidencePrint`), `supabase/migrations/20261014140000_localized_evidence_markers.sql`.
