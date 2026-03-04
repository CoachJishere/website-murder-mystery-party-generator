import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const { data } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('slug', 'unique-space-colony-murder-mystery-plots-explore-the-final-frontier-of-crime')
  .eq('language', 'en')
  .single();

fs.writeFileSync('post_43.json', JSON.stringify(data, null, 2));
console.log('Post 43 saved');
console.log('Length:', data.content.length);
