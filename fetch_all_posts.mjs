import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = [
  '5-spy-thriller-murder-mystery-themes-that-will-have-your-guests-going-undercover',
  '5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue',
  'ancient-egypt-murder-mystery-party-guide',
  'art-gallery-murder-mystery-party-planning-create-sophisticated-creative-crimes',
  'bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder'
];

async function fetchPost(slug) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('language', 'en')
    .single();
  
  if (error) {
    console.error(`Error fetching ${slug}:`, error);
    return null;
  }
  return data;
}

async function main() {
  const allPosts = {};
  
  for (const slug of posts) {
    console.log(`Fetching: ${slug}`);
    const post = await fetchPost(slug);
    if (post) {
      allPosts[slug] = post;
    }
  }
  
  fs.writeFileSync('posts_to_translate.json', JSON.stringify(allPosts, null, 2));
  console.log('\n✅ Saved all posts to posts_to_translate.json');
}

main();
