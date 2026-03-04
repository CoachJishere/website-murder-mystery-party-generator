import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { glob } from 'glob';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log(`\n${'='.repeat(80)}`);
console.log(`INSERTING ITALIAN TRANSLATIONS (Posts 20-29)`);
console.log(`${'='.repeat(80)}\n`);

// Find all translation files
const translationFiles = glob.sync('italian-translation-*.json');

if (translationFiles.length === 0) {
  console.log('❌ No translation files found!');
  console.log('\nExpected files like: italian-translation-20.json, italian-translation-21.json, etc.');
  console.log('\nPlease ensure translations are complete before running insert script.\n');
  process.exit(1);
}

console.log(`Found ${translationFiles.length} translation files\n`);

let successCount = 0;
let errorCount = 0;

for (const file of translationFiles.sort()) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));

    console.log(`\nProcessing: ${file}`);
    console.log(`  Title: ${data.title}`);
    console.log(`  Slug: ${data.slug}`);

    // Check if already exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', data.slug)
      .eq('language', 'it')
      .single();

    if (existing) {
      console.log(`  ⚠️  Already exists - skipping`);
      continue;
    }

    // Insert translation
    const { data: inserted, error } = await supabase
      .from('blog_posts')
      .insert({
        slug: data.slug,
        title: data.title,
        content: data.content,
        meta_description: data.meta_description,
        language: 'it',
        category: data.category,
        read_time: data.read_time,
        published: true
      })
      .select();

    if (error) {
      throw error;
    }

    console.log(`  ✓ Successfully inserted`);
    successCount++;

  } catch (error) {
    console.error(`  ✗ ERROR: ${error.message}`);
    errorCount++;
  }
}

console.log(`\n${'='.repeat(80)}`);
console.log(`INSERTION COMPLETE`);
console.log(`${'='.repeat(80)}`);
console.log(`\nSuccessfully inserted: ${successCount}`);
console.log(`Errors: ${errorCount}`);
console.log(`Total files processed: ${translationFiles.length}\n`);
