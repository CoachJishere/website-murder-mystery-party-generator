/**
 * Backfill cross-links for already-published blog posts across all 13 languages.
 * Reads cross_link_map.json, fetches each published post from Supabase,
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

const LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'da', 'fi', 'nl', 'sv', 'pt', 'ko', 'ja', 'zh-cn'];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const crossLinkMap = JSON.parse(readFileSync('cross_link_map.json', 'utf8'));

function getInsertions(slug, language) {
  const entry = crossLinkMap[slug];
  if (!entry) return null;
  if (language === 'en') return entry.insertions;
  return entry.lang_insertions?.[language];
}

async function backfillLanguage(language) {
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, slug, content')
    .eq('language', language)
    .eq('status', 'published');

  if (error) {
    console.error(`  Failed to fetch ${language} posts:`, error.message);
    return { updated: 0, skipped: 0, alreadyLinked: 0, total: 0 };
  }

  let updated = 0, skipped = 0, alreadyLinked = 0;

  for (const post of posts) {
    const insertions = getInsertions(post.slug, language);
    if (!insertions || insertions.length === 0) {
      skipped++;
      continue;
    }

    let content = post.content;
    let linksApplied = 0;
    let linksAlready = 0;

    for (const ins of insertions) {
      if (!ins.match_text || !ins.replacement) continue;

      if (content.includes(ins.replacement)) {
        linksAlready++;
        continue;
      }

      if (content.includes(ins.match_text)) {
        content = content.replace(ins.match_text, ins.replacement);
        linksApplied++;
      }
    }

    if (linksApplied === 0) {
      if (linksAlready > 0) alreadyLinked++;
      else skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('blog_posts')
      .update({ content })
      .eq('id', post.id);

    if (updateError) {
      console.error(`    ERROR ${language}/${post.slug}: ${updateError.message}`);
    } else {
      updated++;
    }
  }

  return { updated, skipped, alreadyLinked, total: posts.length };
}

async function main() {
  console.log('=== Backfill Cross-Links (All Languages) ===\n');

  let grandTotal = { updated: 0, skipped: 0, alreadyLinked: 0, posts: 0 };

  for (const lang of LANGUAGES) {
    const result = await backfillLanguage(lang);
    console.log(`${lang.toUpperCase().padEnd(6)}: ${result.total} posts — ${result.updated} updated, ${result.alreadyLinked} already linked, ${result.skipped} skipped`);
    grandTotal.updated += result.updated;
    grandTotal.skipped += result.skipped;
    grandTotal.alreadyLinked += result.alreadyLinked;
    grandTotal.posts += result.total;
  }

  console.log(`\n--- Grand Total ---`);
  console.log(`Posts processed: ${grandTotal.posts}`);
  console.log(`Updated: ${grandTotal.updated}`);
  console.log(`Already linked: ${grandTotal.alreadyLinked}`);
  console.log(`Skipped: ${grandTotal.skipped}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
