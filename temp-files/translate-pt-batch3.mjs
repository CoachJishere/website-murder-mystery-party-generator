import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('Fetching English posts updated after Feb 20, 2026...');

const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

if (error) {
  console.error('Error fetching posts:', error);
  process.exit(1);
}

console.log(`Found ${posts.length} English posts`);

const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));
console.log(`${optimized.length} posts are optimized (contain Feb 16 publish date)`);

const batch3 = optimized.slice(10, 15);
console.log(`\nBatch 3 (Posts 11-15):`);
batch3.forEach((post, idx) => {
  console.log(`${idx + 11}. ${post.slug}`);
});
