import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Count total optimized English posts
const { data: enPosts } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

const optimized = enPosts.filter(p => p.content.includes('*Published: February 16, 2026'));

// Count Portuguese translations
const { data: ptPosts, count } = await supabase
  .from('blog_posts')
  .select('*', { count: 'exact' })
  .eq('language', 'pt')
  .gte('updated_at', '2026-02-21T00:00:00');

console.log(`Total optimized English posts: ${optimized.length}`);
console.log(`Total Portuguese translations: ${count}`);
console.log(`Remaining to translate: ${optimized.length - count}`);

// List Portuguese posts that exist
console.log(`\nExisting Portuguese posts:`);
ptPosts.forEach((p, i) => {
  console.log(`${i+1}. ${p.slug}`);
});
