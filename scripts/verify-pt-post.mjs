import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const { data, error } = await supabase
  .from('blog_posts')
  .select('slug, title, content')
  .eq('slug', '5-temas-misterio-assassinato-resort-praia')
  .eq('language', 'pt')
  .single();

if (error) {
  console.error('Error:', error);
} else {
  console.log('Slug:', data.slug);
  console.log('Title:', data.title);
  console.log('\nFirst 500 chars of content:');
  console.log(data.content.substring(0, 500));
  console.log('\n...');
  console.log('\nContent language check:');
  const isEnglish = data.content.includes('Why ') || data.content.includes('The ') || data.content.includes('What ');
  const isPortuguese = data.content.includes('Por que') || data.content.includes('Como') || data.content.includes('O que');
  console.log('Contains English markers:', isEnglish);
  console.log('Contains Portuguese markers:', isPortuguese);
}
