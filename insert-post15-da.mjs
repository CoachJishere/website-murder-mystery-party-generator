import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const content = readFileSync('post15-hotel-da.md', 'utf8');

const post = {
  title: 'Hjemsøgt hotel-mordmysterie-fest guide: Check ind til terror og spænding',
  slug: 'hjemsoegt-hotel-mordmysterie-fest-guide-check-ind-til-terror-og-spaending',
  content: content,
  meta_description: 'Check ind til terror med hjemsøgte hotel-mordmysteriefester med spøgelses-gæster og spektrale personale.',
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

console.log('✅ 15/15 - Haunted Hotel post inserted successfully');
console.log('Post ID:', data[0].id);
console.log('Slug:', data[0].slug);
console.log('\n🎉 ALL 5 DANISH POSTS (BATCH 3) COMPLETED!');
