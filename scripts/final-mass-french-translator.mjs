import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get list of remaining posts
const { data: enPosts } = await supabase
  .from('blog_posts')
  .select('slug')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20')
  .order('slug', { ascending: true});

const targetPosts = enPosts.slice(15, 47).map(p => p.slug);

const { data: frPosts } = await supabase
  .from('blog_posts')
  .select('slug')
  .eq('language', 'fr')
  .like('slug', '%-fr');

const frSlugs = frPosts.map(p => p.slug.replace('-fr', ''));
const remaining = targetPosts.filter(slug => !frSlugs.includes(slug));

console.log(`\n=== READY FOR CLAUDE TRANSLATION ===`);
console.log(`Remaining posts: ${remaining.length}`);
console.log(`\nNext 5 to translate:`);
remaining.slice(0, 5).forEach((slug, idx) => {
  console.log(`${idx + 1}. ${slug.substring(0, 60)}...`);
});

// Save full list
console.log(`\n\nFull remaining list saved for processing`);
console.log(JSON.stringify(remaining, null, 2));

