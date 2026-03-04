import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function fetchPosts() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .gte('updated_at', '2026-02-20')
    .order('slug', { ascending: true });

  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }

  // Skip first 5, take next 5 (posts 6-10)
  const batch2Posts = data.slice(5, 10);
  
  console.log(`Found ${data.length} total optimized posts`);
  console.log(`\nBatch 2 (posts 6-10):`);
  batch2Posts.forEach((post, idx) => {
    console.log(`${idx + 6}. ${post.slug} - ${post.title}`);
  });

  // Save to file for translation
  fs.writeFileSync('/tmp/batch2_posts.json', JSON.stringify(batch2Posts, null, 2));
}

fetchPosts();
