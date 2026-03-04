import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch English posts updated after Feb 20
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

if (error) {
  console.error('Error fetching posts:', error);
  process.exit(1);
}

// Filter for optimized posts (with new publish date)
const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));

console.log(`Total optimized posts: ${optimized.length}`);
console.log('\nPosts 10-19 (batch to translate):');

// Get posts 10-19 (index 9-18)
const batch = optimized.slice(9, 19);

batch.forEach((post, index) => {
  console.log(`${index + 10}. ${post.slug}`);
});

// Save to file for reference
import { writeFileSync } from 'fs';
writeFileSync('batch_10-19.json', JSON.stringify(batch, null, 2));
console.log('\n✅ Batch saved to batch_10-19.json');
