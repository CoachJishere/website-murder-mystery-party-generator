# Blog Publishing Setup Guide

## Step 1: Import Posts into Supabase

### Option A: Supabase Dashboard CSV Import (Recommended)
1. Go to your Supabase dashboard → Table Editor → `blog_posts`
2. Click **Import data** (top right)
3. Upload `supabase_import.csv`
4. Map columns — they should auto-map since names match:
   - `slug` → slug
   - `language` → language
   - `title` → title
   - `content` → content
   - `meta_description` → meta_description
   - `meta_keywords` → meta_keywords
   - `status` → status
   - `author` → author
   - `reading_time` → reading_time
5. Leave `id`, `created_at`, `updated_at`, `published_at` unmapped (auto-generated)
6. Click Import

**Note:** The CSV is 30MB. If the dashboard import times out, use Option B.

### Option B: Split CSV Import
If the full CSV is too large, split it:
```bash
# Split into ~200 row chunks
head -1 supabase_import.csv > header.csv
tail -n +2 supabase_import.csv | split -l 200 - chunk_
for f in chunk_*; do cat header.csv "$f" > "import_${f}.csv"; done
```
Then import each `import_chunk_*.csv` file separately.

### Option C: SQL Import via psql
Connect to your Supabase Postgres directly:
```bash
psql "postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```
Then use `\copy` to import.

## Step 2: Set Up GitHub Actions for Daily Publishing

### Add Repository Secrets
Go to your repo Settings → Secrets and Variables → Actions → New repository secret:

1. **SUPABASE_URL**: `https://mhfikaomkmqcndqfohbp.supabase.co`
2. **SUPABASE_SERVICE_KEY**: Your Supabase service role key (found in Project Settings → API → service_role key)

### The Workflow
The file `.github/workflows/publish-daily-blog.yml` is already created. It:
- Runs daily at 9 AM UTC (5 AM ET)
- Finds the oldest draft EN post
- Publishes ALL language variants of that slug simultaneously
- Can also be triggered manually via the Actions tab

### Commit and Push
```bash
git add .github/workflows/publish-daily-blog.yml
git commit -m "Add daily blog publishing workflow"
git push
```

### Manual Trigger
To publish a post immediately:
1. Go to GitHub → Actions tab
2. Click "Publish Daily Blog Post" workflow
3. Click "Run workflow"

## What Happens

- **127 draft slugs** × **13 languages** = **1,651 total draft rows**
- **1 slug published per day** = all 13 language variants go live together
- **127 days** to publish everything (~4.2 months)
- Posts publish in `created_at` order (oldest first)

## File Reference

| File | Description |
|------|-------------|
| `supabase_import.csv` | 1,651 rows ready for Supabase import (30 MB) |
| `translations_import.csv` | 1,524 translation rows only (no EN) |
| `blog_posts_all_languages.csv` | Same as supabase_import but with supabase_id column |
| `mysterymaker_blog_master.xlsx` | Excel with all data across sheets |
| `.github/workflows/publish-daily-blog.yml` | Daily publishing cron job |
