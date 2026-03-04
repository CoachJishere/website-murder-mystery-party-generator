import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch optimized English posts
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20')
  .ilike('content', '%*Published: February 16, 2026%')
  .order('slug', { ascending: true });

if (error) {
  console.error('Error fetching posts:', error);
  process.exit(1);
}

console.log(`Found ${posts.length} optimized English posts`);

// Get posts 16-20 (index 15-19)
const postsToTranslate = posts.slice(15, 20);

console.log(`\nPosts 16-20 to translate:`);
postsToTranslate.forEach((post, i) => {
  console.log(`${i + 16}. ${post.slug}`);
});

// Save for translation
console.log(JSON.stringify(postsToTranslate, null, 2));
