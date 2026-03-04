import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const slugs = [
  'butler-murder-mystery-themes-manor-murders-household-secrets',
  'chef-murder-mystery-themes-culinary-crimes-kitchen-secrets',
  'creating-the-perfect-detective-character-guide-design-compelling-investigators-for-your-custom-murder-mystery-party',
  'cruise-ship-murder-mystery-party-guide-set-sail-for-murder-on-the-high-seas',
  'haunted-hotel-murder-mystery-party-guide-check-in-to-terror-and-suspense'
];

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
  } else {
    posts.push(data);
    console.log(`✓ Fetched ${slug}`);
  }
}

fs.writeFileSync('temp-files/batch3-posts.json', JSON.stringify(posts, null, 2));
console.log(`\nSaved ${posts.length} posts to batch3-posts.json`);
