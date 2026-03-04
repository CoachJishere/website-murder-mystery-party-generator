import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function processBatch(translationsFile) {
  console.log('🇩🇪 Processing German Translation Batch...\n');

  const translations = JSON.parse(readFileSync(translationsFile, 'utf8'));
  console.log(`📝 Found ${translations.length} translations to process\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < translations.length; i++) {
    const post = translations[i];
    console.log(`[${i + 1}/${translations.length}] Processing: ${post.slug}`);

    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', post.slug)
        .eq('language', 'de')
        .single();

      if (existing) {
        console.log(`   ⏭️  Already exists\n`);
        skipCount++;
        continue;
      }

      // Insert German post
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

      const { error } = await supabase
        .from('blog_posts')
        .insert(germanPost);

      if (error) throw error;

      console.log(`   ✅ Success\n`);
      successCount++;

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      errorCount++;
    }
  }

  console.log('='.repeat(50));
  console.log(`✅ Success: ${successCount}`);
  console.log(`⏭️  Skipped: ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('='.repeat(50));
}

const file = process.argv[2];
if (!file) {
  console.log('Usage: node batch-translate-german.mjs <translations-file.json>');
  process.exit(1);
}

processBatch(file).catch(console.error);
