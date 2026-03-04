import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch posts with indices 40-44
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('*')
  .gte('index', 40)
  .lte('index', 44)
  .eq('language', 'en')
  .order('index', { ascending: true });

if (error) {
  console.error('Error fetching posts:', error);
  process.exit(1);
}

console.log(`Found ${posts.length} posts to translate:`);
posts.forEach(post => {
  console.log(`- Index ${post.index}: ${post.title}`);
});

// Save to file for translation
const fs = await import('fs');
fs.writeFileSync(
  'posts-to-translate-40-44.json',
  JSON.stringify(posts, null, 2)
);

console.log('\nSaved to posts-to-translate-40-44.json');
