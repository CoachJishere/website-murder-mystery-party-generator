import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const { count } = await supabase
  .from('blog_posts')
  .select('*', { count: 'exact', head: true })
  .eq('language', 'it')
  .gte('updated_at', '2026-02-23T00:00:00');

console.log(`Italian: ${count}/47 (${Math.round(count/47*100)}%)`);
console.log(`Remaining: ${47 - count}`);
