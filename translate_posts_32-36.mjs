import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const slugs = [
  'murder-mystery-party-for-graduation-celebrations-academic-achievement-mysteries-with-educational-excellence',
  'murder-mystery-party-for-holiday-gatherings-festive-fun-meets-family-intrigue',
  'murder-mystery-party-for-office-teams-build-bonds-through-collaborative-investigation',
  'murder-mystery-party-for-small-groups-ideas',
  'murder-mystery-party-for-teenagers-guide'
];

async function fetchPosts() {
  console.log('Fetching English posts...\n');
  
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
    
    console.log(`\n=== POST: ${slug} ===`);
    console.log('Title:', data.title);
    console.log('Meta Description:', data.meta_description);
    console.log('Content length:', data.content.length);
    console.log('---\n');
  }
}

fetchPosts();
