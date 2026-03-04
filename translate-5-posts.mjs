import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch first 5 posts alphabetically
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .order('slug', { ascending: true })
  .limit(5);

if (error) {
  console.error('Error fetching posts:', error);
  process.exit(1);
}

console.log('Fetched posts:');
posts.forEach((post, i) => {
  console.log(`${i}: ${post.slug}`);
});

// Save to file for translation
import { writeFileSync } from 'fs';
writeFileSync(
  '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/posts-to-translate.json',
  JSON.stringify(posts, null, 2)
);

console.log('\nSaved to posts-to-translate.json');
