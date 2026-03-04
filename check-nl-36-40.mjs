import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const slugs = [
  'spa-resort',
  'archaeological',
  'circus',
  'film-noir',
  'medieval'
];

async function checkDutch() {
  console.log('Checking Dutch translations for batch 36-40:\n');
  
  for (const slug of slugs) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title, slug')
      .eq('language', 'nl')
      .like('slug', `%${slug}%`);
    
    if (data && data.length > 0) {
      console.log(`✓ Found: ${data[0].slug}`);
    } else {
      console.log(`✗ Missing: ${slug}`);
    }
  }
}

checkDutch();
