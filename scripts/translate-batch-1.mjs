import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch first English post to translate
const { data: enPost, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .eq('slug', 'bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder')
  .single();

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('English Post:');
console.log('Title:', enPost.title);
console.log('Slug:', enPost.slug);
console.log('Reading Time:', enPost.reading_time);
console.log('Meta Description:', enPost.meta_description);
console.log('\nContent length:', enPost.content.length, 'characters');
console.log('\nFirst 500 characters of content:');
console.log(enPost.content.substring(0, 500));
