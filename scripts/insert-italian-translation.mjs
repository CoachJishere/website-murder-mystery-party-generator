import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function insertTranslation() {
  const translation = JSON.parse(readFileSync('translation_de.txt', 'utf-8'));
  
  const { data, error } = await supabase
    .from('blog_posts')
    .insert(translation)
    .select();

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log(`✅ Successfully inserted: ${translation.slug}`);
  console.log(`Title: ${translation.title}`);
}

insertTranslation();
