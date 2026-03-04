import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Post 44
const { data: post44 } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('slug', 'unique-train-station-murder-mystery-plots-all-aboard-for-danger-and-intrigue')
  .eq('language', 'en')
  .single();

fs.writeFileSync('post_44.json', JSON.stringify(post44, null, 2));
console.log('Post 44 saved, length:', post44.content.length);

// Post 45
const { data: post45 } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('slug', 'unique-underwater-murder-mystery-plots-that-will-make-a-splash-at-your-party')
  .eq('language', 'en')
  .single();

fs.writeFileSync('post_45.json', JSON.stringify(post45, null, 2));
console.log('Post 45 saved, length:', post45.content.length);
