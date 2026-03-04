import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function insertTranslatedPost(postData) {
  const frenchPost = {
    slug: postData.slug,
    language: 'fr',
    title: postData.title_fr,
    meta_description: postData.meta_description_fr,
    content: postData.content_fr,
    category: postData.category,
    published_at: postData.published_at,
    updated_at: '2026-02-20T00:00:00Z',
    author: 'Équipe Mystery Maker Party',
    featured_image: postData.featured_image,
  };

  const { error } = await supabase
    .from('blog_posts')
    .insert(frenchPost);

  if (error) {
    console.error(`❌ Error inserting ${postData.slug}:`, error.message);
    return false;
  }

  console.log(`✅ Inserted: ${postData.title_fr}`);
  return true;
}

async function main() {
  const translationsFile = process.argv[2];
  if (!translationsFile) {
    console.error('Usage: node translate-and-insert.mjs <translations-json-file>');
    return;
  }

  const data = JSON.parse(await fs.readFile(translationsFile, 'utf-8'));
  let completed = 0;

  for (const post of data.translations) {
    const success = await insertTranslatedPost(post);
    if (success) completed++;
  }

  console.log(`\n✅ Completed: ${completed}/${data.translations.length}`);
}

main();
