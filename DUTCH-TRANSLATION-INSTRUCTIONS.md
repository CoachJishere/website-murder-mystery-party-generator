# Dutch Translation Completion Instructions

## Status
- ✅ **Completed:** 2/15 posts
  - Post 1: School Reunion (`nl-complete-post-1.md`)
  - Post 2: Holiday Gatherings (`nl-complete-post-2.md`)

- ⏳ **Remaining:** 13/15 posts (Posts 3-15)

## All Post Files Extracted
All 15 English source posts have been extracted to individual JSON files:
- `nl-extract-1.json` through `nl-extract-15.json`

## Translation Requirements
- **Language:** Formal Dutch ("u" form, not "je/jij")
- **Style:** Natural, fluent Dutch (Netherlands/Belgian neutral)
- **E-E-A-T:** Preserve ALL expert quotes, statistics, research data
- **Sources:** Keep source titles in English in Bronnen/Referenties section
- **Formatting:** Maintain all markdown exactly
- **URLs:** DO NOT translate URLs
- **SEO:** Translate title and meta_description naturally

## How to Complete Remaining 13 Translations

### Option 1: Use Claude Directly (Recommended)
Since the Anthropic API authentication from .env isn't working, you can:

1. Open each `nl-extract-{N}.json` file (posts 3-15)
2. Copy the content to Claude (web or desktop app)
3. Use this prompt:

```
Translate this murder mystery blog post to formal Dutch ("u" form).

Requirements:
- Natural, fluent Dutch (NL/BE neutral)
- Preserve ALL statistics, quotes, sources
- Keep source titles in English in Bronnen section
- Maintain markdown formatting
- Don't translate URLs

[Paste JSON content here]

Provide translation as:
---
title: [Dutch title]
meta_description: [Dutch description]
slug: [original-english-slug]
---

[Full Dutch content with all markdown]
```

4. Save output as `nl-complete-post-{N}.md`

### Option 2: Fix API and Run Script
If you have a working Anthropic API key:

1. Create a `.env.local` file with:
```
ANTHROPIC_API_KEY=sk-ant-api03-YOUR-ACTUAL-KEY-HERE
```

2. Update `translate-all-15-dutch.py` to use `.env.local`

3. Run:
```bash
python3 translate-all-15-dutch.py
```

## Remaining Posts List

| # | Slug | Title | Length |
|---|------|-------|--------|
| 3 | medical-examiner-murder-mystery-themes-forensic-investigations | Medical Examiner Murder Mystery Themes | 19,246 chars |
| 4 | unique-pirate-murder-mystery-plot-ideas | Unique Pirate Murder Mystery Plot Ideas | 10,055 chars |
| 5 | butler-murder-mystery-themes-manor-murders-household-secrets | Butler Murder Mystery Themes | 18,802 chars |
| 6 | how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime | How to Host a Fairy Tale Murder Mystery Party | 14,027 chars |
| 7 | unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime | Unique Film Noir Murder Mystery Plots | 13,847 chars |
| 8 | unique-archaeological-dig-murder-mystery-unearth-ancient-secrets-and-modern-murders | Unique Archaeological Dig Murder Mystery | 9,967 chars |
| 9 | 5-masquerade-ball-murder-mystery-themes-that-will-leave-your-guests-speechless | 5 Masquerade Ball Murder Mystery Themes | 11,063 chars |
| 10 | murder-mystery-party-for-dinner-parties-elevate-your-evening-with-culinary-intrigue | Murder Mystery Party for Dinner Parties | 8,495 chars |
| 11 | unique-train-station-murder-mystery-plots-all-aboard-for-danger-and-intrigue | Unique Train Station Murder Mystery Plots | 9,794 chars |
| 12 | how-to-host-a-space-station-murder-mystery | How to Host a Space Station Murder Mystery | 18,138 chars |
| 13 | how-to-host-a-hollywood-murder-mystery-party | How to Host a Hollywood Murder Mystery Party | 19,954 chars |
| 14 | jazz-club-murder-mystery-party-planning-swing-into-prohibition-era-crime | Jazz Club Murder Mystery Party Planning | 9,808 chars |
| 15 | how-to-fix-guests-breaking-character-keep-your-murder-mystery-party-immersive | How to Fix Guests Breaking Character | 14,562 chars |

## After Completion

When all 15 translations are complete:

1. Verify all files exist:
```bash
ls -1 nl-complete-post-*.md | wc -l
# Should show: 15
```

2. **Insert into database** using the insertion script from IT/JA/SV phases

3. **Verify Phase 3 completion:**
   - IT: 61/61 ✓
   - JA: 61/61 ✓
   - SV: 61/61 ✓
   - NL: 61/61 ✓

4. **PHASE 3 IS 100% COMPLETE** 🎉

## Translation Quality Checklist
For each post, verify:
- [ ] Formal "u" form used throughout
- [ ] Statistics table fully translated (except source names)
- [ ] Expert quotes translated with attribution kept
- [ ] All section headings translated
- [ ] Bronnen & Referenties section has English source titles
- [ ] Reading time translated ("Leestijd: X minuten")
- [ ] Published/Updated dates kept in original format
- [ ] URLs not translated
- [ ] Markdown formatting preserved (lists, tables, bold, links)

## Notes
- Each post takes ~2-3 minutes to translate via Claude
- Total estimated time for remaining 13 posts: ~30-40 minutes
- The translation script infrastructure is ready but needs valid API key
- All source English content is extracted and ready in `nl-extract-{1-15}.json` files
