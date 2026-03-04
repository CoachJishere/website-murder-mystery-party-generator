import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function fetchPosts() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug')
    .eq('language', 'en')
    .order('slug', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total posts:', data.length);
  console.log('\nPosts 26-30 (indices 25-29):');
  for (let i = 25; i < 30 && i < data.length; i++) {
    console.log(`${i + 1}. [${i}] ${data[i].slug} - ${data[i].title}`);
  }
}

fetchPosts();
