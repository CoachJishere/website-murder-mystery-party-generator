import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const { data, error } = await supabase
  .from('blog_posts')
  .select('id, title, slug, language, theme')
  .eq('language', 'ko')
  .in('theme', ['Beach Resort', 'Casino', 'Haunted Mansion', 'Mountain Lodge', 'Renaissance'])
  .order('title');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('Korean Posts Successfully Inserted:\n');
data.forEach((post, i) => {
  console.log(`${i+1}. ${post.theme}`);
  console.log(`   Title: ${post.title}`);
  console.log(`   Slug: ${post.slug}`);
  console.log('');
});

console.log(`Total: ${data.length} Korean posts`);
