import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Check all English blog posts matching these patterns
const patterns = [
  'haunted-mansion',
  'bookstore',
  'renaissance',
  'date-night',
  'office-teams'
];

for (const pattern of patterns) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, language, status')
    .ilike('slug', `%${pattern}%`)
    .eq('language', 'en');

  console.log(`\n=== ${pattern.toUpperCase()} ===`);
  if (error) {
    console.log('Error:', error.message);
  } else if (data && data.length > 0) {
    data.forEach(post => {
      console.log(`${post.slug} (${post.status})`);
    });
  } else {
    console.log('No posts found');
  }
}
