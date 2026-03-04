import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const slugsToVerify = [
  '5-temas-misterio-assassinato-mansao-assombrada',
  '5-temas-misterio-assassinato-lodge-montanha-que-tornarao-retiro-inesquecivel',
  '5-temas-festa-misterio-assassinato-renascimento'
];

console.log('🔍 VERIFYING PORTUGUESE BATCH 1 FINAL 3 POSTS\n');
console.log('='.repeat(80));

for (const slug of slugsToVerify) {
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('slug, title, language, reading_time, status, theme')
    .eq('slug', slug)
    .eq('language', 'pt')
    .single();

  if (error) {
    console.log(`\n❌ NOT FOUND: ${slug}`);
    console.log(`   Error: ${error.message}`);
  } else {
    console.log(`\n✅ VERIFIED: ${slug}`);
    console.log(`   Title: ${post.title}`);
    console.log(`   Reading Time: ${post.reading_time} min`);
    console.log(`   Status: ${post.status}`);
    console.log(`   Theme: ${post.theme}`);
    console.log(`   Word Count: ~${post.content?.split(' ').length || 0} words`);
  }
}

console.log('\n' + '='.repeat(80));

// Get total count of Portuguese posts
const { data: allPosts, error: countError } = await supabase
  .from('blog_posts')
  .select('slug, title')
  .eq('language', 'pt')
  .order('slug');

if (!countError) {
  console.log(`\n📊 TOTAL PORTUGUESE POSTS IN DATABASE: ${allPosts.length}`);
  console.log('\nAll Portuguese posts:');
  allPosts.forEach((post, index) => {
    console.log(`   ${index + 1}. ${post.slug}`);
  });
}

console.log('\n✨ Portuguese Batch 1 (Posts 3-5) translation COMPLETE!\n');
