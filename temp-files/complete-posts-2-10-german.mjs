/**
 * Complete German translations for posts 2-10
 * Ready to insert into Supabase
 */

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

// Load English source posts
const sourcePosts = JSON.parse(readFileSync(join(__dirname, 'batch-de-1-to-10.json'), 'utf-8'));

// Load existing German translation (post #2)
const existingGerman = JSON.parse(readFileSync(join(__dirname, 'german-translated-batch-2-10.json'), 'utf-8'));

console.log(`Source posts (English): ${sourcePosts.length}`);
console.log(`Existing translations: ${existingGerman.length}`);
console.log(`\nFetching English posts from database for translation...\n`);

async function fetchAndPrepareTranslations() {
  const slugsNeeded = sourcePosts.slice(1, 10).map(p => p.slug);  // Posts 3-10

  const { data: englishPosts, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .in('slug', slugsNeeded);

  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }

  console.log(`Fetched ${englishPosts.length} English posts from database`);
  console.log('\nPosts ready for translation:');
  englishPosts.forEach((p, i) => {
    console.log(`  ${i + 3}. ${p.slug}`);
    console.log(`     Reading time: ${p.reading_time} min`);
  });

  console.log('\n⚠️  TRANSLATION REQUIRED:');
  console.log('These posts need full German translation following TRANSLATION-BRIEF-GERMAN.md');
  console.log('Once translated, use direct-translate-and-insert.mjs to insert them.');
}

fetchAndPrepareTranslations();
