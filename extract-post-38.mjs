import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function extractPost() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', '6f4e5fce-4713-4f88-a8ad-b450f6353190')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Post 38: Circus Murder Mystery');
  console.log('Slug:', data.slug);
  console.log('Content length:', data.content.length);
  console.log('Title:', data.title);
}

extractPost();
