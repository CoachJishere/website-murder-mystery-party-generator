import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function fetchPost() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('content,title,meta_description')
    .eq('slug', '5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue')
    .eq('language', 'en')
    .single();
  
  if (error) {
    console.error('Error:', error);
    return null;
  }
  
  console.log('Title:', data.title);
  console.log('Content start:', data.content.substring(0, 200));
  return data;
}

fetchPost();
