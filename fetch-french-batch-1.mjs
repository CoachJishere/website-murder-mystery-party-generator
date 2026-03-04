import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Read the missing posts list
const rawData = fs.readFileSync('fr-missing-posts.json', 'utf8');
const missingData = JSON.parse(rawData);

console.log('Missing data structure:', Object.keys(missingData));
console.log('Total missing posts:', missingData.missing_posts?.length || missingData.missingPosts?.length);

const missingPosts = missingData.missing_posts || missingData.missingPosts;
const first5IDs = missingPosts.slice(0, 5).map(p => p.id);

console.log('\nFetching first 5 missing French posts:');
console.log(first5IDs);

// Fetch these specific EN posts
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('id, title, slug, content, meta_description')
  .eq('language', 'en')
  .eq('status', 'published')
  .in('id', first5IDs);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

fs.writeFileSync('french-batch-1-posts-1-5.json', JSON.stringify(posts, null, 2));
console.log(`\nFetched ${posts.length} posts for French Batch 1`);
console.log('\nTitles:');
posts.forEach((p, i) => {
  console.log(`${i + 1}. ${p.title}`);
});
console.log('\nSaved to french-batch-1-posts-1-5.json');
