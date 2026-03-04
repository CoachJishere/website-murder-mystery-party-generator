import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function insertTranslation(translation) {
  console.log(`Inserting: ${translation.title}`);

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      title: translation.title,
      slug: translation.slug,
      content: translation.content,
      meta_description: translation.meta_description,
      language: 'fr',
      published: true,
    })
    .select();

  if (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }

  console.log(`✅ ${translation.title}`);
  return true;
}

async function main() {
  const translations = JSON.parse(
    readFileSync('temp-files/french-translations-6-10.json', 'utf-8')
  );

  console.log(`Inserting ${translations.length} French translations...\n`);

  let success = 0;
  for (const translation of translations) {
    if (await insertTranslation(translation)) {
      success++;
    }
  }

  console.log(`\n=== Complete: ${success}/${translations.length} translations inserted ===`);
}

main().catch(console.error);
