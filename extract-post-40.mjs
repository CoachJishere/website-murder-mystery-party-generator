import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function extractPost() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', '9a37fa33-5397-4c58-a85a-d81ebaa676a8')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Post 40: Medieval Murder Mystery');
  console.log('Slug:', data.slug);
  console.log('Title:', data.title);
  console.log('Content length:', data.content.length);
  
  fs.writeFileSync('post-40-en.json', JSON.stringify(data, null, 2));
  console.log('Saved to post-40-en.json');
}

extractPost();
