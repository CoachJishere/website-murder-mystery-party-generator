#!/usr/bin/env node

/**
 * Fix blog posts with language='zh' — they should be 'zh-cn'.
 *
 * Strategy:
 * 1. Fetch all posts with language='zh' and language='zh-cn'.
 * 2. For any zh post whose slug already exists among zh-cn posts, DELETE the zh duplicate.
 * 3. For zh posts whose slug does NOT exist in zh-cn, UPDATE language from 'zh' to 'zh-cn'.
 */

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function fetchPosts(language) {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?language=eq.${language}&select=id,slug,language`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${language} posts: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function deletePost(id) {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    throw new Error(`Failed to delete post ${id}: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  return body;
}

async function updateLanguage(id, newLanguage) {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ language: newLanguage }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update post ${id}: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  return body;
}

async function main() {
  console.log('=== Fix zh -> zh-cn language codes ===\n');

  // Step 1: Fetch both sets
  const zhPosts = await fetchPosts('zh');
  const zhCnPosts = await fetchPosts('zh-cn');

  console.log(`Posts with language='zh':    ${zhPosts.length}`);
  console.log(`Posts with language='zh-cn': ${zhCnPosts.length}\n`);

  // Build a set of zh-cn slugs for quick lookup
  const zhCnSlugs = new Set(zhCnPosts.map((p) => p.slug));

  // Categorize zh posts
  const duplicates = []; // slug exists in both zh and zh-cn
  const toUpdate = [];   // slug only in zh, needs language update

  for (const post of zhPosts) {
    if (zhCnSlugs.has(post.slug)) {
      duplicates.push(post);
    } else {
      toUpdate.push(post);
    }
  }

  console.log(`Duplicates (zh slug exists in zh-cn, will DELETE zh copy): ${duplicates.length}`);
  console.log(`Unique (zh slug not in zh-cn, will UPDATE to zh-cn):       ${toUpdate.length}\n`);

  // Step 2: Delete duplicates
  if (duplicates.length > 0) {
    console.log('--- Deleting duplicate zh posts ---');
    for (const post of duplicates) {
      try {
        await deletePost(post.id);
        console.log(`  DELETED: ${post.id}  slug="${post.slug}"`);
      } catch (err) {
        console.error(`  ERROR deleting ${post.id}: ${err.message}`);
      }
    }
    console.log('');
  }

  // Step 3: Update remaining zh posts to zh-cn
  if (toUpdate.length > 0) {
    console.log('--- Updating zh -> zh-cn ---');
    for (const post of toUpdate) {
      try {
        const result = await updateLanguage(post.id, 'zh-cn');
        console.log(`  UPDATED: ${post.id}  slug="${post.slug}"  -> language="${result[0]?.language}"`);
      } catch (err) {
        console.error(`  ERROR updating ${post.id}: ${err.message}`);
      }
    }
    console.log('');
  }

  // Step 4: Verify
  const remaining = await fetchPosts('zh');
  const finalZhCn = await fetchPosts('zh-cn');
  console.log('=== Final state ===');
  console.log(`Posts with language='zh':    ${remaining.length}`);
  console.log(`Posts with language='zh-cn': ${finalZhCn.length}`);

  if (remaining.length === 0) {
    console.log('\nAll zh posts have been migrated to zh-cn successfully.');
  } else {
    console.log(`\nWARNING: ${remaining.length} posts still have language='zh'.`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
