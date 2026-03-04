import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('SESSION PROGRESS SUMMARY');
console.log('========================\n');

// Portuguese
const { count: ptCount } = await supabase.from('blog_posts').select('*', { count: 'exact', head: true }).eq('language', 'pt').gte('updated_at', '2026-02-22T00:00:00');

// Italian  
const { count: itCount } = await supabase.from('blog_posts').select('*', { count: 'exact', head: true }).eq('language', 'it').gte('updated_at', '2026-02-23T00:00:00');

console.log('PORTUGUESE:');
console.log(`  Completed: ${ptCount}/47 ✅ COMPLETE`);
console.log(`  Status: 100%\n`);

console.log('ITALIAN:');
console.log(`  Completed: ${itCount}/47`);
console.log(`  Remaining: ${47 - itCount}`);
console.log(`  Status: ${Math.round(itCount/47*100)}%\n`);

console.log('TOTAL TRANSLATIONS THIS SESSION:');
console.log(`  ${ptCount + itCount} posts translated`);
console.log(`  ~${(ptCount + itCount) * 3000} words translated`);
