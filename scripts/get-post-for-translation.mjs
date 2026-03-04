import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const postNum = parseInt(process.argv[2]);

const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20')
  .order('slug', { ascending: true });

if (error || !posts) {
  console.error('Error:', error);
  process.exit(1);
}

const post = posts[postNum - 1];
if (!post) {
  console.error(`Post ${postNum} not found`);
  process.exit(1);
}

// Output just the essential fields for translation
console.log(JSON.stringify({
  id: post.id,
  slug: post.slug,
  title: post.title,
  meta_description: post.meta_description,
  content_length: post.content.length,
  categories: post.categories,
  tags: post.tags
}, null, 2));

// Save full content separately
import { writeFileSync } from 'fs';
writeFileSync(
  `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/translate-post-${postNum}.json`,
  JSON.stringify(post, null, 2)
);
console.error(`\nFull content saved to temp-files/translate-post-${postNum}.json`);
