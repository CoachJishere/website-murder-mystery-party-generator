import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get English posts 16-47
const { data: enPosts } = await supabase
  .from('blog_posts')
  .select('slug')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20')
  .order('slug', { ascending: true });

const targetPosts = enPosts.slice(15, 47).map(p => p.slug);

// Check which have French translations
const { data: frPosts } = await supabase
  .from('blog_posts')
  .select('slug')
  .eq('language', 'fr')
  .in('slug', targetPosts);

const frSlugs = frPosts.map(p => p.slug);
const missing = targetPosts.filter(slug => !frSlugs.includes(slug));

console.log(`\n=== FRENCH TRANSLATION STATUS ===`);
console.log(`Total target posts: ${targetPosts.length}`);
console.log(`Already translated: ${frSlugs.length}`);
console.log(`Still need translation: ${missing.length}\n`);

if (missing.length > 0) {
  console.log('Missing French translations:');
  missing.forEach((slug, idx) => {
    console.log(`${idx + 1}. ${slug}`);
  });
}

