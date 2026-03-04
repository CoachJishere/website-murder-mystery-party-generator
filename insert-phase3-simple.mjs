import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5MTQ4NjQsImV4cCI6MjA1MDQ5MDg2NH0.vL0ZvjOAZKdJDY0mjxF4fmTNQ0_qh_IpSVWHVxLgk9I'
);

const stats = {
  it: { success: 0, duplicate: 0, error: 0 },
  sv: { success: 0, duplicate: 0, error: 0 },
  nl: { success: 0, duplicate: 0, error: 0 },
  ja: { success: 0, duplicate: 0, error: 0 }
};

async function insertPost(data, lang) {
  const { error } = await supabase
    .from('blog_posts')
    .insert([data]);

  if (error) {
    if (error.code === '23505') {
      stats[lang].duplicate++;
      return 'duplicate';
    }
    stats[lang].error++;
    console.error(`  Error: ${error.message}`);
    return 'error';
  }

  stats[lang].success++;
  return 'success';
}

async function processItalian() {
  console.log('\n📚 Italian (48-61)...');
  for (let i = 48; i <= 61; i++) {
    try {
      const post = JSON.parse(readFileSync(`phase3-it-${i}.json`, 'utf-8'));
      delete post.author_id;
      const result = await insertPost(post, 'it');
      console.log(`  ${i}: ${result}`);
    } catch (err) {
      stats.it.error++;
      console.error(`  ${i}: ${err.message}`);
    }
  }
}

async function processSwedish() {
  console.log('\n📚 Swedish (1-15)...');
  for (let i = 1; i <= 15; i++) {
    try {
      const post = JSON.parse(readFileSync(`phase3-sv-${i}.json`, 'utf-8'));
      delete post.author_id;
      const result = await insertPost(post, 'sv');
      console.log(`  ${i}: ${result}`);
    } catch (err) {
      stats.sv.error++;
      console.error(`  ${i}: ${err.message}`);
    }
  }
}

async function processDutch() {
  console.log('\n📚 Dutch (1-15)...');
  for (let i = 1; i <= 15; i++) {
    try {
      const post = JSON.parse(readFileSync(`phase3-nl-${i}.json`, 'utf-8'));
      delete post.author_id;
      const result = await insertPost(post, 'nl');
      console.log(`  ${i}: ${result}`);
    } catch (err) {
      stats.nl.error++;
      console.error(`  ${i}: ${err.message}`);
    }
  }
}

async function processJapanese() {
  console.log('\n📚 Japanese (48-61)...');
  for (let i = 48; i <= 61; i++) {
    try {
      const content = readFileSync(`ja-complete-post-${i}.md`, 'utf-8');
      const titleMatch = content.match(/^##\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : `Post ${i}`;
      const slug = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      const metaMatch = content.match(/##\s+.+\n\n(.+?)\n/);
      const meta = metaMatch ? metaMatch[1].substring(0, 160) : '';

      const post = {
        title,
        slug,
        content,
        meta_description: meta,
        reading_time: Math.ceil(content.split(/\s+/).length / 200),
        language: 'ja',
        status: 'published'
      };

      const result = await insertPost(post, 'ja');
      console.log(`  ${i}: ${result} - ${title.substring(0, 40)}...`);
    } catch (err) {
      stats.ja.error++;
      console.error(`  ${i}: ${err.message}`);
    }
  }
}

async function getFinalCounts() {
  const counts = {};
  for (const lang of ['it', 'ja', 'sv', 'nl']) {
    const { count } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .eq('language', lang)
      .eq('status', 'published');
    counts[lang] = count || 0;
  }
  return counts;
}

async function main() {
  console.log('🚀 Phase 3 Insertion Starting...\n');

  await processItalian();
  await processSwedish();
  await processDutch();
  await processJapanese();

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTS');
  console.log('='.repeat(60));

  for (const [lang, s] of Object.entries(stats)) {
    console.log(`\n${lang.toUpperCase()}:`);
    console.log(`  ✅ Success: ${s.success}`);
    console.log(`  ⏭️  Duplicate: ${s.duplicate}`);
    console.log(`  ❌ Error: ${s.error}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📈 FINAL COUNTS');
  console.log('='.repeat(60));

  const finalCounts = await getFinalCounts();
  for (const [lang, count] of Object.entries(finalCounts)) {
    console.log(`  ${lang.toUpperCase()}: ${count} posts`);
  }

  console.log('\n✨ Complete!\n');
}

main().catch(console.error);
