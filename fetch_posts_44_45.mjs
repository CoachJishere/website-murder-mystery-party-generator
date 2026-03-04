import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch post 44 (Rockstar)
const { data: post44, error: error44 } = await supabase
  .from('blog_posts')
  .select('content, title, slug, meta_description, meta_keywords, theme, reading_time')
  .eq('id', '56ff8abb-197d-402e-af19-6bea88207787')
  .single();

if (error44) {
  console.error('Error fetching post 44:', error44);
} else {
  fs.writeFileSync('/tmp/post44.json', JSON.stringify(post44, null, 2));
  console.log('Post 44 saved');
}

// Fetch post 45 (Steampunk)
const { data: post45, error: error45 } = await supabase
  .from('blog_posts')
  .select('content, title, slug, meta_description, meta_keywords, theme, reading_time')
  .eq('id', '9c6bc262-da91-4eb9-aeda-71f5dc3ce0d8')
  .single();

if (error45) {
  console.error('Error fetching post 45:', error45);
} else {
  fs.writeFileSync('/tmp/post45.json', JSON.stringify(post45, null, 2));
  console.log('Post 45 saved');
}

console.log('\nBoth posts fetched successfully');
