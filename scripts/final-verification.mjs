import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Count French posts
const { data: frPosts, error } = await supabase
  .from('blog_posts')
  .select('slug, title')
  .eq('language', 'fr')
  .like('slug', '%-fr')
  .order('slug');

console.log('\n=== FINAL VERIFICATION ===\n');
console.log(`Total French posts with -fr suffix: ${frPosts.length}`);
console.log('\nAll French posts:');
frPosts.forEach((post, idx) => {
  console.log(`${idx + 1}. ${post.slug}`);
});

