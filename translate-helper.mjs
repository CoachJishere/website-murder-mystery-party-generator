// translate-helper.mjs — Fetch English posts for translation and insert results
// Usage:
//   node translate-helper.mjs fetch <slug>           — Fetch an English post by slug
//   node translate-helper.mjs insert <lang> <json>    — Insert a translated post from JSON file
//   node translate-helper.mjs list-missing <lang>     — List missing posts for a language
//   node translate-helper.mjs fetch-batch <slugs-file> — Fetch multiple posts, output to files

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';
const headers = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

import fs from 'fs';

async function fetchPost(slug) {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}&language=eq.en&status=eq.published&select=title,slug,content,meta_description,reading_time`;
  const res = await fetch(url, { headers });
  const data = await res.json();
  if (data.length === 0) throw new Error(`Post not found: ${slug}`);
  return data[0];
}

async function insertPost(lang, postData) {
  const post = {
    title: postData.title,
    slug: postData.slug,
    content: postData.content,
    meta_description: postData.meta_description,
    reading_time: postData.reading_time || 5,
    language: lang,
    status: 'published'
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts`, {
    method: 'POST',
    headers,
    body: JSON.stringify(post)
  });

  if (!res.ok) {
    const err = await res.text();
    if (err.includes('duplicate') || err.includes('23505')) {
      return { status: 'skip', reason: 'duplicate slug' };
    }
    throw new Error(`Insert error ${res.status}: ${err}`);
  }
  return { status: 'ok' };
}

const cmd = process.argv[2];

if (cmd === 'fetch') {
  const slug = process.argv[3];
  const post = await fetchPost(slug);
  console.log(JSON.stringify(post, null, 2));
} else if (cmd === 'insert') {
  const lang = process.argv[3];
  const jsonFile = process.argv[4];
  const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
  const result = await insertPost(lang, data);
  console.log(JSON.stringify(result));
} else if (cmd === 'fetch-batch') {
  const slugsFile = process.argv[3];
  const outDir = process.argv[4] || 'translation-source';
  const slugs = JSON.parse(fs.readFileSync(slugsFile, 'utf-8'));
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  for (const slug of slugs) {
    try {
      const post = await fetchPost(slug);
      const shortSlug = slug.substring(0, 60);
      fs.writeFileSync(`${outDir}/${shortSlug}.json`, JSON.stringify(post, null, 2));
      console.log(`OK: ${shortSlug}`);
    } catch (e) {
      console.error(`FAIL: ${slug}: ${e.message}`);
    }
  }
} else if (cmd === 'insert-batch') {
  const lang = process.argv[3];
  const dir = process.argv[4];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  let ok = 0, skip = 0, fail = 0;
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf-8'));
      const result = await insertPost(lang, data);
      if (result.status === 'skip') { skip++; console.log(`SKIP: ${f}`); }
      else { ok++; console.log(`OK: ${f}`); }
    } catch (e) {
      fail++;
      console.error(`FAIL: ${f}: ${e.message}`);
    }
  }
  console.log(`\nDone: ${ok} inserted, ${skip} skipped, ${fail} failed`);
} else {
  console.log('Usage:');
  console.log('  node translate-helper.mjs fetch <slug>');
  console.log('  node translate-helper.mjs insert <lang> <json-file>');
  console.log('  node translate-helper.mjs fetch-batch <slugs-json> [outdir]');
  console.log('  node translate-helper.mjs insert-batch <lang> <dir-with-jsons>');
}
