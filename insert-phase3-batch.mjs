import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Parse the SQL file to extract post data
function parseSQLFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const posts = [];

  // Split by comment lines that mark each post
  const blocks = content.split(/^-- (?:Italian|Swedish|Dutch|Japanese) post \d+:/m);

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];

    // Find the INSERT...SELECT pattern
    const insertMatch = block.match(/INSERT INTO blog_posts \(title, slug, content, meta_description, reading_time, language, status\)\s*SELECT\s+/s);
    if (!insertMatch) continue;

    // Get everything after SELECT
    const afterSelect = block.substring(block.indexOf('SELECT ') + 7);

    // Parse the SELECT values - they're single-quoted strings separated by commas
    // The format is: 'title', 'slug', 'content...', 'meta_description', reading_time, 'language', 'status'
    // Content can span many lines and contain escaped quotes ('')

    try {
      const values = parseSelectValues(afterSelect);
      if (values) {
        posts.push(values);
      }
    } catch (e) {
      console.error(`Failed to parse block ${i}: ${e.message}`);
    }
  }

  return posts;
}

function parseSelectValues(str) {
  let pos = 0;
  const values = [];

  // We need to extract 7 values: title, slug, content, meta_description, reading_time, language, status
  // 5 are strings (quoted), 1 is a number, 1 is a string

  for (let v = 0; v < 7; v++) {
    // Skip whitespace and commas
    while (pos < str.length && (str[pos] === ' ' || str[pos] === ',' || str[pos] === '\n' || str[pos] === '\r')) {
      pos++;
    }

    if (str[pos] === "'") {
      // String value - find matching end quote (not escaped '')
      pos++; // skip opening quote
      let value = '';
      while (pos < str.length) {
        if (str[pos] === "'" && str[pos + 1] === "'") {
          // Escaped quote
          value += "'";
          pos += 2;
        } else if (str[pos] === "'") {
          // End of string
          pos++; // skip closing quote
          break;
        } else {
          value += str[pos];
          pos++;
        }
      }
      values.push(value);
    } else {
      // Number value
      let value = '';
      while (pos < str.length && str[pos] !== ',' && str[pos] !== '\n' && str[pos] !== ' ') {
        value += str[pos];
        pos++;
      }
      values.push(parseInt(value, 10));
    }
  }

  if (values.length !== 7) return null;

  return {
    title: values[0],
    slug: values[1],
    content: values[2],
    meta_description: values[3],
    reading_time: values[4],
    language: values[5],
    status: values[6],
  };
}

async function insertPosts(posts) {
  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const label = `[${i + 1}/${posts.length}] ${post.language} - ${post.title.substring(0, 50)}...`;

    // Check if already exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', post.slug)
      .eq('language', post.language)
      .maybeSingle();

    if (existing) {
      console.log(`⏭️  SKIP ${label} (already exists)`);
      skipped++;
      continue;
    }

    // Insert
    const { data, error } = await supabase
      .from('blog_posts')
      .insert(post)
      .select('id');

    if (error) {
      console.error(`❌ FAIL ${label}: ${error.message}`);
      failed++;
    } else {
      console.log(`✅ OK   ${label}`);
      inserted++;
    }
  }

  return { inserted, skipped, failed };
}

async function main() {
  console.log('Parsing SQL file...');
  const posts = parseSQLFile('all-phase3-inserts.sql');
  console.log(`Found ${posts.length} posts to insert\n`);

  // Validate
  const emptySlugs = posts.filter(p => !p.slug);
  if (emptySlugs.length > 0) {
    console.error(`ERROR: ${emptySlugs.length} posts have empty slugs!`);
    emptySlugs.forEach(p => console.error(`  - ${p.language}: ${p.title.substring(0, 50)}`));
    process.exit(1);
  }

  // Show summary by language
  const byLang = {};
  posts.forEach(p => { byLang[p.language] = (byLang[p.language] || 0) + 1; });
  console.log('Posts by language:', byLang);
  console.log('');

  const result = await insertPosts(posts);
  console.log(`\n========================================`);
  console.log(`DONE: ${result.inserted} inserted, ${result.skipped} skipped, ${result.failed} failed`);
}

main().catch(console.error);
