import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Read the translation file
const translationFile = process.argv[2];
if (!translationFile) {
  console.error('Usage: node insert-pt-translation.mjs <translation-file.json>');
  process.exit(1);
}

const translation = JSON.parse(readFileSync(translationFile, 'utf-8'));

console.log(`\n📝 Inserting Portuguese translation:`);
console.log(`   Slug: ${translation.slug}`);
console.log(`   Title: ${translation.title}`);

// Check if already exists
const { data: existing } = await supabase
  .from('blog_posts')
  .select('id')
  .eq('slug', translation.slug)
  .eq('language', 'pt')
  .single();

if (existing) {
  console.log(`\n⊘ Post already exists with this slug`);
  process.exit(0);
}

// Insert
const { error } = await supabase
  .from('blog_posts')
  .insert(translation);

if (error) {
  console.error('\n❌ Error inserting:', error);
  process.exit(1);
}

console.log(`\n✅ Successfully inserted Portuguese translation!`);
