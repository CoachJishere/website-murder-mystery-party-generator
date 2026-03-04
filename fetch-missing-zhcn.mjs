import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
  console.error('ERROR: SUPABASE_SERVICE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findMissingZhcn() {
  // Get audit data
  const audit = JSON.parse(fs.readFileSync('./translation-audit-full.json', 'utf8'));
  const masterPosts = audit.master.posts;

  console.log(`Checking ${masterPosts.length} master posts...`);

  const missing = [];

  // For each master post, check if zh-cn translation exists
  for (const master of masterPosts) {
    // Check if there's a zh-cn post with matching slug pattern
    const { data: zhcnPost, error } = await supabase
      .from('blog_posts')
      .select('id, slug, title')
      .eq('language', 'zh-cn')
      .or(`slug.eq.${master.slug}-zh-cn,slug.like.%${master.slug}%`)
      .limit(1);

    if (error) {
      console.error(`Error checking ${master.slug}:`, error.message);
      continue;
    }

    if (!zhcnPost || zhcnPost.length === 0) {
      missing.push(master);
      console.log(`✗ Missing: ${master.title}`);
    } else {
      console.log(`✓ Found: ${master.title} → ${zhcnPost[0].title}`);
    }
  }

  console.log(`\\n===== SUMMARY =====`);
  console.log(`Total: ${masterPosts.length}`);
  console.log(`Found: ${masterPosts.length - missing.length}`);
  console.log(`Missing: ${missing.length}`);

  fs.writeFileSync('zh-cn-actually-missing.json', JSON.stringify(missing, null, 2));
  console.log(`\\nSaved ${missing.length} missing posts to zh-cn-actually-missing.json`);
}

findMissingZhcn();
