import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get all English posts
const { data: enPosts } = await supabase
  .from('blog_posts')
  .select('slug, title')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

// Get Portuguese posts
const { data: ptPosts } = await supabase
  .from('blog_posts')
  .select('slug, title')
  .eq('language', 'pt')
  .gte('updated_at', '2026-02-22T00:00:00')
  .order('slug');

console.log(`Current: ${ptPosts.length}/${enPosts.length}\n`);
console.log('Next 5 English posts to translate:\n');

// Show posts 17-21 (we have 16 done)
for (let i = 16; i < 21 && i < enPosts.length; i++) {
  console.log(`${i-15}. ${enPosts[i].slug}`);
  console.log(`   ${enPosts[i].title}\n`);
}
