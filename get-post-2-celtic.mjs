import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const { data, error } = await supabase
  .from('blog_posts')
  .select('content')
  .eq('slug', '5-ancient-celtic-murder-mystery-themes-thatll-transport-your-guests-to-mystical-times-of-danger')
  .eq('language', 'en')
  .single();

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

// Output just first 500 chars to verify
console.log(data.content.substring(0, 500));
console.log('\n... [content length:', data.content.length, 'chars]');
