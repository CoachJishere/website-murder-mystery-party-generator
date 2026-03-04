import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch the English post to see all available fields
const { data: englishPost, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('slug', '5-casino-murder-mystery-party-themes-roll-the-dice-on-deadly-high-stakes-drama')
  .eq('language', 'en')
  .single();

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('Available fields in blog_posts:');
console.log(Object.keys(englishPost));
console.log('\nFull post structure:');
console.log(JSON.stringify(englishPost, null, 2));
