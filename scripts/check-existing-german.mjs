import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Check for existing German posts
const { data: germanPosts, error } = await supabase
  .from('blog_posts')
  .select('id, slug, title')
  .eq('language', 'de')
  .order('slug', { ascending: true });

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`\nExisting German posts in database: ${germanPosts.length}\n`);

if (germanPosts.length > 0) {
  germanPosts.forEach((p, idx) => {
    console.log(`${idx + 1}. ${p.slug}`);
  });
} else {
  console.log('No German posts found in database.');
}
