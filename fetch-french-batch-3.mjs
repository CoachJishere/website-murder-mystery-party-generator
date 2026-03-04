import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { config } from 'dotenv';

// Try to load .env file
config();

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable not found');
  console.error('Please set it in your environment or .env file');
  process.exit(1);
}

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  supabaseKey
);

const missingData = JSON.parse(fs.readFileSync('fr-missing-posts.json', 'utf8'));
const posts11to15 = missingData.missing_posts.slice(10, 15);
const posts11to15IDs = posts11to15.map(p => p.id);

console.log('Fetching French missing posts 11-15:');
console.log('Target posts:');
posts11to15.forEach((p, idx) => {
  console.log(`  ${idx + 11}. ${p.title}`);
});
console.log('');

const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('id, title, slug, content, meta_description')
  .eq('language', 'en')
  .eq('status', 'published')
  .in('id', posts11to15IDs);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

fs.writeFileSync('french-batch-3-posts-11-15.json', JSON.stringify(posts, null, 2));
console.log(`✓ Fetched ${posts.length} posts for French Batch 3`);
console.log('\nTitles fetched:');
posts.forEach((p, idx) => {
  console.log(`  ${idx + 1}. ${p.title}`);
});
console.log(`\nSaved to: french-batch-3-posts-11-15.json`);
