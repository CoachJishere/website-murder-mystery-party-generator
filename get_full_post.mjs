import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function main() {
  const slug = process.argv[2] || '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable';
  
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

  const output = {
    slug: data.slug,
    title: data.title,
    meta_description: data.meta_description,
    content: data.content,
    category: data.category,
    featured_image: data.featured_image,
    author: data.author,
    published: data.published
  };

  fs.writeFileSync('/tmp/current_post.json', JSON.stringify(output, null, 2));
  console.log(`Post saved to /tmp/current_post.json`);
  console.log(`Title: ${data.title}`);
  console.log(`Content length: ${data.content.length} chars`);
}

main();
