import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const keywords = [
  'victorian',
  'film-noir',
  'ice-hotel',
  'zombie',
  'superhero'
];

for (const keyword of keywords) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title')
    .eq('language', 'en')
    .like('slug', `%${keyword}%`);

  if (error) {
    console.log(`Error searching ${keyword}:`, error);
  } else if (data.length > 0) {
    console.log(`\n"${keyword}" matches:`);
    data.forEach(p => console.log(`  - ${p.slug}`));
  } else {
    console.log(`\n"${keyword}": No matches`);
  }
}
