import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const content = readFileSync('post14-cruise-da.md', 'utf8');

const post = {
  title: 'Krydstogtskibs-mordmysterie-fest guide: Sejl af sted til mord på det åbne hav',
  slug: 'krydstogtskibs-mordmysterie-fest-guide-sejl-af-sted-til-mord-paa-det-aabne-hav',
  content: content,
  meta_description: 'Sejl af sted til mord med luksus-krydstogtskibs-mysteriefester med passagerer, besætning og højsø-drama.',
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

console.log('✅ 14/15 - Cruise Ship post inserted successfully');
console.log('Post ID:', data[0].id);
console.log('Slug:', data[0].slug);
