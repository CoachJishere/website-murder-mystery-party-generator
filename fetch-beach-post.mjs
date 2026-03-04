import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function fetchPost() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable')
    .eq('language', 'en')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Post ID:', data.id);
  console.log('Title:', data.title);
  console.log('\nMeta Description:', data.meta_description);
  console.log('\nContent length:', data.content?.length || 0);
  console.log('\n--- FULL CONTENT ---');
  console.log(data.content);
}

fetchPost();
