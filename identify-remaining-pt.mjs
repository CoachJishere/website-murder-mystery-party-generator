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

const optimized = enPosts.filter(p => p.slug); // All optimized posts

// Get existing Portuguese translations
const { data: ptPosts } = await supabase
  .from('blog_posts')
  .select('slug')
  .eq('language', 'pt')
  .gte('updated_at', '2026-02-21T00:00:00');

const ptSlugs = new Set(ptPosts.map(p => p.slug));

// Find missing posts
console.log('Remaining posts to translate:\n');
let count = 0;
for (const post of optimized) {
  // Check if any Portuguese version exists by checking common Portuguese patterns
  const hasPortuguese = ptPosts.some(pt => 
    pt.slug.includes(post.slug.split('-').slice(0, 3).join('-')) ||
    post.slug.includes(pt.slug.split('-').slice(0, 3).join('-'))
  );
  
  if (!hasPortuguese) {
    count++;
    console.log(`${count}. ${post.slug}`);
    console.log(`   ${post.title}\n`);
  }
}

console.log(`\nTotal remaining: ${count}`);
