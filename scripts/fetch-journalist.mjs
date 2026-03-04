import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const { data: post } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .eq('slug', 'journalist-murder-mystery-themes-investigative-reporters-deadly-stories')
  .single();

console.log('Title:', post.title);
console.log('Length:', post.content.length);

// Save first 1000 chars to review structure
console.log('\nFirst 1000 chars:');
console.log(post.content.substring(0, 1000));
