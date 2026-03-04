import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// List of posts to translate (17-47)
const slugs = [
  "how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime",
  "how-to-host-a-hollywood-murder-mystery-party",
  "how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue",
  "how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement"
];

console.log(`Fetching ${slugs.length} posts for Claude to translate...`);

for (const slug of slugs) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, content, meta_description, meta_keywords, theme, tags, reading_time')
    .eq('language', 'en')
    .eq('slug', slug)
    .single();
  
  if (error) {
    console.error(`Error fetching ${slug}:`, error);
    continue;
  }
  
  // Save for Claude to translate
  const filename = `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/to-translate-${slug.substring(0, 30)}.json`;
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`✓ Saved ${slug.substring(0, 50)}...`);
}

console.log('\nPosts ready for translation!');
