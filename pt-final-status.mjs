import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get optimized English posts
const { data: enPosts } = await supabase
  .from('blog_posts')
  .select('slug, title')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

const optimized = enPosts.filter(p => p.content || true); // All posts

// Get Portuguese posts from this translation project
const { data: ptPosts } = await supabase
  .from('blog_posts')
  .select('slug, title')
  .eq('language', 'pt')
  .gte('updated_at', '2026-02-22T00:00:00')
  .order('slug');

console.log(`PORTUGUESE TRANSLATION STATUS`);
console.log(`=============================\n`);
console.log(`Total English posts to translate: ${optimized.length}`);
console.log(`Portuguese posts completed: ${ptPosts.length}`);
console.log(`Remaining: ${optimized.length - ptPosts.length}\n`);

console.log(`Completed Portuguese posts:`);
ptPosts.forEach((p, i) => {
  console.log(`${i+1}. ${p.title}`);
});

console.log(`\n\nTarget: ${optimized.length} total Portuguese posts`);
