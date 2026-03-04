import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mhfikaomkmqcndqfohbp.supabase.co';
// Use anon key for read operations
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE2OTcyMzQsImV4cCI6MjA0NzI3MzIzNH0.WJkzoF4mH3Yb7WC4CyPXs95xTiLBc7WBhx_cmR5HH64';

const supabase = createClient(supabaseUrl, supabaseKey);

const audit = JSON.parse(fs.readFileSync('./translation-audit-full.json', 'utf8'));
const masterPosts = audit.master.posts;

async function findMissing() {
  const missing = [];
  const found = [];

  console.log(`Checking ${masterPosts.length} master posts...\\n`);

  for (let i = 0; i < masterPosts.length; i++) {
    const master = masterPosts[i];
    const num = i + 1;

    // Fetch the English post
    const { data: enPost, error: enError } = await supabase
      .from('blog_posts')
      .select('id, slug, title')
      .eq('language', 'en')
      .eq('id', master.id)
      .single();

    if (enError || !enPost) {
      console.log(`${num}. ❌ English post not found: ${master.title}`);
      continue;
    }

    // Now check if ANY zh-cn post exists with related content
    // Try multiple strategies
    const { data: zhPosts, error: zhError } = await supabase
      .from('blog_posts')
      .select('id, slug, title')
      .eq('language', 'zh-cn')
      .or(`slug.like.%${master.slug}%,title.ilike.%${master.title.substring(0, 20)}%`)
      .limit(5);

    if (zhPosts && zhPosts.length > 0) {
      console.log(`${num}. ✓ Found: ${master.title}`);
      found.push({ ...master, zhcnMatch: zhPosts[0] });
    } else {
      console.log(`${num}. ✗ MISSING: ${master.title}`);
      missing.push(master);
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\\n===== RESULTS =====`);
  console.log(`Total checked: ${masterPosts.length}`);
  console.log(`Found: ${found.length}`);
  console.log(`Missing: ${missing.length}`);

  fs.writeFileSync('zh-cn-definitely-missing.json', JSON.stringify(missing, null, 2));
  console.log(`\\nSaved ${missing.length} missing posts to zh-cn-definitely-missing.json`);
}

findMissing();
