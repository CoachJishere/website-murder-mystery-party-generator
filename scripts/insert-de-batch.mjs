import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// This script inserts one German translation at a time
// Usage: node insert-de-batch.mjs <post_object_as_json>

const args = process.argv.slice(2);
const postData = JSON.parse(args[0]);

console.log(`Inserting German translation: ${postData.slug}`);

const { data, error } = await supabase
  .from('blog_posts')
  .insert(postData)
  .select();

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('✅ Inserted successfully');
