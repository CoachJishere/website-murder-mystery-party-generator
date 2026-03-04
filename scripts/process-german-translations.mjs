import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get post number from command line (6-47)
const postNum = parseInt(process.argv[2]);

if (!postNum || postNum < 6 || postNum > 47) {
  console.error('Usage: node process-german-translations.mjs <post_number>');
  console.error('Post number must be between 6 and 47');
  process.exit(1);
}

// Fetch all optimized English posts
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

// Get the specific post (index = postNum - 1)
const post = posts[postNum - 1];

if (!post) {
  console.error(`Post ${postNum} not found`);
  process.exit(1);
}

console.log(`\n=== POST ${postNum}: ${post.slug} ===\n`);

// Output post data for translation
const postData = {
  slug: post.slug,
  title: post.title,
  meta_description: post.meta_description,
  content: post.content,
  excerpt: post.excerpt,
  categories: post.categories,
  tags: post.tags
};

// Save individual post for translation
writeFileSync(
  `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/post-${postNum}-en.json`,
  JSON.stringify(postData, null, 2)
);

console.log(`Saved to temp-files/post-${postNum}-en.json`);
console.log(`\nTitle: ${post.title}`);
console.log(`Meta: ${post.meta_description}`);
console.log(`Content length: ${post.content.length} chars`);
console.log(`Excerpt length: ${post.excerpt.length} chars`);
