# Complete Translation of Posts 33-36

## Status
The 4 remaining posts (33-36) need to be translated into all 19 languages and inserted into the database.

## Posts to Translate

1. **Post 33**: Murder Mystery Party for Holiday Gatherings
   - ID: `141f0863-8371-4f60-a17f-77a38eed6398`
   - Slug: `murder-mystery-party-for-holiday-gatherings-festive-fun-meets-family-intrigue`

2. **Post 34**: Murder Mystery Party for Office Teams
   - ID: `fc1396b1-617a-43b2-81eb-8b9f0325c6a7`
   - Slug: `murder-mystery-party-for-office-teams-build-bonds-through-collaborative-investigation`

3. **Post 35**: Murder Mystery Party for Small Groups
   - ID: `da666de8-8af2-420e-90af-490597d4360b`
   - Slug: `murder-mystery-party-for-small-groups-ideas`

4. **Post 36**: Murder Mystery Party for Teenagers
   - ID: `bee3a521-2203-4f03-99a6-1ddc4d97ff62`
   - Slug: `murder-mystery-party-for-teenagers-guide`

## Target Languages (19 total)
de, es, fr, it, pt, nl, sv, da, no, fi, pl, cs, hu, ro, el, ru, ja, ko, zh

## How to Run

### Option 1: Using Valid Anthropic API Key

```bash
# Get a valid Anthropic API key from https://console.anthropic.com/
# Then run:
ANTHROPIC_API_KEY="sk-ant-api03-YOUR-KEY-HERE" node TRANSLATE-POSTS-33-36.mjs
```

The script will:
- Fetch each English post from Supabase
- Translate title, description, and content to each language
- Insert translations into the blog_posts table
- Report progress with "✅ 1/4 done", "✅ 2/4 done", etc.

### Option 2: Manual Translation (if no API key available)

The post content has been exported to JSON files:
- `post-holiday-gatherings.json`
- `post-office-teams.json`
- `post-small-groups.json`
- `post-teenagers.json`

You can:
1. Use any translation service to translate the content
2. Use the insert script to add translations to the database

## Current Issue

The ANTHROPIC_API_KEY in the .env file appears to be expired/invalid (returns 401 authentication error).

You need to either:
1. Update the .env file with a valid Anthropic API key
2. Run the script with a valid key as an environment variable
3. Use an alternative translation method

## Expected Output

When successfully run, you should see:

```
╔════════════════════════════════════════════════════════════════════╗
║         TRANSLATING POSTS 33-36 TO ALL 19 LANGUAGES               ║
╚════════════════════════════════════════════════════════════════════╝

...translations happening...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 1/4 DONE: Holiday Gatherings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

...continues for all 4 posts...

✅ ALL 4 POSTS COMPLETED!
```

## Database Schema

Each translation is inserted with the same `id` and `slug` as the English version, but with different `language` field values.

Fields translated:
- `title`
- `meta_description`
- `content`

Fields copied unchanged:
- `id`, `slug`, `meta_keywords`, `author`, `tags`, `theme`, `status`, `reading_time`, `published_at`, `post_date`
