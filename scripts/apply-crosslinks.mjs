/**
 * Apply cross-links to a blog post's content for a given language.
 * Called by the publish-daily-blog action.
 *
 * Usage: node scripts/apply-crosslinks.mjs <slug> <language>
 * Reads cross_link_map.json, fetches content from Supabase, applies insertions, patches back.
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables
 */

import { createClient } from './_supabase-node.mjs';
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const slug = process.argv[2];
const language = process.argv[3];

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !slug || !language) {
  console.error('Usage: node apply-crosslinks.mjs <slug> <language>');
  console.error('Requires SUPABASE_URL and SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const crossLinkMap = JSON.parse(readFileSync('cross_link_map.json', 'utf8'));

const entry = crossLinkMap[slug];
if (!entry) {
  console.log(`No cross-link data for slug: ${slug}`);
  process.exit(0);
}

// Get the right insertions for this language
let insertions;
if (language === 'en') {
  insertions = entry.insertions;
} else {
  insertions = entry.lang_insertions?.[language];
}

if (!insertions || insertions.length === 0) {
  console.log(`No ${language} insertions for slug: ${slug}`);
  process.exit(0);
}

// Fetch current content
const { data: rows, error } = await supabase
  .from('blog_posts')
  .select('id, content')
  .eq('slug', slug)
  .eq('language', language);

if (error || !rows || rows.length === 0) {
  console.error(`Failed to fetch ${language} content for ${slug}:`, error?.message || 'not found');
  process.exit(1);
}

let content = rows[0].content;
let applied = 0;
let skipped = 0;

for (const ins of insertions) {
  if (!ins.match_text || !ins.replacement) continue;

  // Skip if already linked
  if (content.includes(ins.replacement)) {
    skipped++;
    continue;
  }

  if (content.includes(ins.match_text)) {
    content = content.replace(ins.match_text, ins.replacement);
    applied++;
  } else {
    console.log(`  WARNING [${language}]: match_text not found: "${ins.match_text.substring(0, 50)}..."`);
  }
}

if (applied > 0) {
  const { error: updateError } = await supabase
    .from('blog_posts')
    .update({ content })
    .eq('id', rows[0].id);

  if (updateError) {
    console.error(`  ERROR updating ${language}: ${updateError.message}`);
    process.exit(1);
  }
}

console.log(`  ${language}: ${applied} links applied${skipped > 0 ? `, ${skipped} already present` : ''}`);
