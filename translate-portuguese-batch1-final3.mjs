import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const postsToTranslate = [
  {
    englishSlug: '5-haunted-mansion-murder-mystery-themes',
    portugueseSlug: '5-temas-misterio-assassinato-mansao-assombrada'
  },
  {
    englishSlug: '5-mountain-lodge-murder-mystery-themes-that-will-make-your-retreat-unforgettable',
    portugueseSlug: '5-temas-misterio-assassinato-lodge-montanha-que-tornarao-retiro-inesquecivel'
  },
  {
    englishSlug: '5-renaissance-murder-mystery-party-themes',
    portugueseSlug: '5-temas-festa-misterio-assassinato-renascimento'
  }
];

console.log('🔍 Fetching English posts...\n');

for (const post of postsToTranslate) {
  const { data: englishPost, error: fetchError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', post.englishSlug)
    .eq('language', 'en')
    .single();

  if (fetchError) {
    console.error(`❌ Error fetching ${post.englishSlug}:`, fetchError);
    continue;
  }

  console.log(`✅ Found: ${post.englishSlug}`);
  console.log(`   Title: ${englishPost.title}`);
  console.log(`   Word count: ~${englishPost.content.split(' ').length} words`);
  console.log(`   Reading time: ${englishPost.reading_time} min\n`);
}

console.log('\n📋 Ready to translate 3 posts totaling ~7,991 words');
