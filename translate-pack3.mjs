import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch English optimized posts
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20')
  .order('slug', { ascending: true });

if (error) {
  console.error('Error fetching posts:', error);
  process.exit(1);
}

// Filter posts with E-E-A-T
const eeatPosts = posts.filter(post => 
  post.content && post.content.includes('Published: February 16, 2026')
);

console.log(`Found ${eeatPosts.length} English posts with E-E-A-T`);
console.log('\nAll posts (alphabetically):');
eeatPosts.forEach((post, idx) => {
  console.log(`${idx + 1}. ${post.slug}`);
});

// Get posts 11-15 (index 10-14)
const targetPosts = eeatPosts.slice(10, 15);

console.log('\n\nPosts 11-15 to translate:');
targetPosts.forEach((post, idx) => {
  console.log(`${idx + 11}. ${post.slug}`);
});

// Save to file for translation
const fs = await import('fs');
await fs.promises.writeFile(
  'pack3-posts.json',
  JSON.stringify(targetPosts, null, 2)
);

console.log('\n✅ Saved posts to pack3-posts.json');
