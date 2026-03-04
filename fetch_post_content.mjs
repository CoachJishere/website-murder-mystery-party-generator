import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = [
  { slug: 'murder-mystery-party-for-graduation-celebrations-academic-achievement-mysteries-with-educational-excellence', num: 32 },
  { slug: 'murder-mystery-party-for-holiday-gatherings-festive-fun-meets-family-intrigue', num: 33 },
  { slug: 'murder-mystery-party-for-office-teams-build-bonds-through-collaborative-investigation', num: 34 },
  { slug: 'murder-mystery-party-for-small-groups-ideas', num: 35 },
  { slug: 'murder-mystery-party-for-teenagers-guide', num: 36 }
];

async function fetchAndSave() {
  for (const post of posts) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', post.slug)
      .eq('language', 'en')
      .single();
    
    if (error) {
      console.error(`Error fetching ${post.slug}:`, error);
      continue;
    }
    
    fs.writeFileSync(
      `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/post-${post.num}-en.json`,
      JSON.stringify(data, null, 2)
    );
    
    console.log(`Saved post ${post.num}: ${post.slug}`);
  }
}

fetchAndSave();
