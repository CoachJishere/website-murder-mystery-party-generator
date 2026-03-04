import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const slugs = [
  '5-ancient-aztec-murder-mystery-themes',
  '5-ancient-celtic-murder-mystery-themes-thatll-transport-your-guests-to-mystical-times-of-danger',
  '5-ancient-egyptian-temple-murder-themes',
  '5-ancient-greece-murder-mystery-themes-that-channel-classical-intrigue',
  '5-ancient-mayan-murder-mystery-themes-thatll-transport-your-guests-to-pyramid-sized-danger'
];

// Fetch all posts
console.log('Fetching posts...');
const posts = [];
for (const slug of slugs) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('language', 'en')
    .single();
  
  if (error) {
    console.error(`Error fetching ${slug}:`, error);
    continue;
  }
  posts.push(data);
}

console.log(`Fetched ${posts.length} posts`);

// Save to file for translation
fs.writeFileSync(
  '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/dutch-batch1-posts.json',
  JSON.stringify(posts, null, 2)
);

console.log('Posts saved to dutch-batch1-posts.json');
console.log('\nPost titles:');
posts.forEach((p, i) => {
  console.log(`${i + 1}. ${p.title}`);
});
