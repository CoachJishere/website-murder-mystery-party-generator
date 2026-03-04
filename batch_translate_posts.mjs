import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const remaining = [
  '5-casino-murder-mystery-party-themes-roll-the-dice-on-deadly-high-stakes-drama',
  '5-haunted-carnival-murder-mystery-themes-creepy-circus-adventures-for-unforgettable-parties',
  '5-haunted-mansion-murder-mystery-themes',
  '5-mountain-lodge-murder-mystery-themes-that-will-make-your-retreat-unforgettable',
  '5-renaissance-murder-mystery-party-themes'
];

async function getEnglishPost(slug) {
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
  console.log('Fetching next 5 posts...\n');
  
  for (let i = 0; i < remaining.length; i++) {
    const post = await getEnglishPost(remaining[i]);
    if (post) {
      console.log(`${i + 1}. ${post.title}`);
      console.log(`   Slug: ${post.slug}`);
      console.log(`   Content length: ${post.content.length} chars\n`);
    }
  }
}

main();
