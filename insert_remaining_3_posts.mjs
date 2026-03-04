import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// I'll need to fetch the English versions and create proper Spanish translations
// For now, let me confirm the structure needed

async function fetchEnglishPosts() {
  const slugs = [
    'ancient-egypt-murder-mystery-party-guide',
    'art-gallery-murder-mystery-party-planning-create-sophisticated-creative-crimes',
    'bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder'
  ];
  
  for (const slug of slugs) {
    const { data } = await supabase
      .from('blog_posts')
      .select('title,content')
      .eq('slug', slug)
      .eq('language', 'en')
      .single();
    
    if (data) {
      console.log(`\n=== ${slug} ===`);
      console.log(`Title: ${data.title}`);
      console.log(`Content length: ${data.content.length} chars`);
      console.log(`First 300 chars: ${data.content.substring(0, 300)}...`);
    }
  }
}

fetchEnglishPosts();
