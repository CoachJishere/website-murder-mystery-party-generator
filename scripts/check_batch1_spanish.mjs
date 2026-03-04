import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function checkBatch1() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('title, slug, content')
    .eq('language', 'es')
    .order('slug')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data.length === 0) {
    console.log('No Spanish posts found in database');
    return;
  }

  console.log('Sample Batch 1 Spanish Post:');
  console.log('Title:', data[0].title);
  console.log('Slug:', data[0].slug);
  console.log('\nFirst 2000 characters of content:');
  console.log(data[0].content.substring(0, 2000));
  console.log('\n\nLast 500 characters of content:');
  console.log(data[0].content.substring(data[0].content.length - 500));
}

checkBatch1();
