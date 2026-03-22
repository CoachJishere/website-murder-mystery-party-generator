# Changelog

## 2026-03-22

### Feature: In-App Mystery Package Editing + PDF Export

**Inline Editing:**
- Users can now edit their generated mystery package content directly in the app
- Per-section editing with fixed headers (non-editable) and plain text textareas — users never see markdown syntax
- Covers all tabs: Host Guide (6 sections), Characters (per-field within each accordion), Evidence Cards, and Detective Script
- Evidence cards and detective script split by `##`/`###` headers into individually editable sections
- Escape key exits edit mode; unsaved changes prompt confirmation
- Saves directly to individual Supabase columns with optimistic local state updates
- New service functions: `updatePackageField()` and `updateCharacterField()` with field allowlists

**PDF Export:**
- "Save as PDF" button on mystery package view, character access page (guest email link), and host access page
- Uses `window.print()` with custom `@media print` CSS — zero new dependencies
- Print stylesheet hides app chrome, tabs, edit buttons; shows only active tab content
- Character accordions force-mount content so all characters print expanded, each on a new page

**Accomplice Display Bug Fix:**
- The host-facing tab view was never rendering `round2_accomplice`, `round3_accomplice`, `round4_accomplice`, or `final_accomplice` fields — accomplice characters appeared to have empty scripts even though the data was correctly generated and stored
- Fixed by including all accomplice fields in the new per-field character rendering

**Feedback Email Notifications:**
- New Supabase Edge Function `notify-feedback` sends email to support@mysterymaker.party on every feedback submission
- Database trigger `on_feedback_insert` fires automatically via `pg_net`
- Email includes star rating, NPS score, customer email, mystery title, comments, and testimonial
- Color-coded subject line (red for 1-2 stars, yellow for 3, green for 4-5)

**Files changed:**
- `src/components/EditableSection.tsx` — New: reusable edit/view toggle component
- `src/components/EditableMultiSection.tsx` — New: splits single markdown fields by headers into multiple EditableSections
- `src/styles/print.css` — New: print stylesheet for PDF export
- `supabase/functions/notify-feedback/index.ts` — New: feedback notification edge function
- `src/components/MysteryPackageTabView.tsx` — Per-section editing, accomplice field display, PDF button
- `src/pages/MysteryView.tsx` — Update handlers wired to tab view
- `src/pages/CharacterAccess.tsx` — PDF export button for guest character page
- `src/pages/HostAccess.tsx` — PDF export button for host access page
- `src/services/mysteryPackageService.ts` — `updatePackageField()`, `updateCharacterField()`
- `src/i18n/locales/en.json` — Edit and export i18n keys
- `src/i18n/locales/pt.json` — Edit and export i18n keys (Portuguese)

**Purchase Page Update:**
- Replaced amber "content cannot be edited" warning with green "Fully editable" reassurance on `MysteryPurchase.tsx`

**Homepage FAQ:**
- Added "Can I edit my mystery after it's been generated?" FAQ entry (EN + PT)
- Explains all content is editable post-generation and mentions PDF export

---

### Blog: Batch 2 Translation Quality Audit + SEO Schema Fixes

**Scope:** 708 translated posts (59 batch 2 slugs × 12 non-EN languages) in Supabase, plus `BlogPost.tsx` SEO schema code.

**Database fixes (Supabase `blog_posts`):**

1. **Meta descriptions trimmed** — ~320 Latin-script posts (ES, FR, PT, DE, IT, FI, NL, DA, SV) had meta descriptions >160 chars. Created PL/pgSQL function `trim_meta_description()` with smart truncation at natural sentence boundaries (period > comma > space). All now 80–160 chars.
2. **CJK meta descriptions rewritten** — 38 ZH-CN descriptions rewritten with natural Chinese (target 40–90 chars). 9 JA descriptions rewritten. 7 JA and 11 KO descriptions trimmed from >90 chars to ≤85 chars with natural CJK sentence breaks.
3. **Bold-wrapped heading fix** — 24 posts (17 FR, 4 NL, 3 FI) had `**## Heading` formatting that broke FAQ detection and markdown rendering. Stripped stray `**` markers from all `##` headings.
4. **Missing FAQ sections added** — 3 FR posts (`how-to-fix-unsatisfying-mystery-endings`, `how-to-host-a-fairy-tale-murder-mystery-party`, `how-to-host-a-hollywood-murder-mystery-party`) had FAQ sections in EN but not in FR. Translated and appended French FAQ sections with `## Questions fréquemment posées` heading and `### Question?` Q&A format.
5. **MysteryMaker CTA references** — 6 posts (DE 1, ES 1, FR 2, IT 2) were missing mysterymaker.party references. Appended localized CTA lines.

