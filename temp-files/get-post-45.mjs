import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const { data, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('id', '6c030a19-7884-42fa-aecb-d97ef2b0bdac')
  .single();

if (error) {
  console.error('Error:', error);
} else {
  await fs.writeFile('temp-files/post-45-english.json', JSON.stringify(data, null, 2));
  console.log('Saved post 45 to post-45-english.json');
  console.log(`Title: ${data.title}`);
  console.log(`Content length: ${data.content.length} characters`);
}
