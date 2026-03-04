import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get EN post about butler
const { data: enPost } = await supabase
  .from('blog_posts')
  .select('slug, title, tags, theme')
  .eq('language', 'en')
  .ilike('slug', '%butler%')
  .limit(1)
  .single();

console.log('EN Butler post:');
console.log('  slug:', enPost.slug);
console.log('  title:', enPost.title);
console.log('  tags:', enPost.tags);
console.log('  theme:', enPost.theme);

// Get DE post about butler
const { data: dePost } = await supabase
  .from('blog_posts')
  .select('slug, title, tags, theme')
  .eq('language', 'de')
  .ilike('title', '%butler%')
  .limit(1)
  .single();

if (dePost) {
  console.log('\nDE Butler post:');
  console.log('  slug:', dePost.slug);
  console.log('  title:', dePost.title);
  console.log('  tags:', dePost.tags);
  console.log('  theme:', dePost.theme);
}

// Check if theme matches
console.log('\nThemes match?', enPost.theme === dePost?.theme);
