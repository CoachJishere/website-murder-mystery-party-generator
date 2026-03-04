import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// This will accept a translation file and insert into database
const translationFile = process.argv[2];

if (!translationFile) {
  console.error('Usage: node insert-portuguese-translations.mjs <translation-file.json>');
  process.exit(1);
}

const fs = await import('fs/promises');
const translation = JSON.parse(await fs.readFile(translationFile, 'utf-8'));

// Insert the translation
const portuguesePost = {
  slug: translation.slug,
  title: translation.title,
  content: translation.content,
  meta_description: translation.meta_description,
  language: 'pt',
  reading_time: translation.reading_time,
  theme: translation.theme,
  status: 'published',
  author: 'AI Assistant',
  tags: translation.tags,
  created_at: translation.created_at,
  updated_at: new Date().toISOString(),
  post_date: translation.post_date,
  published_at: translation.published_at
};

const { error } = await supabase
  .from('blog_posts')
  .insert(portuguesePost);

if (error) {
  console.error('Error inserting:', error);
  process.exit(1);
}

console.log(`✅ Successfully inserted: ${translation.slug}`);
