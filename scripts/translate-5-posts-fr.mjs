import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch first 5 posts alphabetically
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .order('slug', { ascending: true })
  .limit(5);

if (error) {
  console.error('Error fetching posts:', error);
  process.exit(1);
}

console.log('Posts to translate:');
posts.forEach((post, i) => {
  console.log(`${i}. ${post.title} (${post.slug})`);
});

console.log('\n' + JSON.stringify(posts, null, 2));
