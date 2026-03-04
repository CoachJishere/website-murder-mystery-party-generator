import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('🇩🇪 FETCHING GERMAN BATCH 1 SOURCE POSTS\n');
console.log('='.repeat(80));

// Fetch first 10 published English posts
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('id, title, slug, content, reading_time, created_at')
  .eq('language', 'en')
  .eq('status', 'published')
  .order('id', { ascending: true })
  .limit(10);

if (error) {
  console.error('❌ ERROR:', error.message);
  process.exit(1);
}

if (!posts || posts.length === 0) {
  console.error('❌ No posts found');
  process.exit(1);
}

console.log(`✅ Found ${posts.length} English posts\n`);

// Display the posts
posts.forEach((post, index) => {
  console.log(`${index + 1}. [ID: ${post.id}] ${post.title}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Reading time: ${post.reading_time} min`);
  console.log(`   Content length: ${post.content?.length || 0} chars`);
  console.log(`   Created: ${post.created_at}`);
  console.log('');
});

// Save to JSON file
const outputFile = 'german-batch-1-source-posts.json';
writeFileSync(outputFile, JSON.stringify(posts, null, 2));

console.log('='.repeat(80));
console.log(`\n💾 Saved to: ${outputFile}`);
console.log(`📊 Total posts: ${posts.length}`);
console.log(`📝 Total content: ${posts.reduce((sum, p) => sum + (p.content?.length || 0), 0).toLocaleString()} characters`);
