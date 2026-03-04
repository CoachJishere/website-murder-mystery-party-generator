import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get all Portuguese posts from today
const { data: ptPosts, error: ptError } = await supabase
  .from('blog_posts')
  .select('slug, title')
  .eq('language', 'pt')
  .gte('updated_at', '2026-02-22T00:00:00')
  .order('slug');

if (ptError) {
  console.error('Error fetching Portuguese posts:', ptError);
  process.exit(1);
}

console.log(`Total Portuguese posts from today: ${ptPosts.length}`);
console.log('\nExisting Portuguese posts:');
ptPosts.forEach((post, i) => {
  console.log(`${i + 1}. ${post.slug}`);
});

// Get all English posts
const { data: enPosts, error: enError } = await supabase
  .from('blog_posts')
  .select('slug, title')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

console.log(`\nTotal English posts: ${enPosts.length}`);

// Find which English posts don't have Portuguese equivalents
const ptSlugBases = new Set(ptPosts.map(p => {
  // Extract base slug by removing -pt suffix
  return p.slug.replace(/-pt$/, '');
}));

const needTranslation = enPosts.filter(enPost => {
  return !ptSlugBases.has(enPost.slug);
});

console.log(`\n${needTranslation.length} posts need translation:`);
needTranslation.forEach((post, i) => {
  console.log(`${i + 1}. ${post.slug}`);
});
