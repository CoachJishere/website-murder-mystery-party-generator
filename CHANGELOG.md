# Changelog

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
