import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch optimized English posts
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

// Filter for optimized posts
const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));

console.log(`Total optimized posts: ${optimized.length}`);
console.log('\nAll optimized posts (alphabetically):');
optimized.forEach((post, idx) => {
  console.log(`${idx + 1}. ${post.slug}`);
});

// Get batch 6-15 (indices 5-14)
const batch = optimized.slice(5, 15);

console.log(`\n\nBatch 6-15 (10 posts):`);
batch.forEach((post, idx) => {
  console.log(`${idx + 1}. ${post.slug}`);
});

// Save to file for translation
import { writeFileSync } from 'fs';
writeFileSync('/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/italian_batch2.json', JSON.stringify(batch, null, 2));
console.log('\n\nSaved batch to temp-files/italian_batch2.json');
