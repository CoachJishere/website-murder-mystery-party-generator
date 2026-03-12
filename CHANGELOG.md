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
