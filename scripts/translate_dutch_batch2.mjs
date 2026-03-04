import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch English posts
const { data, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

if (error) {
  console.error('Error fetching posts:', error);
  process.exit(1);
}

const posts = data.filter(p => p.content?.includes('*Published: February 16, 2026'));
const batch = posts.slice(5, 10);  // Posts 6-10

console.log(`Found ${batch.length} posts for batch 2:`);
batch.forEach((post, idx) => {
  console.log(`${idx + 6}. ${post.slug}`);
});

// Save to file for translation
import { writeFileSync } from 'fs';
writeFileSync('temp-files/dutch_batch2_posts.json', JSON.stringify(batch, null, 2));
console.log('\nPosts saved to temp-files/dutch_batch2_posts.json');
