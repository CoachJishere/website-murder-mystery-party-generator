import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('🔍 Collecting completed German translations...\n');

const completedFiles = [
  'temp-files/german-batch-1.json',
  'temp-files/german-translated-batch-2-10.json',
  'temp-files/german-translated-batch-11-20.json',
  'temp-files/german-translated-batch-41-PARTIAL.json'
];

const translations = [];

for (const file of completedFiles) {
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    if (Array.isArray(data)) {
      translations.push(...data);
    } else if (data.slug) {
      translations.push(data);
    }
    console.log(`✅ Loaded: ${file}`);
  } catch (error) {
    console.log(`⚠️  Skipped ${file}: ${error.message}`);
  }
}

console.log(`\n📊 Found ${translations.length} completed translations\n`);

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

for (const post of translations) {
  console.log(`Processing: ${post.slug}`);

  try {
    // Check if already exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', post.slug)
      .eq('language', 'de')
      .single();

    if (existing) {
      console.log(`  ⏭️  Already in database\n`);
      skipCount++;
      continue;
    }

    // Insert
    const germanPost = {
      slug: post.slug,
      title: post.title,
      content: post.content,
      meta_description: post.meta_description || post.metaDescription,
      language: 'de',
      reading_time: post.reading_time || post.readingTime,
      created_at: post.created_at || post.createdAt,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('blog_posts')
      .insert(germanPost);

    if (error) throw error;

    console.log(`  ✅ Inserted successfully\n`);
    successCount++;

  } catch (error) {
    console.log(`  ❌ Error: ${error.message}\n`);
    errorCount++;
  }
}

console.log('='.repeat(50));
console.log(`✅ Inserted: ${successCount}`);
console.log(`⏭️  Skipped: ${skipCount}`);
console.log(`❌ Errors: ${errorCount}`);
console.log('='.repeat(50));
