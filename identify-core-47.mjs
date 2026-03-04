import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('🔍 IDENTIFYING CORE 47 POSTS\n');
console.log('=' .repeat(80));

// Strategy: The core 47 are the English posts that have Japanese translations
// (since Japanese is complete at 47/47)

// Get all published English posts
const { data: englishPosts, error: enError } = await supabase
  .from('blog_posts')
  .select('id, title, slug, published_at, updated_at')
  .eq('language', 'en')
  .eq('status', 'published')
  .order('title', { ascending: true });

if (enError) {
  console.error('Error fetching English:', enError);
  process.exit(1);
}

console.log(`Total published English posts: ${englishPosts.length}\n`);

// Get all Japanese posts (complete at 47)
const { data: japanesePosts, error: jaError } = await supabase
  .from('blog_posts')
  .select('id, title, slug, published_at')
  .eq('language', 'ja')
  .eq('status', 'published')
  .order('published_at', { ascending: true });

if (jaError) {
  console.error('Error fetching Japanese:', jaError);
  process.exit(1);
}

console.log(`Total Japanese posts: ${japanesePosts.length}\n`);

// Match by publication date proximity (within 2 days)
const core47Posts = [];
const matchedJaPosts = new Set();

for (const enPost of englishPosts) {
  const enDate = new Date(enPost.published_at);

  // Find Japanese post published around the same time
  const matchingJa = japanesePosts.find(jaPost => {
    if (matchedJaPosts.has(jaPost.id)) return false;

    const jaDate = new Date(jaPost.published_at);
    const daysDiff = Math.abs((enDate - jaDate) / (1000 * 60 * 60 * 24));

    return daysDiff <= 3; // Within 3 days
  });

  if (matchingJa) {
    core47Posts.push({
      en_id: enPost.id,
      en_title: enPost.title,
      en_slug: enPost.slug,
      en_published: enPost.published_at,
      ja_id: matchingJa.id,
      ja_published: matchingJa.published_at
    });
    matchedJaPosts.add(matchingJa.id);
  }
}

console.log(`Matched ${core47Posts.length} English posts with Japanese translations\n`);

if (core47Posts.length !== 47) {
  console.log(`⚠️  Warning: Expected 47 matches, found ${core47Posts.length}\n`);
}

// Show the core 47 titles
console.log('📋 CORE 47 ENGLISH POSTS:\n');
core47Posts.forEach((post, i) => {
  console.log(`${String(i + 1).padStart(2)}. ${post.en_title}`);
});

// Get list of English posts NOT in core 47
const core47EnIds = new Set(core47Posts.map(p => p.en_id));
const nonCore47Posts = englishPosts.filter(p => !core47EnIds.has(p.id));

if (nonCore47Posts.length > 0) {
  console.log(`\n\n📦 NON-CORE POSTS (${nonCore47Posts.length}):\n`);
  nonCore47Posts.forEach((post, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${post.title}`);
  });
}

// Now check translation status for core 47 across all languages
console.log('\n\n📊 TRANSLATION STATUS FOR CORE 47:\n');
console.log('=' .repeat(80));

const languages = [
  'es', 'fr', 'de', 'ja', 'pt', 'it', 'ko', 'zh-cn', 'nl', 'da', 'sv', 'fi'
];

const translationStatus = {};

for (const lang of languages) {
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, published_at')
    .eq('language', lang)
    .eq('status', 'published');

  if (error) {
    console.error(`Error fetching ${lang}:`, error);
    continue;
  }

  // Match by date proximity
  let matchCount = 0;
  for (const corePost of core47Posts) {
    const enDate = new Date(corePost.en_published);

    const hasTranslation = posts.some(p => {
      const pDate = new Date(p.published_at);
      const daysDiff = Math.abs((enDate - pDate) / (1000 * 60 * 60 * 24));
      return daysDiff <= 3;
    });

    if (hasTranslation) matchCount++;
  }

  translationStatus[lang] = {
    total: posts.length,
    matched: matchCount,
    missing: 47 - matchCount
  };
}

console.log('| Language | Matched | Missing | Total | Status |');
console.log('|----------|---------|---------|-------|--------|');

for (const [lang, status] of Object.entries(translationStatus)) {
  const statusIcon = status.matched === 47 ? '✅' :
                     status.matched >= 40 ? '🟡' :
                     '🔴';
  console.log(`| ${lang.padEnd(8)} | ${String(status.matched).padStart(7)} | ${String(status.missing).padStart(7)} | ${String(status.total).padStart(5)} | ${statusIcon} |`);
}

// Save core 47 list
const fs = await import('fs');
fs.writeFileSync(
  'temp-files/core-47-posts.json',
  JSON.stringify({
    count: core47Posts.length,
    posts: core47Posts.map(p => ({
      id: p.en_id,
      title: p.en_title,
      slug: p.en_slug
    })),
    translationStatus
  }, null, 2)
);

console.log('\n✅ Core 47 list saved to: temp-files/core-47-posts.json');
