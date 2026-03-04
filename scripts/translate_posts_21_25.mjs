import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch all English posts, sorted alphabetically by title
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .order('title', { ascending: true });

if (error) {
  console.error('Error fetching posts:', error);
  process.exit(1);
}

// Get posts 21-25 (indices 20-24)
const postsToTranslate = posts.slice(20, 25);

console.log('Posts 21-25 to translate:');
postsToTranslate.forEach((post, idx) => {
  console.log(`${idx + 21}. ${post.title} (slug: ${post.slug})`);
});

// Save to file for translation
import { writeFileSync } from 'fs';
writeFileSync('/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/posts_to_translate_21_25.json', JSON.stringify(postsToTranslate, null, 2));

console.log('\nSaved to temp-files/posts_to_translate_21_25.json');
