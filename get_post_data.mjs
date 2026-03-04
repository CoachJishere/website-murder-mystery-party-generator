import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function main() {
  const slug = '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable';
  
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('language', 'en')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(JSON.stringify({
    title: data.title,
    meta_description: data.meta_description,
    content: data.content.substring(0, 1000) + '...',
    category: data.category,
    featured_image: data.featured_image,
    author: data.author
  }, null, 2));
}

main();