**BlogPost.tsx SEO schema fixes:**

6. **hreflang tags were completely broken** — The language variant lookup used `post_date` (NULL for all 766 posts), so `.eq('post_date', null)` returned nothing → zero hreflang tags on any page. Fixed to use `slug` (which all translations share). This is the highest-impact fix — hreflang is critical for multilingual SEO.
7. **zh-cn hreflang case mismatch** — Code checked `v.language === 'zh-CN'` but database stores `zh-cn`. Chinese posts got invalid `hrefLang="zh-cn"` instead of correct `hrefLang="zh-Hans"`. Fixed case comparison.
8. **Added x-default hreflang** — New `<link rel="alternate" hrefLang="x-default">` pointing to EN version for users outside specified language regions.
9. **FAQPage schema — expanded heading detection** — Added `UKK` (Finnish FAQ abbreviation, 9 FI posts), `Questions People Actually Ask` (1 EN post), and broadened accent-aware matching for `fréquemment` (FR). All 13 language FAQ heading variants now detected.
10. **HowTo schema — FAQ leak fix** — The H2 skip filter only excluded English FAQ headings (`FAQ|Frequently Asked|Related|Conclusion|Sources`). Translated FAQ sections like `## Häufig gestellte Fragen` were leaking into HowTo steps. Added all 13 language FAQ heading patterns to the skip filter.
11. **HowTo schema — multilingual title detection** — `isHowTo` only matched English "How to" titles. Added slug-based detection (`/^how-to/i.test(postSlug)`) plus translated title prefixes: `Sådan` (DA), `Kuinka` (FI), `So/Wie du` (DE), `Comment` (FR), `Cómo/Como` (ES/PT), `Come` (IT), `Hoe` (NL), `Hur man` (SV), `Hvordan` (DA), and `方法` (JA/KO/ZH-CN in title). Coverage went from ~60% to 100% of how-to posts across all languages.
12. **wordCount schema for CJK** — `post.content.split(' ').length` gave wrong counts for CJK languages (no word spaces). Now uses character count for JA/KO/ZH-CN.

**Final audit state:** 7 metrics × 12 languages = 84 checks, all passing with 0 issues. One expected gap: casino slug has no FAQ in any language (EN source has no FAQ).

**Known deferred items:**
- ZH-CN and JA content bodies need full re-translation (machine-translation quality)
- KO tone adjustment (overuse of formal 당신)
- FR missing 1 translation (`5-ancient-egyptian-temple-murder-themes`) — in-flight with batch 2 FR run
- Internal linking pass — after all translations complete
- No sitemap found in codebase — may need separate implementation

**Files changed:**
- `src/pages/BlogPost.tsx` (6 code changes: hreflang lookup, zh-Hans fix, x-default, FAQ regex, HowTo skip filter, HowTo title detection, wordCount CJK)
- ~400 rows updated in Supabase `blog_posts` table (meta descriptions, FAQ sections, heading formatting, CTA references)

---

## 2026-03-21

### Security: Fix Prototype Pollution in flatted

