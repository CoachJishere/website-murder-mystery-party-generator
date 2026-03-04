import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function insertSpanishPost(translation) {
  const { data, error } = await supabase
    .from('blog_posts')
    .insert(translation)
    .select();

  if (error) {
    console.error(`❌ Error inserting:`, error);
    return false;
  }

  console.log(`✅ ${translation.title}`);
  return true;
}

async function main() {
  // Read the translation file
  const translationData = await fs.readFile('spanish-translations-31-35.json', 'utf8');
  const translations = JSON.parse(translationData);

  console.log(`Inserting ${translations.length} Spanish posts...\n`);

  for (const translation of translations) {
    await insertSpanishPost(translation);
  }

  console.log('\n✨ All posts inserted!');
}

main();
