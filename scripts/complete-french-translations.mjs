import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

const optimizedPosts = posts.filter(post => 
  post.content && (post.content.includes('Published:') || post.content.includes('Author:'))
);

const postsToTranslate = optimizedPosts.slice(15, 47);

console.log(`\n=== TRANSLATING ${postsToTranslate.length} POSTS TO FRENCH ===\n`);

// Save posts data for Claude to translate
fs.writeFileSync(
  '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/posts-to-translate-french.json',
  JSON.stringify(postsToTranslate, null, 2)
);

console.log('Posts data saved to temp-files/posts-to-translate-french.json');
console.log('\nPosts to translate:');
postsToTranslate.forEach((post, idx) => {
  console.log(`${idx + 16}. ${post.slug}`);
});

