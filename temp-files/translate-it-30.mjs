import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function main() {
  // Get post 30
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .gte('updated_at', '2026-02-20T00:00:00')
    .order('slug');

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  const posts = data.filter(p => p.content?.includes('*Published: February 16, 2026'));
  const post = posts[29]; // Post 30 (index 29)

  console.log('POST 30:', post.slug);
  console.log('Title:', post.title);

  // Save to article_to_translate.json for manual Claude translation
  const articleData = {
    slug: post.slug,
    italian_slug: 'gioco-di-mistero-per-celebrazioni-di-laurea-misteri-accademici-con-eccellenza-educativa',
    title: post.title,
    content: post.content,
    meta_description: post.meta_description
  };

  fs.writeFileSync('article_to_translate.json', JSON.stringify(articleData, null, 2));
  console.log('\n✅ Saved to article_to_translate.json');
  console.log('\nNext steps:');
  console.log('1. Use Claude to translate the content to Italian');
  console.log('2. Save Italian content to translation_it.txt');
  console.log('3. Run the insert script');
}

main().catch(console.error);
