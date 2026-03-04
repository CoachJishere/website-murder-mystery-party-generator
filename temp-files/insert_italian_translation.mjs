import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Read translation data from translation_it.txt
const translation = JSON.parse(readFileSync('translation_it.txt', 'utf-8'));

// Get original post data
const batch = JSON.parse(readFileSync('temp-files/italian_batch2.json', 'utf-8'));
const originalPost = batch[translation.index];

console.log(`\n=== Inserting Italian Translation ${translation.index + 1}/10 ===`);
console.log(`Original slug: ${originalPost.slug}`);
console.log(`Italian slug: ${translation.slug}`);

// Insert into database
const { data, error } = await supabase
  .from('blog_posts')
  .insert({
    title: translation.title,
    slug: translation.slug,
    content: translation.content,
    excerpt: translation.excerpt,
    meta_description: translation.meta_description,
    language: 'it',
    status: 'published',
    author_id: originalPost.author_id,
    featured_image: originalPost.featured_image,
    category_id: originalPost.category_id,
    tags: originalPost.tags,
    published_at: originalPost.published_at,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .select();

if (error) {
  console.error('Error inserting:', error);
  process.exit(1);
}

console.log(`\n✅ ${translation.index + 1}/10 - Successfully inserted Italian translation`);
console.log(`   Title: ${translation.title}`);
console.log(`   Slug: ${translation.slug}\n`);
