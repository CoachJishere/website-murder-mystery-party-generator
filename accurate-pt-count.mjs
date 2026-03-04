import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get ALL Portuguese posts (no date filter)
const { data: allPtPosts, count } = await supabase
  .from('blog_posts')
  .select('slug, updated_at', { count: 'exact' })
  .eq('language', 'pt');

console.log(`Total Portuguese posts (all time): ${count}`);
console.log(`\nRecent Portuguese posts (since Feb 21):`);

const recentPosts = allPtPosts.filter(p => p.updated_at >= '2026-02-21T00:00:00');
console.log(`Count: ${recentPosts.length}\n`);

recentPosts.forEach((p, i) => {
  console.log(`${i+1}. ${p.slug}`);
});

// Get optimized English count
const { data: enPosts } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00');

const optimized = enPosts.filter(p => p.content && p.content.includes('*Published: February 16, 2026'));
console.log(`\nTotal optimized English posts: ${optimized.length}`);
console.log(`Remaining to translate: ${optimized.length - recentPosts.length}`);
