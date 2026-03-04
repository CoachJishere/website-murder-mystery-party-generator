import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function fetchPost() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', '5-spy-thriller-murder-mystery-themes-that-will-have-your-guests-going-undercover')
    .eq('language', 'en')
    .single();
  
  if (error) {
    console.error('Error:', error);
    return null;
  }
  return data;
}

async function main() {
  const post = await fetchPost();
  if (post) {
    fs.writeFileSync('post1.json', JSON.stringify(post, null, 2));
    console.log('✅ Saved post 1');
    console.log(`Title: ${post.title}`);
    console.log(`Content length: ${post.content.length}`);
  }
}

main();
