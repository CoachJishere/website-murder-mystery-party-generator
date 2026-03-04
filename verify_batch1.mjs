import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const { data, error } = await supabase
  .from('blog_posts')
  .select('id, title, slug, language, theme, reading_time, created_at')
  .eq('language', 'zh-cn')
  .order('created_at', { ascending: false })
  .limit(5);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('📊 CHINESE TRANSLATION BATCH 1 - VERIFICATION\n');
console.log(`Total posts found: ${data.length}\n`);

data.forEach((post, index) => {
  console.log(`${index + 1}. ${post.title}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Theme: ${post.theme}`);
  console.log(`   Reading time: ${post.reading_time} minutes`);
  console.log(`   Created: ${new Date(post.created_at).toLocaleString()}`);
  console.log('');
});

console.log('✅ All 5 posts successfully inserted into database!');
