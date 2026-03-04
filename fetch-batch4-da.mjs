import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

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
const batch = posts.slice(15, 20);

console.log(`Found ${batch.length} posts for batch 4 (posts 16-20):\n`);
batch.forEach((post, idx) => {
  console.log(`${idx + 16}. ${post.title}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Length: ${post.content?.length || 0} chars\n`);
});

// Save for translation
import fs from 'fs';
fs.writeFileSync('batch4-da-posts.json', JSON.stringify(batch, null, 2));
console.log('Saved to batch4-da-posts.json');
