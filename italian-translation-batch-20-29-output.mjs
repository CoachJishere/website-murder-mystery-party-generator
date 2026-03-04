import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch posts 20-29
const { data: allPosts } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

const posts = allPosts.filter(p => p.content?.includes('*Published: February 16, 2026'));
const batch = posts.slice(19, 29);

console.log(`\nFetched ${batch.length} posts for Italian translation (posts 20-29)\n`);

// Output each post to a separate file for translation
batch.forEach((post, index) => {
  const postNumber = index + 20;
  const data = {
    index: postNumber,
    slug: post.slug,
    title: post.title,
    meta_description: post.meta_description,
    content: post.content,
    category: post.category,
    read_time: post.read_time
  };

  const filename = `italian-post-${postNumber}.json`;
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));

  console.log(`[${index + 1}/10] Saved: ${filename}`);
  console.log(`   Title: ${post.title}`);
  console.log(`   Slug: ${post.slug}\n`);
});

console.log(`\n✓ All 10 posts saved for translation`);
console.log(`\nNext steps:`);
console.log(`1. Translate each italian-post-*.json file using Make.com workflow or Claude`);
console.log(`2. Save translations as italian-post-*-TRANSLATED.json`);
console.log(`3. Run the insert script to add to database\n`);
