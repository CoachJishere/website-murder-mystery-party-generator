import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch chef post
const { data: enPost } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .eq('slug', 'chef-murder-mystery-themes-culinary-crimes-kitchen-secrets')
  .single();

// Save for reference
import { writeFileSync } from 'fs';
writeFileSync('/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/chef-post.json', JSON.stringify({
  title: enPost.title,
  slug: enPost.slug,
  meta_description: enPost.meta_description,
  reading_time: enPost.reading_time,
  contentLength: enPost.content.length
}, null, 2));

console.log('Chef post ready for translation');
console.log('Title:', enPost.title);
console.log('Content length:', enPost.content.length);
