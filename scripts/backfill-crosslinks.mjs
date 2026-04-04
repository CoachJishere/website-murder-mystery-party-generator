/**
 * Backfill EN cross-links for already-published blog posts.
 * Reads cross_link_map.json, fetches each published EN post from Supabase,
 * applies match_text → replacement substitutions, and patches the updated content.
 *
 * Usage: node scripts/backfill-crosslinks.mjs
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Load cross-link map
const crossLinkMap = JSON.parse(readFileSync('cross_link_map.json', 'utf8'));

async function main() {
  // 1. Fetch all published EN posts
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, slug, content')
    .eq('language', 'en')
    .eq('status', 'published');

  if (error) {
    console.error('Failed to fetch published posts:', error.message);
    process.exit(1);
  }

  console.log(`Found ${posts.length} published EN posts`);

  let updated = 0;
  let skipped = 0;
  let alreadyLinked = 0;

  for (const post of posts) {
    const entry = crossLinkMap[post.slug];
    if (!entry || !entry.insertions || entry.insertions.length === 0) {
      console.log(`  SKIP: ${post.slug} — no cross-link data`);
      skipped++;
      continue;
    }

    let content = post.content;
    let linksApplied = 0;
    let linksAlready = 0;

    for (const ins of entry.insertions) {
      if (!ins.match_text || !ins.replacement) continue;

      // Check if this link is already in the content (avoid double-linking)
      if (content.includes(ins.replacement)) {
        linksAlready++;
        continue;
      }

      // Check if the match_text exists in content
      if (content.includes(ins.match_text)) {
        content = content.replace(ins.match_text, ins.replacement);
        linksApplied++;
      } else {
        console.log(`  WARNING: match_text not found in ${post.slug}: "${ins.match_text.substring(0, 50)}..."`);
      }
    }

    if (linksApplied === 0) {
      if (linksAlready > 0) {
        console.log(`  ALREADY LINKED: ${post.slug} (${linksAlready} links already present)`);
        alreadyLinked++;
      } else {
        console.log(`  NO MATCHES: ${post.slug}`);
        skipped++;
      }
      continue;
    }

    // Patch the updated content
    const { error: updateError } = await supabase
      .from('blog_posts')
      .update({ content })
      .eq('id', post.id);

    if (updateError) {
      console.error(`  ERROR updating ${post.slug}: ${updateError.message}`);
    } else {
      console.log(`  UPDATED: ${post.slug} — ${linksApplied} links applied${linksAlready > 0 ? `, ${linksAlready} already present` : ''}`);
      updated++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total published EN posts: ${posts.length}`);
  console.log(`Updated with cross-links: ${updated}`);
  console.log(`Already had links: ${alreadyLinked}`);
  console.log(`Skipped (no data/matches): ${skipped}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
