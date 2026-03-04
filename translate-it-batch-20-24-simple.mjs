import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('Fetching posts 20-24 for translation...\n');

const { data, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

const posts = data.filter(p => p.content?.includes('*Published: February 16, 2026'));
const batch = posts.slice(19, 24);

console.log(`Found ${batch.length} posts:\n`);
batch.forEach((post, idx) => {
  console.log(`${idx + 1}. ${post.title}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Content length: ${post.content.length} chars\n`);
});

// Save each post to individual file for translation
batch.forEach((post, idx) => {
  const filename = `post_it_${idx + 21}.json`;
  writeFileSync(filename, JSON.stringify(post, null, 2));
  console.log(`Saved: ${filename}`);
});

console.log('\n✅ All posts saved for translation');
