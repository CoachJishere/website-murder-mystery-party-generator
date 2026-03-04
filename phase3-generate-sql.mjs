#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function escapeSql(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

function generateInsert(post, language) {
  return `INSERT INTO blog_posts (title, slug, content, meta_description, reading_time, language, status)
VALUES (
  '${escapeSql(post.title)}',
  '${escapeSql(post.slug)}',
  '${escapeSql(post.content)}',
  '${escapeSql(post.meta_description)}',
  ${post.reading_time},
  '${language}',
  'published'
)
ON CONFLICT (slug) DO NOTHING;`;
}

const batches = {
  it: [],
  sv: [],
  nl: [],
  ja: []
};

// Italian 48-61
console.log('Generating Italian SQL...');
for (let i = 48; i <= 61; i++) {
  try {
    const content = JSON.parse(readFileSync(join(__dirname, `phase3-it-${i}.json`), 'utf-8'));
    batches.it.push(generateInsert(content, 'it'));
  } catch (err) {
    console.error(`Error with it-${i}: ${err.message}`);
  }
}

// Swedish 1-15
console.log('Generating Swedish SQL...');
for (let i = 1; i <= 15; i++) {
  try {
    const content = JSON.parse(readFileSync(join(__dirname, `phase3-sv-${i}.json`), 'utf-8'));
    batches.sv.push(generateInsert(content, 'sv'));
  } catch (err) {
    console.error(`Error with sv-${i}: ${err.message}`);
  }
}

// Dutch 1-15
console.log('Generating Dutch SQL...');
for (let i = 1; i <= 15; i++) {
  try {
    const content = JSON.parse(readFileSync(join(__dirname, `phase3-nl-${i}.json`), 'utf-8'));
    batches.nl.push(generateInsert(content, 'nl'));
  } catch (err) {
    console.error(`Error with nl-${i}: ${err.message}`);
  }
}

// Japanese 48-61
console.log('Generating Japanese SQL...');
for (let i = 48; i <= 61; i++) {
  try {
    const content = readFileSync(join(__dirname, `ja-complete-post-${i}.md`), 'utf-8');
    const titleMatch = content.match(/^##\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `Japanese Post ${i}`;
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    const metaMatch = content.match(/##\s+.+\n\n(.+?)\n/);
    const metaDescription = metaMatch ? metaMatch[1].substring(0, 160) : '';

    const post = {
      title,
      slug,
      content,
      meta_description: metaDescription,
      reading_time: Math.ceil(content.split(/\s+/).length / 200)
    };

    batches.ja.push(generateInsert(post, 'ja'));
  } catch (err) {
    console.error(`Error with ja-${i}: ${err.message}`);
  }
}

// Write batch files
for (const [lang, sqls] of Object.entries(batches)) {
  const filename = `phase3-${lang}-batch.sql`;
  const sql = sqls.join('\n\n');
  console.log(`\nWriting ${filename} with ${sqls.length} statements...`);
  writeFileSync(join(__dirname, filename), sql);
}

console.log('\n✅ SQL files generated successfully!');
console.log('\nSummary:');
console.log(`  Italian: ${batches.it.length} posts`);
console.log(`  Swedish: ${batches.sv.length} posts`);
console.log(`  Dutch: ${batches.nl.length} posts`);
console.log(`  Japanese: ${batches.ja.length} posts`);
console.log(`  Total: ${batches.it.length + batches.sv.length + batches.nl.length + batches.ja.length} posts`);
