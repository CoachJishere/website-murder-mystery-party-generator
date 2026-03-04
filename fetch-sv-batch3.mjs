import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

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
const batch = posts.slice(10, 15);

console.log(`Found ${posts.length} total posts, extracting posts 11-15 (${batch.length} posts)\n`);

batch.forEach((post, idx) => {
  console.log(`\n=== POST ${11 + idx} ===`);
  console.log(`Slug: ${post.slug}`);
  console.log(`Title: ${post.title}`);
  console.log(`Content length: ${post.content?.length || 0} chars`);
});

await fs.writeFile('batch3-sv-posts.json', JSON.stringify(batch, null, 2));
console.log('\n✅ Saved to batch3-sv-posts.json');
