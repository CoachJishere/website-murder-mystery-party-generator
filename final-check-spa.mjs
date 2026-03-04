import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function checkSpa() {
  console.log('Checking for Spa Resort Dutch translation:\n');
  
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, created_at')
    .eq('language', 'nl')
    .or('slug.ilike.%spa%,slug.ilike.%wellness%,title.ilike.%spa%');
  
  if (data && data.length > 0) {
    console.log(`Found ${data.length} spa-related post(s):`);
    data.forEach(post => {
      console.log(`\n- ${post.title}`);
      console.log(`  Slug: ${post.slug}`);
      console.log(`  Created: ${post.created_at.split('T')[0]}`);
    });
  } else {
    console.log('❌ No spa resort Dutch post found');
  }
  
  // Also check what post 36 actually is in English
  console.log('\n\n=== English Post 36 (Spa Resort) ===');
  const { data: enData } = await supabase
    .from('blog_posts')
    .select('title, slug')
    .eq('id', 'b512ac15-867c-4f68-8a24-5ca4ee46760f')
    .single();
  
  if (enData) {
    console.log(`Title: ${enData.title}`);
    console.log(`Slug: ${enData.slug}`);
  }
}

checkSpa();
