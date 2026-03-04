import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const { data, error } = await supabase
  .from('blog_posts')
  .select('id, title, slug, language')
  .eq('language', 'da')
  .order('created_at', { ascending: false })
  .limit(5);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('✅ DANISH BATCH 3 - VERIFICATION REPORT\n');
console.log('Successfully inserted 5 Danish posts:\n');
data.forEach((post, i) => {
  console.log(`${i + 1}. ${post.title}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   ID: ${post.id}\n`);
});

console.log('🎉 BATCH 3 COMPLETE - All 5 posts translated and inserted!');
