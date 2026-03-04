import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const slugsToCheck = [
  'underwater',
  'villain',
  'wild-west'
];

console.log('Checking for Italian versions of posts 45-47:\n');

for (const keyword of slugsToCheck) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, language, theme')
    .eq('language', 'it')
    .ilike('slug', `%${keyword}%`);
  
  if (error) {
    console.error(`Error checking ${keyword}:`, error);
  } else if (data.length > 0) {
    console.log(`✅ Found Italian post with "${keyword}":`);
    data.forEach(p => {
      console.log(`   - ${p.slug}`);
      console.log(`     Theme: ${p.theme}`);
    });
  } else {
    console.log(`❌ No Italian post found with "${keyword}"`);
  }
  console.log('');
}
