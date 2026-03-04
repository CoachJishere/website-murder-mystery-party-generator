import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

//Get English posts 16-47
const { data: enPosts } = await supabase
  .from('blog_posts')
  .select('slug, title')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20')
  .order('slug', { ascending: true });

const targetPosts = enPosts.slice(15, 47);

console.log('\n=== TARGET POSTS (16-47) ===\n');

for (let i = 0; i < targetPosts.length; i++) {
  const enSlug = targetPosts[i].slug;
  const frSlug = `${enSlug}-fr`;
  
  // Check if French exists
  const { data: frPost } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('slug', frSlug)
    .eq('language', 'fr')
    .single();
  
  const status = frPost ? '✅ DONE' : '❌ MISSING';
  console.log(`${i + 16}. ${status} | ${enSlug.substring(0, 60)}`);
}

