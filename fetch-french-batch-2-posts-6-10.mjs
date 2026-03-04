import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Read the missing posts list
const missingData = JSON.parse(fs.readFileSync('fr-missing-posts.json', 'utf8'));

console.log('Missing data structure:', Object.keys(missingData));
console.log('Missing posts array:', missingData.missing_posts ? 'missing_posts' : 'missingPosts');

const missingPosts = missingData.missing_posts || missingData.missingPosts;
const posts6to10 = missingPosts.slice(5, 10);
const posts6to10IDs = posts6to10.map(p => p.id);

console.log('\nFetching French missing posts 6-10:');
posts6to10.forEach((p, idx) => {
  console.log(`${idx + 6}. ${p.title}`);
});
console.log('\nIDs:', posts6to10IDs);

// Fetch these specific EN posts
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('id, title, slug, content, meta_description')
  .eq('language', 'en')
  .eq('status', 'published')
  .in('id', posts6to10IDs);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

fs.writeFileSync('french-batch-2-posts-6-10.json', JSON.stringify(posts, null, 2));
console.log(`\n✅ Fetched ${posts.length} posts for French Batch 2 (Posts 6-10)`);
console.log('\nFetched titles:');
posts.forEach((p, idx) => {
  console.log(`${idx + 6}. ${p.title}`);
});
console.log('\n📁 Saved to: french-batch-2-posts-6-10.json');
