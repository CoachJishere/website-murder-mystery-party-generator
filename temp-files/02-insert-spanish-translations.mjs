import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function main() {
  console.log('🚀 Inserting Spanish Translations\n');

  // Read translated posts from JSON file
  const translatedFile = 'temp-files/spanish-translations.json';
  let translations;

  try {
    const fileContent = readFileSync(translatedFile, 'utf-8');
    translations = JSON.parse(fileContent);
  } catch (error) {
    console.error(`❌ Error reading ${translatedFile}:`, error.message);
    console.log('\nMake sure the translation file exists with this structure:');
    console.log('[');
    console.log('  {');
    console.log('    "slug": "original-slug",');
    console.log('    "title": "Título en Español",');
    console.log('    "content": "Contenido traducido...",');
    console.log('    "meta_description": "Descripción traducida",');
    console.log('    "reading_time": 8,');
    console.log('    "created_at": "2026-02-16T..."');
    console.log('  }');
    console.log(']');
    process.exit(1);
  }

  console.log(`📚 Found ${translations.length} translated posts\n`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < translations.length; i++) {
    const translation = translations[i];
    console.log(`[${i + 1}/${translations.length}] ${translation.title}`);
    console.log(`   Slug: ${translation.slug}`);

    try {
      // Check if already exists
      const { data: existing, error: checkError } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', translation.slug)
        .eq('language', 'es')
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        console.log(`   ⏭️  Skipped: Already exists (id: ${existing.id})\n`);
        skippedCount++;
        continue;
      }

      // Insert Spanish version
      const spanishPost = {
        slug: translation.slug,
        title: translation.title,
        content: translation.content,
        meta_description: translation.meta_description,
        language: 'es',
        reading_time: translation.reading_time,
        created_at: translation.created_at,
        updated_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('blog_posts')
        .insert(spanishPost);

      if (insertError) {
        throw insertError;
      }

      console.log(`   ✅ Success\n`);
      successCount++;

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      errors.push({
        slug: translation.slug,
        title: translation.title,
        error: error.message
      });
      errorCount++;
    }
  }

  // Verification
  console.log('\n📊 Verifying...');
  const { count } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact', head: true })
    .eq('language', 'es')
    .gte('updated_at', '2026-02-21T00:00:00');

  console.log(`Spanish posts created today: ${count}\n`);

  // Summary
  console.log('='.repeat(60));
  console.log('🎉 INSERTION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${successCount}/${translations.length}`);
  console.log(`⏭️  Skipped: ${skippedCount}/${translations.length}`);
  console.log(`❌ Errors:  ${errorCount}/${translations.length}`);

  if (errors.length > 0) {
    console.log('\n📋 Errors:');
    errors.forEach(e => {
      console.log(`   - ${e.slug}: ${e.error}`);
    });
  }
}

main();
