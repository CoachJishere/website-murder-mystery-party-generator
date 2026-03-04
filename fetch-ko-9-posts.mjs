import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Read the missing posts list
const missing = JSON.parse(fs.readFileSync('ko-missing-posts.json', 'utf8'));

console.log(`Fetching ${missing.missing_count} posts from Supabase...\n`);

const allPosts = [];

for (let i = 0; i < missing.missing_posts.length; i++) {
  const postInfo = missing.missing_posts[i];

  console.log(`[${i + 1}/${missing.missing_posts.length}] Fetching: ${postInfo.title}`);

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', postInfo.id)
    .single();

  if (error) {
    console.error(`   ERROR:`, error.message);
    continue;
  }

  allPosts.push(data);
  console.log(`   ✓ Fetched (${data.content.length} chars)\n`);
}

// Save to file
fs.writeFileSync('ko-batch-all-posts.json', JSON.stringify({
  language: 'ko',
  total_posts: allPosts.length,
  posts: allPosts.map(p => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    content: p.content,
    meta_description: p.meta_description,
    meta_keywords: p.meta_keywords,
    theme: p.theme
  }))
}, null, 2));

console.log(`✓ Saved all ${allPosts.length} posts to ko-batch-all-posts.json`);
