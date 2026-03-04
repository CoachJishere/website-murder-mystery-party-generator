import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

function createGermanSlug(germanTitle) {
  return germanTitle
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 150);
}

async function insertGermanPosts(translationsFile) {
  console.log('🇩🇪 INSERTING GERMAN POSTS');
  console.log('='.repeat(70));

  const translations = JSON.parse(readFileSync(translationsFile, 'utf8'));
  const englishPosts = JSON.parse(readFileSync('./posts-to-translate-de.json', 'utf8'));

  console.log(`\n📝 Processing ${translations.length} translations\n`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const translation of translations) {
    const englishPost = englishPosts.find(p => p.slug === translation.english_slug);

    if (!englishPost) {
      console.log(`❌ Could not find English post: ${translation.english_slug}\n`);
      errors++;
      continue;
    }

    const germanSlug = createGermanSlug(translation.title);

    console.log(`Processing: ${englishPost.title.substring(0, 60)}...`);
    console.log(`   → ${translation.title.substring(0, 60)}...`);
    console.log(`   Slug: ${germanSlug}`);

    try {
      // Check if exists
      const { data: existing } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', germanSlug)
        .single();

      if (existing) {
        console.log(`   ⏭️  Already exists\n`);
        skipped++;
        continue;
      }

      // Insert
      const germanPost = {
        slug: germanSlug,
        title: translation.title,
        content: translation.content,
        meta_description: translation.meta_description,
        language: 'de',
        reading_time: englishPost.reading_time,
        theme: englishPost.theme || null,
        meta_keywords: englishPost.meta_keywords || null,
        tags: englishPost.tags || [],
        author: englishPost.author || 'AI Assistant',
        status: 'published',
        created_at: englishPost.created_at,
        updated_at: new Date().toISOString(),
        published_at: englishPost.published_at || englishPost.created_at,
        post_date: englishPost.post_date || englishPost.created_at.split('T')[0]
      };

      const { error } = await supabase.from('blog_posts').insert(germanPost);
      if (error) throw error;

      console.log(`   ✅ Successfully inserted\n`);
      inserted++;

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      errors++;
    }
  }

  console.log('='.repeat(70));
  console.log(`✅ Inserted: ${inserted}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log('='.repeat(70));
}

const file = process.argv[2];
if (!file) {
  console.log('Usage: node insert-german-post.mjs <translations.json>');
  console.log('\nExpected JSON format:');
  console.log('[');
  console.log('  {');
  console.log('    "english_slug": "original-english-slug",');
  console.log('    "title": "German Title",');
  console.log('    "content": "Full German content...",');
  console.log('    "meta_description": "German meta description"');
  console.log('  }');
  console.log(']');
  process.exit(1);
}

insertGermanPosts(file).catch(console.error);
