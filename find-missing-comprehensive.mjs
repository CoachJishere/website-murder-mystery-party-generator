import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const audit = JSON.parse(fs.readFileSync('./translation-audit-full.json', 'utf8'));
const masterPosts = audit.master.posts;
const zhcnPosts = audit.languages['zh-cn'].posts;

// Create a Set of all zh-cn slugs for quick lookup
const zhcnSlugs = new Set(zhcnPosts.map(p => p.slug));

// Also create normalized title lookup (lowercase, no punctuation)
const normalizeTitle = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const zhcnTitlesNormalized = new Set(zhcnPosts.map(p => normalizeTitle(p.title)));

const missing = [];
const found = [];

for (const master of masterPosts) {
  // Check if zh-cn translation exists by various methods:
  // 1. Slug with -zh-cn suffix
  const slugWithSuffix = master.slug + '-zh-cn';

  // 2. Check if any zh-cn slug contains part of the master slug
  const slugMatches = Array.from(zhcnSlugs).some(zhSlug => {
    // Direct match
    if (zhSlug === slugWithSuffix) return true;
    if (zhSlug === master.slug) return true;

    // Check if English words from master slug appear in zh-cn slug
    const masterWords = master.slug.split('-').filter(w => w.length > 4);
    return masterWords.some(word => zhSlug.includes(word));
  });

  if (slugMatches) {
    found.push(master);
  } else {
    missing.push(master);
  }
}

console.log(`Total master: ${masterPosts.length}`);
console.log(`Found: ${found.length}`);
console.log(`Missing: ${missing.length}`);

fs.writeFileSync('zh-cn-missing-final.json', JSON.stringify(missing, null, 2));
fs.writeFileSync('zh-cn-found-final.json', JSON.stringify(found, null, 2));

console.log(`\\nSaved ${missing.length} missing posts to zh-cn-missing-final.json`);
console.log(`\\nFirst 12 missing:`);
missing.slice(0, 12).forEach((p, i) => {
  console.log(`${i + 1}. ${p.title}`);
});
