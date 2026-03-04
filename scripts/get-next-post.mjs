import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function getNextPost() {
  // Get all optimized English posts
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .gte('updated_at', '2026-02-20T00:00:00')
    .order('slug');

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));

  // Get existing Italian posts
  const { data: italian } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('language', 'it');

  const italianSlugs = new Set(italian?.map(p => p.slug.replace('-it', '')) || []);

  // Find next untranslated post
  for (let i = 0; i < optimized.length; i++) {
    const englishSlug = optimized[i].slug;

    if (!italianSlugs.has(englishSlug)) {
      console.log(`\nNext post to translate: ${i + 1}/${optimized.length}`);
      console.log(`Title: ${optimized[i].title}`);
      console.log(`Slug: ${englishSlug}\n`);

      writeFileSync('article_to_translate.json', JSON.stringify(optimized[i], null, 2));
      console.log('✅ Saved to article_to_translate.json\n');
      console.log(`Progress: ${italianSlugs.size}/47 complete, ${47 - italianSlugs.size} remaining`);
      return;
    }
  }

  console.log('🎉 All posts translated!');
}

getNextPost();
