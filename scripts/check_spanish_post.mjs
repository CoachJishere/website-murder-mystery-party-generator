import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function checkPost() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('title, slug, language, content')
    .eq('language', 'es')
    .eq('slug', 'guia-de-fiesta-de-misterio-de-asesinato-del-antiguo-egipto')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Title:', data.title);
  console.log('Slug:', data.slug);
  console.log('Language:', data.language);
  console.log('\nFirst 1000 chars of content:');
  console.log(data.content.substring(0, 1000));
}

checkPost();
