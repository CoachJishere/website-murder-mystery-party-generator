import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function sample() {
  const { data } = await supabase
    .from('blog_posts')
    .select('content')
    .eq('slug', '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable')
    .eq('language', 'en')
    .single();
  
  // Get lines 800-2000 to see more content
  const lines = data.content.split('\n');
  console.log('Lines 15-60 of beach resort post:\n');
  console.log(lines.slice(15, 60).join('\n'));
}

sample();
