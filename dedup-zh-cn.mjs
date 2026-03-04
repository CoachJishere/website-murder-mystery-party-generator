#!/usr/bin/env node

/**
 * Deduplicate zh-cn blog posts in Supabase.
 *
 * Background:
 *   - 61 posts originally had language='zh' (complete set, SEO-optimized,
 *     all with meta_description + meta_keywords, clean Chinese slugs).
 *     Created 2025-09 through 2025-12, one per day.
 *   - 53 posts already existed with language='zh-cn' (partial set, some
 *     with broken titles/slugs, many missing meta_keywords, pinyin slugs).
 *     Created 2026-02 through 2026-03.
 *   - The 61 'zh' posts were migrated to 'zh-cn', creating 114 total posts.
 *
 * Strategy:
 *   - The OLD batch (61 posts, 2025) = migrated 'zh' posts = the better set.
 *     All 61 have meta_description, meta_keywords, clean Chinese slugs.
 *   - The NEW batch (53 posts, 2026) = pre-existing 'zh-cn' = lower quality.
 *     Some have broken titles, pinyin slugs, missing metadata.
 *   - Delete ALL 53 NEW batch posts (they are all duplicates or broken).
 *   - Keep ALL 61 OLD batch posts (they are the complete, clean set).
 *   - Result: exactly 61 zh-cn posts.
 *
 * Execution log (2026-03-02):
 *   - Phase 1: Title similarity matching deleted 43 of 53 NEW posts.
 *   - Phase 2: Manual review of remaining 10 found:
 *       - 6 were duplicates with different wording (cruise, medieval, holiday,
 *         underwater, villain, beach resort)
 *       - 3 had broken/garbage titles (metadata text as title)
 *       - 1 was an extra topic (graduation) with no English counterpart
 *     All 10 were deleted.
 *   - Final result: 61 zh-cn posts, all from OLD batch, all published,
 *     all with meta_description and meta_keywords.
 */

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function main() {
  console.log('=== ZH-CN DEDUPLICATION SCRIPT ===\n');

  // 1) Fetch all zh-cn posts
  console.log('Fetching all zh-cn posts...');
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?language=eq.zh-cn&select=id,title,slug,created_at,meta_description,meta_keywords&order=created_at.asc&limit=1000`,
    { headers }
  );
  if (!res.ok) {
    console.error('Failed to fetch posts:', res.status, await res.text());
    process.exit(1);
  }
  const allPosts = await res.json();
  console.log(`Total zh-cn posts: ${allPosts.length}\n`);

  if (allPosts.length === 61) {
    console.log('Already at expected count of 61. No deduplication needed.');
    return;
  }

  // 2) Split into OLD (migrated from zh, 2025) and NEW (existing zh-cn, 2026)
  const oldBatch = allPosts.filter(p => p.created_at < '2026-01-01');
  const newBatch = allPosts.filter(p => p.created_at >= '2026-01-01');

  console.log(`OLD batch (migrated from zh, 2025): ${oldBatch.length} posts`);
  console.log(`NEW batch (existing zh-cn, 2026):   ${newBatch.length} posts`);

  if (oldBatch.length !== 61) {
    console.error(`\nERROR: Expected 61 OLD posts but found ${oldBatch.length}. Aborting.`);
    process.exit(1);
  }

  // 3) Delete ALL NEW batch posts - they are all duplicates or broken
  const toDelete = newBatch.map(p => p.id);
  
  console.log(`\nWill delete all ${toDelete.length} NEW batch posts.`);
  console.log('Posts to delete:');
  for (const p of newBatch) {
    console.log(`  - "${p.title.substring(0, 70)}" (${p.id})`);
  }

  // 4) Execute deletion in batches of 10
  console.log(`\n=== DELETING ${toDelete.length} POSTS ===\n`);
  let deleted = 0;

  for (let i = 0; i < toDelete.length; i += 10) {
    const batch = toDelete.slice(i, i + 10);
    const idFilter = batch.map(id => `id.eq.${id}`).join(',');
    const url = `${SUPABASE_URL}/rest/v1/blog_posts?or=(${idFilter})`;

    const delRes = await fetch(url, {
      method: 'DELETE',
      headers: { ...headers, 'Prefer': 'return=representation' },
    });

    if (delRes.ok) {
      const deletedRows = await delRes.json();
      deleted += deletedRows.length;
      console.log(`  Batch ${Math.floor(i / 10) + 1}: deleted ${deletedRows.length} posts`);
    } else {
      console.error(`  Batch ${Math.floor(i / 10) + 1}: FAILED - ${delRes.status} ${await delRes.text()}`);
    }
  }

  console.log(`\nDeletion complete: ${deleted} deleted`);

  // 5) Verify
  console.log('\n=== VERIFICATION ===');
  const verifyRes = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?language=eq.zh-cn&select=id,title&order=created_at.asc&limit=1000`,
    { headers }
  );
  const remaining = await verifyRes.json();
  console.log(`zh-cn posts remaining: ${remaining.length}`);
  console.log(`Expected: 61`);
  console.log(`Status: ${remaining.length === 61 ? 'SUCCESS' : 'MISMATCH - manual review needed'}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
