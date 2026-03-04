import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function fetchEnglishPost() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', '5-casino-murder-mystery-party-themes-roll-the-dice-on-deadly-high-stakes-drama')
    .eq('language', 'en')
    .single();

  if (error) {
    console.error('Error fetching post:', error);
    return null;
  }

  console.log('Fetched English post:');
  console.log('ID:', data.id);
  console.log('Title:', data.title);
  console.log('Slug:', data.slug);
  console.log('Meta description:', data.meta_description?.substring(0, 100) + '...');
  console.log('Content length:', data.content?.length || 0);
  console.log('\n--- CONTENT PREVIEW ---\n');
  console.log(data.content?.substring(0, 500) + '...');
  
  return data;
}

await fetchEnglishPost();
