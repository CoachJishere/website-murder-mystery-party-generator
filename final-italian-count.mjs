import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const { data: itPosts, count } = await supabase
  .from('blog_posts')
  .select('slug, title', { count: 'exact' })
  .eq('language', 'it')
  .gte('updated_at', '2026-02-23T00:00:00')
  .order('updated_at');

console.log(`ITALIAN TRANSLATION PROGRESS`);
console.log(`===========================\n`);
console.log(`Total: ${count}/47`);
console.log(`Remaining: ${47 - count}\n`);
console.log('Completed today:');
itPosts.forEach((p, i) => {
  console.log(`${i+1}. ${p.title.substring(0, 60)}...`);
});
