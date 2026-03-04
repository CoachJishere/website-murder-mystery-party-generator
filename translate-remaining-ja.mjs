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
  .order('slug', { ascending: true });

if (error) {
  console.error('Error fetching posts:', error);
  process.exit(1);
}

console.log(`Fetched ${posts.length} optimized English posts`);

// Take posts 6-47 (index 5-46)
const postsToTranslate = posts.slice(5, 47);
console.log(`Will translate ${postsToTranslate.length} posts (index 5-46)`);

// Log the slugs
console.log('\nPosts to translate:');
postsToTranslate.forEach((post, idx) => {
  console.log(`${idx + 6}. ${post.slug}`);
});

// Save to file for translation
const fs = await import('fs');
fs.writeFileSync(
  'posts-to-translate-ja.json',
  JSON.stringify(postsToTranslate, null, 2)
);

console.log('\nSaved posts to posts-to-translate-ja.json');
