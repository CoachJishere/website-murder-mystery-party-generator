import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get next 5 posts
const slugs = JSON.parse(readFileSync('/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/remaining-slugs.json', 'utf-8'));

const batch = slugs.slice(0, 5);

for (const slug of batch) {
  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .eq('slug', slug)
    .single();
  
  console.log('\n===================');
  console.log('SLUG:', post.slug);
  console.log('TITLE:', post.title);
  console.log('THEME:', post.theme);
  console.log('LENGTH:', post.content.length, 'chars');
  console.log('===================');
}
