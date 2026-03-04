import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const command = process.argv[2];

async function fetchPosts() {
  console.log('📥 Fetching optimized English posts...');

  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .gte('updated_at', '2026-02-20T00:00:00');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  const optimized = posts.filter(p => p.content?.includes('*Published: February 16, 2026'));

  // Check existing German translations
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('language', 'de');

  const existingSlugs = new Set(existing?.map(p => p.slug) || []);
  const toTranslate = optimized.filter(p => !existingSlugs.has(p.slug));

  console.log(`\n📊 Status:`);
  console.log(`   Total optimized: ${optimized.length}`);
  console.log(`   Already in German: ${existingSlugs.size}`);
  console.log(`   Need translation: ${toTranslate.length}\n`);

  // Save posts to translate
  writeFileSync('temp-files/posts-to-translate-de.json', JSON.stringify(toTranslate, null, 2));
  console.log('✅ Posts saved to temp-files/posts-to-translate-de.json\n');

  return toTranslate;
}

async function insertTranslation(translationFile) {
  console.log(`📝 Reading translation from ${translationFile}...`);

  const translation = JSON.parse(readFileSync(translationFile, 'utf8'));

  const germanPost = {
    slug: translation.slug,
    title: translation.title,
    content: translation.content,
    meta_description: translation.meta_description,
    language: 'de',
    reading_time: translation.reading_time,
    created_at: translation.created_at,
    updated_at: new Date().toISOString()
  };

  // Check if already exists
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', translation.slug)
    .eq('language', 'de')
    .single();

  if (existing) {
    console.log(`⚠️  German version already exists for ${translation.slug}`);
    return;
  }

  // Insert
  const { error } = await supabase
    .from('blog_posts')
    .insert(germanPost);

  if (error) {
    console.error('❌ Error inserting:', error);
    return;
  }

  console.log(`✅ Successfully inserted: ${translation.title}`);
}

async function verifyGerman() {
  console.log('🔍 Verifying German translations...\n');

  const { data: german, error } = await supabase
    .from('blog_posts')
    .select('slug, title, updated_at')
    .eq('language', 'de')
    .gte('updated_at', '2026-02-21T00:00:00')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`✅ Found ${german.length} German posts created today:\n`);
  german.forEach((p, i) => {
    console.log(`${i + 1}. ${p.slug}`);
  });
}

// Command dispatcher
switch (command) {
  case 'fetch':
    await fetchPosts();
    break;
  case 'insert':
    await insertTranslation(process.argv[3]);
    break;
  case 'verify':
    await verifyGerman();
    break;
  default:
    console.log('Usage:');
    console.log('  node german-translation-handler.mjs fetch');
    console.log('  node german-translation-handler.mjs insert <translation-file.json>');
    console.log('  node german-translation-handler.mjs verify');
}
