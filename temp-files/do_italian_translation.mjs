import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Read the translation from translation_it.txt
const translation = JSON.parse(readFileSync('translation_it.txt', 'utf-8'));

// Get original post metadata
const batch = JSON.parse(readFileSync('temp-files/italian_batch2.json', 'utf-8'));
const originalPost = batch[translation.index];

console.log(`\n=== Inserting Post ${translation.index + 1}/10 ===`);
console.log(`Italian slug: ${translation.slug}`);

const { data, error} = await supabase
  .from('blog_posts')
  .insert({
    title: translation.title,
    slug: translation.slug,
    content: translation.content,
    meta_description: translation.meta_description,
    language: 'it',
    status: 'published',
    tags: originalPost.tags,
    author: originalPost.author || 'Mystery Maker Party Team',
    featured_image_url: originalPost.featured_image_url,
    reading_time: originalPost.reading_time,
    theme: originalPost.theme,
    published_at: originalPost.published_at,
    post_date: originalPost.post_date,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .select();

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`✅ ${translation.index + 1}/10 - Successfully inserted`);
console.log(`   Title: ${translation.title}\n`);
