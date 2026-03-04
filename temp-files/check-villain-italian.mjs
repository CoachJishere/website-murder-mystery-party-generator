import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const { data, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('slug', 'temi-mistero-omicidio-villain-menti-criminali-assassini-antagonisti')
  .single();

if (error) {
  console.error('Error:', error);
} else {
  console.log('Italian Villain Post Details:');
  console.log(`Title: ${data.title}`);
  console.log(`Slug: ${data.slug}`);
  console.log(`Language: ${data.language}`);
  console.log(`Theme: ${data.theme}`);
  console.log(`Created: ${data.created_at}`);
  console.log(`Published: ${data.published_at}`);
  console.log(`Content length: ${data.content.length} chars`);
  console.log(`\nFirst 200 chars of content:`);
  console.log(data.content.substring(0, 200));
}
