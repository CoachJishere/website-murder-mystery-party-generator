import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const GERMAN_EEAT = '*Veröffentlicht: 16. Februar 2026 | Aktualisiert: 20. Februar 2026 | Autor: Mystery Maker Party Team | Nächste Überprüfung: 20. Mai 2026*';

// Read translation file from command line argument
const translationFile = process.argv[2];
if (!translationFile) {
  console.error('Usage: node insert-german-translation.mjs <translation_file.json>');
  process.exit(1);
}

console.log(`Reading translation from: ${translationFile}`);
const translation = JSON.parse(readFileSync(translationFile, 'utf8'));

// Validate required fields
const required = ['slug', 'title', 'meta_description', 'content', 'categories', 'tags'];
for (const field of required) {
  if (!translation[field]) {
    console.error(`Missing required field: ${field}`);
    process.exit(1);
  }
}

// Prepare German post
const germanPost = {
  slug: translation.slug,
  language: 'de',
  title: translation.title,
  meta_description: translation.meta_description,
  content: translation.content,
  categories: translation.categories,
  tags: translation.tags,
  published_at: '2026-02-16T00:00:00Z',
  updated_at: '2026-02-20T00:00:00Z'
};

// Insert into database
console.log(`\nInserting German translation for: ${germanPost.slug}`);
const { data, error } = await supabase
  .from('blog_posts')
  .insert(germanPost)
  .select();

if (error) {
  console.error('Error inserting:', error);
  process.exit(1);
}

console.log('✅ Successfully inserted German translation');
console.log(JSON.stringify(data[0], null, 2));
