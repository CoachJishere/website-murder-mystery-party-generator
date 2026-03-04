import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Read the post IDs
const postIds = JSON.parse(fs.readFileSync('post-ids-40-44.json', 'utf-8'));

// Fetch full content
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('*')
  .in('id', postIds);

if (error) {
  console.error('Error fetching posts:', error);
  process.exit(1);
}

// Sort posts by created_at to maintain order
posts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

console.log(`Fetched ${posts.length} posts for translation\n`);

// Save to file for translation
fs.writeFileSync('posts-to-translate-40-44.json', JSON.stringify(posts, null, 2));
console.log('Saved to posts-to-translate-40-44.json');

// Display titles
posts.forEach((post, i) => {
  console.log(`Post ${40 + i}: ${post.title}`);
});
