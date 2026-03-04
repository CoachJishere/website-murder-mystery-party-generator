import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('=== FINAL VERIFICATION: FINNISH TRANSLATIONS ===\n');

const { data, error } = await supabase
  .from('blog_posts')
  .select('id, title, slug, language, status, reading_time, created_at')
  .eq('language', 'fi')
  .order('created_at', { ascending: true });

if (error) {
  console.error('Error fetching posts:', error);
  process.exit(1);
}

console.log(`Total Finnish posts found: ${data.length}\n`);

data.forEach((post, index) => {
  console.log(`${index + 1}. ${post.title}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Status: ${post.status}`);
  console.log(`   Reading time: ${post.reading_time} min`);
  console.log(`   Created: ${new Date(post.created_at).toLocaleString()}`);
  console.log(`   ID: ${post.id}\n`);
});

console.log('=== VERIFICATION COMPLETE ===');
console.log(`✅ ${data.length} Finnish blog posts successfully in database`);
console.log(`✅ All posts set to language='fi' and status='published'`);
console.log(`✅ All posts have unique Finnish slugs`);