- Updated `flatted` from 3.3.3 to 3.4.2 to resolve high-severity prototype pollution vulnerability (GitHub Alert #45)
- Dev-only transitive dependency (`eslint` → `file-entry-cache` → `flat-cache` → `flatted`) — no production impact

### Blog: 235 New EN Posts — Content Generation + Full Audit Complete

**Scope:** 235 brand-new blog posts targeting long-tail SEO keywords, generated from `new_blog_topics_pipeline.xlsx`.

**What was done (Mar 20-21):**
1. **Topic Research:** 234 new topics identified across 20 categories (group sizes, corporate, occasions, themes, venues, characters, DIY, tech, comparisons, troubleshooting). Deduplicated against 185 existing slugs — 0 exact duplicates, 3 close matches all intentionally different.
2. **Research Packs:** 3 consolidated research pack prompts covering 50 themes. Jonathan generated 3 research packs (packs 29-31, 32-34, 35-38) with statistics, expert quotes, and consumer trends.
3. **Content Generation Prompts:** 13 self-contained batch prompts created (`CONTENT_GENERATION_PROMPTS.md`). Each includes voice system, SEO playbook, research pack references, anti-patterns, and a 5-step spot-check routine.
4. **Parallel Generation:** Jonathan ran 13 prompts in parallel CoWork sessions. 210 posts generated in first pass. 15 truly missing posts written directly in this conversation. 9 others existed with different filenames and were renamed.
5. **Multi-Pass Audit & Fix:**
   - Pass 1: Fixed 42 banned word violations across 24 files
   - Pass 2: Added FAQ headers to 5 files missing them
   - Pass 3: Removed 176 em-dashes (replaced with contextual punctuation)
   - Pass 4: Added MysteryMaker references to 2 files, FAQ sections to 13 files
   - Pass 5: Added statistics to 3 files missing GEO data
   - Pass 6: Fixed 6 more banned words (leverage, seamless) found in deeper audit
   - Pass 7: Fixed 1 final banned word (comprehensive → exhaustively)
   - Final state: **367 total files, 0 banned words, 0 exclamation marks, 0 em-dashes, 100% FAQ/MysteryMaker/stats coverage**

**Files created:**
- `new_blog_topics_pipeline.xlsx` — 234 topics with slugs, keywords, volume, priority, rationale
- `CONTENT_GENERATION_PROMPTS.md` — 13 batch prompts for parallel EN generation
- `RESEARCH_PACK_PROMPTS_CONSOLIDATED.md` — 3 mega research pack prompts
- `TRANSLATION_BATCH_PROMPTS.md` — 12 language prompts (235 posts each) for translation
- 235 new .txt files in `draft_rewrites/`

**Current local state:**
- 367 EN .txt files in `draft_rewrites/` (127 batch 2 + 235 batch 3 + 5 prefixed dupes)
- 127 batch 2 files already translated and imported to Supabase via CSV
- 235 batch 3 files ready for translation

**Next:** Run translation prompts (12 languages in parallel) → Build CSV from translations → Jonathan imports CSV to Supabase.

---

## 2026-03-20

### Phase I Complete: 127 Posts Translated + CSV Import

- 1,524 translation files completed (127 × 12 languages)
- CSV export: `translations_import.csv` (1,524 rows) + `blog_posts_all_languages.csv` (1,651 rows)
- Jonathan imported CSV to Supabase manually
- 80 translations had empty/short bodies from agent token limits — identified for re-generation

---

## 2026-03-18

### Blog: 127 EN Posts — Voice Rewriting Complete

**Scope:** 107 draft survivors + 20 new high-value topics = 127 EN posts, all voice-rewritten.

**What was done (Mar 17-18):**
1. **Phase E (Voice Rewrite):** All 107 draft survivors rewritten in Jonathan Miller's voice across 5 waves (problem-solving, theme/setting, occasion/event, character/profession, venue). Automated buzzword cleanup + short post expansion after each wave.
2. **Phase J (New Posts):** 20 brand-new posts written from scratch targeting high-value keyword gaps (murder mystery party ideas 10K+/mo, free games 8K+, how to write 5K+, costumes 4K+, food 3K+, etc.). Research packs 25-28 used for statistics and expert quotes.
3. **Quality verification:** All 127 posts pass: 329,445 total words (avg 2,594/post), 0 buzzwords, 0 exclamation marks, 0 missing headers, 0 posts without MysteryMaker references.

**Next:** Excel load (Phase G), SEO/GEO enrichment (Phase F), translations x 12 languages (Phase I), CSV export for manual Supabase import.

---

## 2026-03-17

### Blog: 58 Published Posts — Full SEO/GEO Pipeline Complete

**Scope:** 58 published EN posts × 13 languages = 754 rows in Supabase.

**What was done (Mar 13-17):**
1. **Phase 3a (Voice Rewrite):** All 58 EN posts rewritten in Jonathan Miller's voice — conversational, direct, MysteryMaker-native tone
2. **Phase 3b (SEO/GEO Enrichment):** Added verifiable statistics, expert quotes, and citation-rich content to all 58 EN posts for AI platform visibility
3. **Phase 4 (Translation):** All 58 posts translated into 12 languages (es, fr, de, it, da, fi, nl, sv, pt, ko, ja, zh-cn) using parallel agent pipeline with verification after each language
4. **Phase 5 (Supabase Push):** All 754 rows imported via CSV. Database constraint migrated from UNIQUE(slug) to UNIQUE(slug, language).

**Verified state:** 754 rows, 58 per language, 13 languages. All clean.

---

### Blog: 321 Draft Posts — Triage Complete

**Scope:** 321 EN draft posts triaged for quality and search volume viability.

**Results:**
- **107 survivors** (91 KEEP + 16 MERGE SURVIVOR)
- **214 cut/merged** (193 CUT + 21 MERGE INTO)
- **Cut rate:** 67%

**Cut reasons:**
- Obscure industrial venues (soap factory, paper mill, cheese factory, etc.)
- Absurd sci-fi sub-genres (teleportation lab, phasing technology, probability control, etc.)
- Micro-holidays (Flag Day, Groundhog Day, Columbus Day, World Poetry Day, etc.)
- Hyper-niche character types (cobbler, candle maker, blacksmith, postal worker, etc.)
- Duplicates of existing 58 published posts

**16 merge groups** identified (prohibition/speakeasy variants, wild west sub-themes, time travel/loop/machine, casino variants, vampire ball/castle, steampunk sub-themes, etc.)

**20 new high-value topics suggested** to fill keyword gaps (murder mystery party ideas, free murder mystery games, what to wear, food ideas, party for kids, virtual murder mystery, etc.)

**Research pack mapping:** All 107 survivors covered by existing packs 3-24. New topics need fresh research.

**Files:**
- `DRAFT_TRIAGE_RESULTS.md` — full triage document with all classifications
- `BLOG_TRANSLATION_EXECUTION_PLAN.md` — updated execution plan

**Next:** Voice rewrite 107 EN survivors → SEO/GEO enrichment → translate to 12 languages → push to Supabase.

---

## 2026-03-12

### Bug Fix: Partial character generation silently marked as complete

**Issue:** A customer purchased a 6-character vampire mystery ("Shadow And Fang: A Vampire's Final Death") but only received 4 of 6 characters. The package was marked as "completed" despite missing Bella Swan and Elena Gilbert.

**Root Cause:** Two issues working together:

1. **Make.com JSON parse error** — Character descriptions containing double quotes (e.g., `calling her "an abomination"`) broke the JSON payload when the Make.com parent scenario used string interpolation to build the child webhook request body. The unescaped `"` caused a `400 Bad Request` at JSON position 162. Characters without quotes in their descriptions (Luna, Edward, Dracula, Damon) succeeded; those with quotes (Bella, Elena) failed silently.

2. **No character count validation** — All completion logic paths only checked `characters.length > 0` rather than comparing against the expected count from `extracted_characters`. So 4 of 6 characters was treated the same as 6 of 6.

**Fix (2 commits):**

1. **Character count validation** (`86b32e8`) — Four files updated to compare generated character count against `extracted_characters` before marking "completed":
   - `src/services/mysteryPackageService.ts` — `saveStructuredPackageData()` and `getPackageGenerationStatus()` now validate counts
   - `src/pages/MysteryView.tsx` — Frontend status check validates `allCharactersGenerated` before forcing completion
   - `api/generation-complete.js` — Callback endpoint validates character count; incomplete packages stay "in_progress" with descriptive message (e.g., "Generated 4 of 6 characters")

2. **Description sanitization** (`ea9839f`) — `supabase/functions/mystery-webhook-trigger/index.ts` now replaces `"` with `'` in extracted character descriptions across all three extraction paths (primary regex, secondary regex, Claude API fallback). This prevents JSON parse failures in Make.com's string interpolation without affecting user-facing content (descriptions in `extracted_characters` are metadata only; actual character scripts are generated independently by Claude).

**Customer resolution:** Re-triggered Make.com child scenarios for Bella Swan and Elena Gilbert via the child webhook. Both characters now have full scripts (description, background, secret, introduction, all round scripts, final statement, quick reference).

**Files changed:**
- `src/services/mysteryPackageService.ts`
- `src/pages/MysteryView.tsx`
- `api/generation-complete.js`
- `supabase/functions/mystery-webhook-trigger/index.ts`

---

### Enhancement: Add soft format guidance to chat AI

**Issue:** Same customer expected a theatrical script with flashback scenes and a playable victim character (Sebastian). The chat AI had no guardrails to steer users toward the round-based party game format that the generation pipeline actually produces. This created a mismatch between what was designed in chat and what the package delivered.

**Fix:** Added two changes to `supabase/functions/mystery-ai/index.ts` (deployed to Supabase):

1. **Format guidance block** — Soft guardrails appended to `contentBoundaries` that guide the AI to translate creative ideas (flashbacks, theatrical scenes, victim speaking roles) into the round-based format without shutting down user creativity. The AI channels flashback energy into round reveals and explains the victim's backstory comes alive through other characters. Only activates when the user is clearly heading toward an incompatible format.

2. **Victim exclusion note** — Added to the concept generation prompt template so the AI knows the victim is NOT one of the playable characters. Prevents the victim from being counted in the character list and extracted as a playable character downstream.

**Files changed:**
- `supabase/functions/mystery-ai/index.ts`

---

### UX Fix: Clarify script type form labels

**Issue:** Same customer selected "Both Formats" expecting a full theatrical script because the label read "Full Scripts - Complete dialogue and detailed instructions." The term "complete dialogue" implied a scene-by-scene script, when it actually means detailed narrative prose (vs. bullet points) for each character's round content.

**Fix:** Updated labels in both English and Portuguese locale files to clearly communicate these are per-character round scripts:

- "Full Scripts" → "Detailed Scripts"
- "Complete dialogue and detailed instructions" → "Rich narrative for each character's rounds"
- "Script Detail Level" → "Character Script Detail Level"

**Files changed:**
- `src/i18n/locales/en.json`
- `src/i18n/locales/pt.json`

---

### UX Fix: Hide N/A stub scripts in detective-mode character guides

**Issue:** Same customer couldn't find their innocent/guilty scripts. In detective-style mysteries, each character has a fixed role, so only one script version has real content — the other is a 30-char stub ("N/A - See role-specific script"). The UI was rendering both, making it confusing to identify which section to read.

**Fix:** Added an `isStub()` helper in `MysteryPackageTabView.tsx` that filters out short placeholder text containing "N/A", "see role-specific", or "not applicable" from all innocent/guilty/accomplice round fields. Real content renders normally; stubs are silently hidden.

**Files changed:**
- `src/components/MysteryPackageTabView.tsx`

---

### Bug Fix: Regex extraction stops early on formatting variations

**Issue:** Investigation of the last 4 paid mysteries revealed that the "Murder At Hill House" mystery lost 7 of 14 characters during extraction. The character list in the AI conversation had subheadings and category labels between character entries (e.g., grouping characters by role), which the regex parser treated as the end of the list.

**Root Cause:** The `extractCharactersFromMessages` function in the webhook trigger used a `break` statement on any non-matching, non-empty line after finding the first character. Subheadings, dividers (`---`), and category labels between character entries triggered this break, causing the parser to stop mid-list.

**Fix:** Changed the break logic to only stop at new `##` section headers that aren't character list headers. Non-matching lines (subheadings, dividers, category labels) between character entries are now skipped, allowing the parser to find all characters regardless of formatting variations.

**Files changed:**
- `supabase/functions/mystery-webhook-trigger/index.ts`

---

### Bug Fix: Player count cross-validation with Claude fallback

**Issue:** All 4 recent paid mysteries had character count issues. The extraction pipeline could find fewer characters than the player count required, and all downstream validation compared against the extracted count only — so if regex found 7 of 14 characters, every validation checkpoint said "7/7 = complete."

**Root Cause:** Three validation points (`generation-complete.js`, `mysteryPackageService.ts` in two functions) only checked `extracted_characters` count, never `player_count` from the conversation. The extraction edge function had no cross-check either — it sent whatever it found to Make.com without comparing against the expected player count.

**Fix:** Three changes across 3 files:

1. **Claude fallback trigger** — The edge function now compares regex extraction count against `player_count`. When regex finds significantly fewer characters than expected (`< player_count - 2`), it automatically triggers a Claude API fallback extraction and uses whichever result found more characters.

2. **Callback cross-validation** — The `generation-complete.js` callback now fetches `player_count` from the conversations table and uses `max(extracted_count, player_count - 2)` as the expected character count. Packages with fewer characters stay "in_progress" instead of being marked "completed."

3. **Frontend cross-validation** — `mysteryPackageService.ts` applies the same `max(extracted_count, player_count - 2)` logic in both `saveStructuredPackageData()` and `getPackageGenerationStatus()`.

**Files changed:**
- `supabase/functions/mystery-webhook-trigger/index.ts`
- `api/generation-complete.js`
- `src/services/mysteryPackageService.ts`

---

### Customer Rectification: White Lotus, Hill House, Quest Board

Investigation of the last 4 paid mysteries revealed character generation issues in 3 of 4 packages (Shadow & Fang was previously resolved):

- **White Lotus** (jan.glaessner): 3 of 11 characters (Marlene, Elsa, Celine) were extracted correctly but lost during Make.com child scenario execution (HTTP failures with no retry). Regenerated all 3 by POSTing directly to the child webhook. All 11 characters now have complete scripts.

- **Murder At Hill House** (starckie): Character name mismatch — the AI conversation used "Ruby Rose" but the generated scripts used "Camelia Cerise" for one character. Updated `character_name`, `description`, `background`, and `introduction` fields in the database. Verified no remaining references to the old name across all 13 characters' scripts.

- **Quest Board** (busymommyof4): 14 of 17 characters generated. Root cause was NOT extraction or Make.com failure — the AI chat itself redesigned the mystery from the user's 17 characters down to 14 with an entirely new cast. Extraction and generation worked correctly for all 14. Customer outreach email drafted to offer regeneration with all 17 characters.

## March 20, 2026 — Translations Complete + Excel/CSV Export

### Phase I: Translation (127 posts × 12 languages = 1,524 translations)
- **All 1,524 translation files completed** and saved to persistent storage
- Languages: es, fr, de, it, pt, nl, da, fi, sv, ko, ja, zh-cn
- 1,444 translations (94.8%) have full body content
- 80 translations (5.2%) have headers but empty/short bodies (agent token limits)
- All files in `translations/{lang}/{slug}.txt` format

### Excel & CSV Export
- **Translation Import sheet** added to `mysterymaker_blog_master.xlsx` (1,524 rows)
- **translations_import.csv** — 1,524 translation rows (27.5 MB)
- **blog_posts_all_languages.csv** — 1,651 rows: 127 EN + 1,524 translations (30 MB)
- Format: supabase_id, slug, language, title, content, meta_description, meta_keywords, status
- Ready for manual Supabase import via CSV

### Translation Quality Notes
- Handled localized headers (TITULO:, TITRE:, TITEL:, etc.) in parser
- All files have TITLE and metadata; 80 files missing body content
- These 80 can be identified by filtering for rows with empty `content` column
