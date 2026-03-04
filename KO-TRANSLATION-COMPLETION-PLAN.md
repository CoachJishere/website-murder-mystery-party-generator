# Korean (KO) Translation Completion Plan

## Summary

**Status**: Ready for translation
**Missing Posts**: 9 of 61
**Current Coverage**: 52/61 (85.2%)
**Target**: 61/61 (100%)

## Prepared Files

1. **ko-missing-posts.json** - List of 9 missing post IDs and titles
2. **ko-batch-all-posts.json** - Complete English content for all 9 posts
3. **translate-ko-complete-9.mjs** - Translation script (ready to run)

## The 9 Missing Posts

1. **1920s Speakeasy Murder Mystery Party Guide**
   - ID: c099e4e0-980c-4f94-bc70-69e005b91e79
   - Slug: 1920s-speakeasy-murder-mystery-party-guide

2. **Unique Film Noir Murder Mystery Plots: Enter the Shadows of Urban Crime**
   - ID: 2acf78da-c601-4506-830b-ab46c180c414
   - Slug: unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime

3. **Unique Archaeological Dig Murder Mystery: Unearth Ancient Secrets and Modern Murders**
   - ID: 2bc621a3-61d1-4ba6-8a7b-66e031e5d28c
   - Slug: unique-archaeological-dig-murder-mystery-unearth-ancient-secrets-and-modern-murders

4. **How to Host a Superhero Murder Mystery Party: Powers, Secret Identities, and Super Villains**
   - ID: dd208ded-7aef-43b1-8176-98a9e5f28c09
   - Slug: how-to-host-a-superhero-murder-mystery-party-powers-secret-identities-and-super-villains

5. **Unique Underwater Murder Mystery Plots That Will Make a Splash at Your Party**
   - ID: 6c030a19-7884-42fa-aecb-d97ef2b0bdac
   - Slug: unique-underwater-murder-mystery-plots-that-will-make-a-splash-at-your-party

6. **Murder Mystery Party for Dinner Parties: Elevate Your Evening with Culinary Intrigue**
   - ID: 2fb18701-39ba-4152-8a82-bcbe0fea4e9b
   - Slug: murder-mystery-party-for-dinner-parties-elevate-your-evening-with-culinary-intrigue

7. **Detective Murder Mystery Themes: Professional Investigators and Sleuth Dynamics**
   - ID: 82980fc7-220e-49c3-9d71-2917094afc28
   - Slug: detective-murder-mystery-themes-professional-investigators-sleuth-dynamics

8. **How to Fix Unrealistic Murder Mystery Plots: Create Believable Storylines That Captivate**
   - ID: f4678c7e-d6af-4e2a-8a16-452b5aeb102f
   - Slug: how-to-fix-unrealistic-murder-mystery-plots-create-believable-storylines-that-captivate

9. **How to Host a Victorian Murder Mystery Party**
   - ID: f9e5ae63-d483-42e0-845e-6c5ce69c3624
   - Slug: how-to-host-a-victorian-murder-mystery-party

## Next Steps

### Option 1: Update API Key and Run Script

1. Update `.env` file with valid `ANTHROPIC_API_KEY`
2. Run translation script:
   ```bash
   node translate-ko-complete-9.mjs
   ```
3. This will generate 9 files: `ko-complete-post-1.md` through `ko-complete-post-9.md`
4. Review translations for quality
5. Run insertion script (to be created) to upload to Supabase

### Option 2: Manual Translation Workflow

If API key is not available, translations can be completed manually:

1. Open `ko-batch-all-posts.json` to access English content
2. For each post, translate following these guidelines:
   - Use Korean honorific form (존댓말 - ~ㅂ니다/습니다, ~세요)
   - Preserve ALL E-E-A-T metadata headers and dates
   - Keep source titles in English
   - Maintain markdown formatting
   - Translate content naturally and fluently
3. Save each translation as `ko-complete-post-N.md`
4. Run insertion script to upload

## Korean Translation Requirements

### 1. Honorific Form (존댓말)
- Use formal/respectful language throughout
- Endings: ~ㅂ니다/습니다, ~세요, ~ㅂ니까/습니까
- Example: "Make sure to..." → "반드시 ~하세요" (not "반드시 ~해")

### 2. E-E-A-T Preservation
- Keep metadata headers in English: `## Metadata`, `## E-E-A-T Compliance`
- Keep "Author Expertise:", "Published:", "Last Updated:" in English with their values
- Keep source/reference titles in English
- Translate only descriptive labels (e.g., "Sources:" → "출처:")

### 3. Content Quality
- Natural, fluent Korean for native readers
- Adapt idioms and cultural references appropriately
- Preserve SEO keywords in Korean form
- Maintain content structure and flow

### 4. Do NOT Translate
- URLs and link paths
- Code snippets
- Metadata section headers
- Author expertise statements
- Publication dates
- Source/reference titles
- Internal anchor links

## Suggested Korean Titles

1. **1920s Speakeasy** → `1920년대 스피크이지 살인 미스터리 파티 가이드`
2. **Film Noir** → `독특한 필름 누아르 살인 미스터리 줄거리: 도시 범죄의 그림자 속으로`
3. **Archaeological Dig** → `독특한 고고학 발굴 살인 미스터리: 고대 비밀과 현대 살인 발굴하기`
4. **Superhero** → `슈퍼히어로 살인 미스터리 파티 주최 방법: 초능력, 비밀 정체성, 슈퍼 악당`
5. **Underwater** → `파티에 물보라를 일으킬 독특한 수중 살인 미스터리 줄거리`
6. **Dinner Parties** → `저녁 파티를 위한 살인 미스터리 파티: 요리 음모로 저녁 시간 격상하기`
7. **Detective** → `탐정 살인 미스터리 테마: 전문 수사관과 탐정 역학`
8. **Unrealistic Plots** → `비현실적인 살인 미스터리 줄거리 고치는 방법: 매혹적인 믿을 수 있는 스토리라인 만들기`
9. **Victorian** → `빅토리아 시대 살인 미스터리 파티 주최 방법`

## Insertion Script (To Be Created)

Once translations are complete, create an insertion script that:
1. Reads all `ko-complete-post-*.md` files
2. Extracts title, slug, content, meta_description
3. Inserts into `blog_posts` table with:
   - `language = 'ko'`
   - `status = 'published'`
   - Original `theme` and `meta_keywords`
   - Generated Korean slug
4. Verifies all 9 posts inserted successfully

## Final Verification

After insertion, run audit to confirm:
```bash
node audit-all-translations.mjs
```

Expected result: **KO: 61/61 posts (100% coverage)**

---

**Prepared by**: Claude Code
**Date**: 2026-03-02
**Files Ready**: ✓ All source content fetched and organized
**Status**: Awaiting valid ANTHROPIC_API_KEY or manual translation
