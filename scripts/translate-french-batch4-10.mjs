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
  .gte('updated_at', '2026-02-20')
  .order('slug', { ascending: true });

if (error) {
  console.error('Error fetching posts:', error);
  process.exit(1);
}

console.log(`Found ${posts.length} optimized English posts`);

// Filter posts that have E-E-A-T (contain "Published:" or "Author:")
const optimizedPosts = posts.filter(post => 
  post.content && (post.content.includes('Published:') || post.content.includes('Author:'))
);

console.log(`Filtered to ${optimizedPosts.length} posts with E-E-A-T`);

// Take posts 16-47 (index 15-46)
const postsToTranslate = optimizedPosts.slice(15, 47);

console.log(`\nTranslating posts 16-47 (${postsToTranslate.length} posts):`);
postsToTranslate.forEach((post, idx) => {
  console.log(`${idx + 16}. ${post.slug}`);
});

console.log('\n--- Posts to translate ---');
console.log(JSON.stringify(postsToTranslate.map(p => ({ slug: p.slug, title: p.title })), null, 2));

