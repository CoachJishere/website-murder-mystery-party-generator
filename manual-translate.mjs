import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = JSON.parse(readFileSync('posts-to-translate.json', 'utf-8'));

// Read pre-translated German content from files
async function insertGermanPost(postIndex, germanContent, germanTitle, germanMeta) {
  const originalPost = posts[postIndex];
  const germanSlug = originalPost.slug + '-de';

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      title: germanTitle,
      slug: germanSlug,
      content: germanContent,
      meta_description: germanMeta,
      language: 'de',
      published_at: originalPost.published_at,
      updated_at: new Date().toISOString()
    })
    .select();

  if (error) {
    console.error(`❌ Error inserting ${germanTitle}:`, error);
    return false;
  }

  console.log(`✅ ${germanTitle}`);
  return true;
}

// Function to be called with translations
export { insertGermanPost, posts };

console.log('Posts ready for translation:');
posts.forEach((post, i) => {
  console.log(`${i}: ${post.title} (${post.slug})`);
});
