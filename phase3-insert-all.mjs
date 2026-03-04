#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

const results = {
  it: { success: 0, duplicate: 0, error: 0, errors: [] },
  sv: { success: 0, duplicate: 0, error: 0, errors: [] },
  nl: { success: 0, duplicate: 0, error: 0, errors: [] },
  ja: { success: 0, duplicate: 0, error: 0, errors: [] }
};

async function insertPost(post, language) {
  const postData = {
    title: post.title,
    slug: post.slug,
    content: post.content,
    meta_description: post.meta_description,
    reading_time: post.reading_time,
    language: language,
    status: 'published'
  };

  const { data, error } = await supabase
    .from('blog_posts')
    .insert([postData])
    .select();

  if (error) {
    if (error.code === '23505') { // Unique violation
      results[language].duplicate++;
      return { status: 'duplicate', slug: post.slug };
    } else {
      results[language].error++;
      results[language].errors.push({ slug: post.slug, error: error.message });
      return { status: 'error', slug: post.slug, error };
    }
  }

  results[language].success++;
  return { status: 'success', slug: post.slug };
}

async function processItalian() {
  console.log('\n📚 Processing Italian posts (48-61)...');
  for (let i = 48; i <= 61; i++) {
    const filename = `phase3-it-${i}.json`;
    try {
      const content = JSON.parse(readFileSync(join(__dirname, filename), 'utf-8'));
      const result = await insertPost(content, 'it');
      console.log(`  ${i}: ${result.status} - ${content.title.substring(0, 50)}...`);
    } catch (err) {
      console.error(`  ${i}: ERROR - ${err.message}`);
      results.it.error++;
    }
  }
}

async function processSwedish() {
  console.log('\n📚 Processing Swedish posts (1-15)...');
  for (let i = 1; i <= 15; i++) {
    const filename = `phase3-sv-${i}.json`;
    try {
      const content = JSON.parse(readFileSync(join(__dirname, filename), 'utf-8'));
      const result = await insertPost(content, 'sv');
      console.log(`  ${i}: ${result.status} - ${content.title.substring(0, 50)}...`);
    } catch (err) {
      console.error(`  ${i}: ERROR - ${err.message}`);
      results.sv.error++;
    }
  }
}

async function processDutch() {
  console.log('\n📚 Processing Dutch posts (1-15)...');
  for (let i = 1; i <= 15; i++) {
    const filename = `phase3-nl-${i}.json`;
    try {
      const content = JSON.parse(readFileSync(join(__dirname, filename), 'utf-8'));
      const result = await insertPost(content, 'nl');
      console.log(`  ${i}: ${result.status} - ${content.title.substring(0, 50)}...`);
    } catch (err) {
      console.error(`  ${i}: ERROR - ${err.message}`);
      results.nl.error++;
    }
  }
}

async function processJapanese() {
  console.log('\n📚 Processing Japanese posts (48-61)...');

  for (let i = 48; i <= 61; i++) {
    const filename = `ja-complete-post-${i}.md`;
    try {
      const content = readFileSync(join(__dirname, filename), 'utf-8');

      // Extract title from first H2 heading
      const titleMatch = content.match(/^##\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : `Japanese Post ${i}`;

      // Create slug from title
      const slug = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      // Extract meta description (first paragraph after title)
      const metaMatch = content.match(/##\s+.+\n\n(.+?)\n/);
      const metaDescription = metaMatch ? metaMatch[1].substring(0, 160) : '';

      const post = {
        title,
        slug,
        content,
        meta_description: metaDescription,
        reading_time: Math.ceil(content.split(/\s+/).length / 200),
        language: 'ja',
        status: 'published'
      };

      const result = await insertPost(post, 'ja');
      console.log(`  ${i}: ${result.status} - ${title.substring(0, 50)}...`);
    } catch (err) {
      console.error(`  ${i}: ERROR - ${err.message}`);
      results.ja.error++;
    }
  }
}

async function getFinalCounts() {
  const counts = {};
  for (const lang of ['it', 'ja', 'sv', 'nl']) {
    const { count, error } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .eq('language', lang)
      .eq('status', 'published');

    counts[lang] = count || 0;
  }
  return counts;
}

async function main() {
  console.log('🚀 Starting Phase 3 Translation Insertions\n');

  await processItalian();
  await processSwedish();
  await processDutch();
  await processJapanese();

  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));

  for (const [lang, stats] of Object.entries(results)) {
    console.log(`\n${lang.toUpperCase()}:`);
    console.log(`  ✅ Successfully inserted: ${stats.success}`);
    console.log(`  ⏭️  Duplicates skipped: ${stats.duplicate}`);
    console.log(`  ❌ Errors: ${stats.error}`);
    if (stats.errors.length > 0) {
      stats.errors.forEach(e => {
        console.log(`     - ${e.slug}: ${e.error}`);
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📈 FINAL PUBLISHED COUNTS');
  console.log('='.repeat(60));

  const finalCounts = await getFinalCounts();
  for (const [lang, count] of Object.entries(finalCounts)) {
    console.log(`  ${lang.toUpperCase()}: ${count} posts`);
  }

  console.log('\n✨ Phase 3 insertion complete!\n');
}

main().catch(console.error);
