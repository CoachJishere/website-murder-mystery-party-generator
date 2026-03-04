import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch all English posts
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('id, title, created_at')
  .eq('language', 'en')
  .order('created_at', { ascending: true });

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`Total English posts: ${posts.length}\n`);

// Show posts 40-44 (indices 40-44, which are posts 41-45)
const targetPosts = posts.slice(40, 45);

console.log('Posts at indices 40-44 (posts 41-45):');
targetPosts.forEach((post, i) => {
  console.log(`${40 + i}: ${post.title}`);
  console.log(`   ID: ${post.id}`);
  console.log(`   Created: ${post.created_at}\n`);
});

// Save IDs for fetching full content
const fs = await import('fs');
fs.writeFileSync(
  'post-ids-40-44.json',
  JSON.stringify(targetPosts.map(p => p.id), null, 2)
);

console.log('Saved IDs to post-ids-40-44.json');
