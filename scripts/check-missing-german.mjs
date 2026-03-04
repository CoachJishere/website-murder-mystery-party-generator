import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get English posts 6-47
const { data: englishPosts } = await supabase
  .from('blog_posts')
  .select('slug')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20')
  .order('slug', { ascending: true});

const posts6to47 = englishPosts.slice(5, 47);

// Get all German posts
const { data: germanPosts } = await supabase
  .from('blog_posts')
  .select('slug')
  .eq('language', 'de');

const germanSlugs = new Set(germanPosts.map(p => p.slug));

// Find missing
const missing = [];
posts6to47.forEach((p, idx) => {
  if (!germanSlugs.has(p.slug)) {
    missing.push({ num: idx + 6, slug: p.slug });
  }
});

console.log(`\n=== GERMAN TRANSLATION STATUS ===\n`);
console.log(`Posts 6-47 (42 total):`);
console.log(`✅ Already translated: ${42 - missing.length}`);
console.log(`⏳ Still needed: ${missing.length}\n`);

if (missing.length > 0) {
  console.log(`Missing German translations:\n`);
  missing.forEach(m => {
    console.log(`${m.num}. ${m.slug}`);
  });
} else {
  console.log('🎉 ALL 42 POSTS ARE ALREADY TRANSLATED!');
}
