# Changelog

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
