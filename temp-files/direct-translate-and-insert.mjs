import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Load all translations
const translations = JSON.parse(
  readFileSync(join(__dirname, 'german-translated-batch-2-10.json'), 'utf-8')
);

console.log(`\nInserting ${translations.length} German translations into Supabase...\n`);

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

for (const post of translations) {
  console.log(`Processing: ${post.slug.substring(0, 50)}...`);

  try {
    // Check if exists
    const { data: existing, error: checkError } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', post.slug)
      .eq('language', 'de')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existing) {
      console.log(`  ⊘ Already exists (id: ${existing.id})`);
      skipCount++;
      continue;
    }

    // Insert
    const germanPost = {
      slug: post.slug,
      title: post.title,
      content: post.content,
      meta_description: post.meta_description,
      language: 'de',
      reading_time: post.reading_time,
      created_at: post.created_at,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('blog_posts')
      .insert(germanPost)
      .select();

    if (error) throw error;

    console.log(`  ✓ Inserted (id: ${data[0].id})`);
    successCount++;

  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    errorCount++;
  }
}

console.log(`\n========== SUMMARY ==========`);
console.log(`✓ Inserted: ${successCount}`);
console.log(`⊘ Skipped: ${skipCount}`);
console.log(`✗ Errors: ${errorCount}`);
console.log(`============================\n`);
