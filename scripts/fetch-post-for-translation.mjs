import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const slug = process.argv[2];

const { data: post } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .eq('slug', slug)
  .single();

writeFileSync('/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/current-post.json', JSON.stringify(post, null, 2));
console.log('Fetched:', post.title);
console.log('Saved to current-post.json');
