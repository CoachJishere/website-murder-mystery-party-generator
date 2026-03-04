import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function checkPattern() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, language, title')
    .eq('language', 'zh-cn')
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Chinese slug patterns:');
  data.forEach(post => {
    console.log(`${post.slug} (${post.language})`);
  });
}

checkPattern();
