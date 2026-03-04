import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get counts for each language
const languages = ['en', 'it', 'es', 'fr', 'de', 'pt', 'ja', 'ko'];

console.log('POST COUNTS BY LANGUAGE:\n');

for (const lang of languages) {
  const { data, error, count } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact', head: true })
    .eq('language', lang);
  
  if (!error) {
    console.log(`${lang.toUpperCase()}: ${count} posts`);
  }
}

// Get optimized English posts
const { data: optimizedPosts } = await supabase
  .from('blog_posts')
  .select('slug, title')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

const withEEAT = optimizedPosts.filter(p => p.title && p.title.length > 0);

console.log(`\nOPTIMIZED ENGLISH POSTS (with Feb 2026 E-E-A-T): ${withEEAT.length}`);

