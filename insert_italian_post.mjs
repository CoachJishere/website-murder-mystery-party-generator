import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function insertPost(translation) {
  const { error } = await supabase
    .from('blog_posts')
    .insert({
      title: translation.title,
      slug: translation.slug,
      content: translation.content,
      meta_description: translation.meta_description,
      language: 'it',
      theme: 'themes',
      featured_image_url: translation.featured_image || null,
      author: translation.author || 'AI Assistant',
      status: 'published',
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Insert error:', error);
    return false;
  }
  
  return true;
}

async function main() {
  const translationPath = process.argv[2];
  if (!translationPath) {
    console.error('Usage: node insert_italian_post.mjs <translation_file.json>');
    return;
  }
  
  const translation = JSON.parse(fs.readFileSync(translationPath, 'utf8'));
  const success = await insertPost(translation);
  
  if (success) {
    console.log(`✅ Successfully inserted: ${translation.slug}`);
  }
}

main();
