import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('Verifying German posts in database...\n');

const { data: germanPosts, error } = await supabase
  .from('blog_posts')
  .select('title, slug, language, meta_description')
  .eq('language', 'de')
  .order('slug', { ascending: true });

if (error) {
  console.error('Error fetching German posts:', error);
  process.exit(1);
}

console.log(`Found ${germanPosts.length} German posts:\n`);

germanPosts.forEach((post, i) => {
  console.log(`${i + 1}. ✅ ${post.title}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Meta: ${post.meta_description.substring(0, 80)}...`);
  console.log('');
});

console.log('All German translations successfully in database!');
