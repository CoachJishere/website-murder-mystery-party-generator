import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const content = readFileSync('post13-detective-da.md', 'utf8');

const post = {
  title: 'Skabelse af den perfekte detektiv-karakter guide: Design overbevisende efterforskere til din tilpassede mordmysterie-fest',
  slug: 'skabelse-af-den-perfekte-detektiv-karakter-guide-design-overbevisende-efterforskere-til-din-tilpassede-mordmysterie-fest',
  content: content,
  meta_description: 'Design overbevisende detektiv-karakterer med unikke baggrunde, motiver og spor, der fanger gæster ved din tilpassede mordmysterie-fest.',
  language: 'da'
};

const { data, error } = await supabase
  .from('blog_posts')
  .insert([post])
  .select();

if (error) {
  console.error('Error inserting post:', error);
  process.exit(1);
}

console.log('✅ 13/15 - Detective Character Guide post inserted successfully');
console.log('Post ID:', data[0].id);
console.log('Slug:', data[0].slug);
