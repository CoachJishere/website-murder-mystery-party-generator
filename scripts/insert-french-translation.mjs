import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Read from stdin
const data = JSON.parse(await new Promise((resolve) => {
  let input = '';
  process.stdin.on('data', chunk => input += chunk);
  process.stdin.on('end', () => resolve(input));
}));

const { error } = await supabase
  .from('blog_posts')
  .insert(data);

if (error) {
  console.error('Error inserting:', error);
  process.exit(1);
}

console.log(`✅ Successfully inserted French translation: ${data.slug}`);
