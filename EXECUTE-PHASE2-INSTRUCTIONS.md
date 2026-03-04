# Phase 2 SQL Execution Instructions

## Overview
Execute 6 SQL batch files to insert 26 translated blog posts (Portuguese, Korean, Chinese).

## Files to Execute

1. **batch-pt-1-5.sql** - Portuguese posts 1-5 (91 KB)
2. **batch-pt-6-10.sql** - Portuguese posts 6-10 (82 KB)
3. **batch-ko-1-5.sql** - Korean posts 1-5 (82 KB)
4. **batch-ko-6-9.sql** - Korean posts 6-9 (47 KB)
5. **batch-zh-6-9.sql** - Chinese posts 6-9 (61 KB)
6. **batch-zh-10-12.sql** - Chinese posts 10-12 (39 KB)

**Total: 402 KB of SQL**

## Execution Method Options

### Option 1: Supabase Dashboard SQL Editor (Recommended)

1. Open Supabase SQL Editor:
   https://supabase.com/dashboard/project/mhfikaomkmqcndqfohbp/sql

2. For each file:
   - Click "New query"
   - Copy the entire content from the file
   - Paste into the editor
   - Click "Run" (or Cmd/Ctrl + Enter)
   - Verify success message

3. After all files executed, verify counts:
   ```sql
   SELECT language, COUNT(*) as count
   FROM blog_posts
   WHERE status = 'published'
   AND language IN ('pt', 'ko', 'zh-cn')
   GROUP BY language
   ORDER BY language;
   ```

### Option 2: Command Line (psql)

Requires database password from Supabase dashboard.

```bash
# Set password
export PGPASSWORD="your-db-password-here"

# Execute each file
psql "postgresql://postgres:$PGPASSWORD@db.mhfikaomkmqcndqfohbp.supabase.co:5432/postgres" -f batch-pt-1-5.sql
psql "postgresql://postgres:$PGPASSWORD@db.mhfikaomkmqcndqfohbp.supabase.co:5432/postgres" -f batch-pt-6-10.sql
psql "postgresql://postgres:$PGPASSWORD@db.mhfikaomkmqcndqfohbp.supabase.co:5432/postgres" -f batch-ko-1-5.sql
psql "postgresql://postgres:$PGPASSWORD@db.mhfikaomkmqcndqfohbp.supabase.co:5432/postgres" -f batch-ko-6-9.sql
psql "postgresql://postgres:$PGPASSWORD@db.mhfikaomkmqcndqfohbp.supabase.co:5432/postgres" -f batch-zh-6-9.sql
psql "postgresql://postgres:$PGPASSWORD@db.mhfikaomkmqcndqfohbp.supabase.co:5432/postgres" -f batch-zh-10-12.sql
```

### Option 3: Node.js with pg Library

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.mhfikaomkmqcndqfohbp.supabase.co:5432/postgres"

# Run the execution script
node execute-with-pg.mjs
```

## Expected Results

After successful execution:

- **Portuguese (pt):** 10 posts (IDs vary)
- **Korean (ko):** 9 posts
- **Chinese (zh-cn):** 7 posts

**Total: 26 new posts**

## Verification Query

```sql
-- Check all translated posts by language
SELECT
  language,
  COUNT(*) as total_posts,
  MIN(published_at) as earliest_post,
  MAX(published_at) as latest_post
FROM blog_posts
WHERE status = 'published'
  AND language IN ('pt', 'ko', 'zh-cn')
GROUP BY language
ORDER BY language;

-- List recent insertions
SELECT id, title, language, slug, published_at
FROM blog_posts
WHERE status = 'published'
  AND language IN ('pt', 'ko', 'zh-cn')
ORDER BY created_at DESC
LIMIT 30;
```

## Troubleshooting

### File Too Large Error
- Split the SQL file into smaller chunks
- Execute via psql instead of SQL Editor

### Duplicate Key Error
- Posts may already exist
- Check with: `SELECT COUNT(*) FROM blog_posts WHERE language = 'pt'`
- If duplicates exist, skip that file

### Connection Timeout
- Files are large, may take 10-30 seconds each
- Wait for completion before running next file

## Next Steps

After execution:
1. Verify counts match expected results
2. Fix and insert remaining 6 posts (PT-11, ZH-CN 1-5)
3. Generate Phase 2 completion report
