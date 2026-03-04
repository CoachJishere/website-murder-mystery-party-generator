import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get all optimized English posts
const { data: enPosts } = await supabase
  .from('blog_posts')
  .select('slug, title')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

const optimized = enPosts.filter(p => p.slug);

// Get existing recent Portuguese posts
const { data: ptPosts } = await supabase
  .from('blog_posts')
  .select('slug')
  .eq('language', 'pt')
  .gte('updated_at', '2026-02-21T00:00:00');

console.log(`English optimized: ${optimized.length}`);
console.log(`Portuguese recent: ${ptPosts.length}`);
console.log(`\nNext 5 to translate (starting from post ${ptPosts.length + 1}):\n`);

// Get posts 14-18 (since we have 13 done)
const nextBatch = optimized.slice(13, 18);
nextBatch.forEach((p, i) => {
  console.log(`${i+1}. ${p.slug}`);
  console.log(`   ${p.title}\n`);
});
