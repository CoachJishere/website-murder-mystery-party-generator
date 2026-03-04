import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const postNumber = process.argv[2];
if (!postNumber) {
  console.error('Usage: node insert-italian-post.mjs <post_number>');
  process.exit(1);
}

const filename = `temp-files/translated-it-${postNumber}.json`;

try {
  const translation = JSON.parse(readFileSync(filename, 'utf-8'));

  console.log(`Inserting Italian post #${postNumber}...`);
  console.log(`Slug: ${translation.slug}`);
  console.log(`Title: ${translation.title.substring(0, 60)}...`);

  // Check if exists
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', translation.slug)
    .eq('language', 'it')
    .single();

  if (existing) {
    console.log(`⊘ Already exists (id: ${existing.id})`);
    process.exit(0);
  }

  // Insert
  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      slug: translation.slug,
      title: translation.title,
      content: translation.content,
      meta_description: translation.meta_description,
      language: 'it',
      published: true,
      category: translation.category || 'murder-mystery-themes',
      featured_image: translation.featured_image || null,
      author: 'AI Assistant',
      tags: translation.tags || [],
      schema_markup: translation.schema_markup || null,
      reading_time: translation.reading_time || 15,
      created_at: translation.created_at,
      updated_at: new Date().toISOString()
    })
    .select();

  if (error) {
    console.error(`❌ Error:`, error);
    process.exit(1);
  }

  console.log(`✅ Inserted successfully (id: ${data[0].id})`);

} catch (error) {
  console.error(`❌ Error:`, error.message);
  process.exit(1);
}
