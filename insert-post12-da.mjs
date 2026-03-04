import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const content = readFileSync('post12-chef-da.md', 'utf8');

const post = {
  title: 'Kok-mordmysterie-temaer: Kulinariske forbrydelser og køkkenhemmeligheder',
  slug: 'kok-mordmysterie-temaer-kulinariske-forbrydelser-og-koekkenhemmeligheder',
  content: content,
  meta_description: 'Skab mordmysterier med kok-karakterer, der navigerer restaurant-drama, madforgiftning og kulinariske rivaliseringer. Generer tilpassede køkken-baserede efterforskninger.',
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

console.log('✅ 12/15 - Chef post inserted successfully');
console.log('Post ID:', data[0].id);
console.log('Slug:', data[0].slug);
