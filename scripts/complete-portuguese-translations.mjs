import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Step 1: Fetch all 47 optimized English posts
console.log('📚 Fetching optimized English posts...');
const { data: englishPosts, error: englishError } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20')
  .order('slug', { ascending: true });

if (englishError) {
  console.error('Error fetching English posts:', englishError);
  process.exit(1);
}

console.log(`✅ Found ${englishPosts.length} optimized English posts`);

// Step 2: Fetch all existing Portuguese posts created since 2026-02-21
console.log('\n📚 Fetching existing Portuguese posts...');
const { data: portuguesePosts, error: ptError } = await supabase
  .from('blog_posts')
  .select('slug, title')
  .eq('language', 'pt')
  .gte('created_at', '2026-02-21')
  .order('slug', { ascending: true });

if (ptError) {
  console.error('Error fetching Portuguese posts:', ptError);
  process.exit(1);
}

console.log(`✅ Found ${portuguesePosts.length} existing Portuguese posts`);

// Step 3: Identify which posts need translation
const existingPtSlugs = new Set(portuguesePosts.map(p => {
  // Convert English slug to Portuguese slug pattern
  // We need to reverse-engineer the Portuguese slug from existing ones
  return p.slug;
}));

console.log('\n📋 Existing Portuguese slugs:');
portuguesePosts.forEach(p => console.log(`  - ${p.slug}`));

// For now, list all English posts to identify which need translation
console.log('\n📋 English posts to potentially translate:');
englishPosts.forEach((post, idx) => {
  console.log(`${idx + 1}. ${post.slug} - "${post.title}"`);
});

console.log(`\n🎯 Need to translate: ${englishPosts.length - portuguesePosts.length} posts`);
console.log(`📊 Total after completion: ${englishPosts.length} Portuguese posts`);
