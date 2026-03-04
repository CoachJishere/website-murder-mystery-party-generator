import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const slugsToDelete = [
  '5-temas-misterio-assassinato-resort-praia',
  '5-temas-festa-misterio-assassinato-cassino',
  '5-temas-misterio-assassinato-mansao-assombrada',
  '5-temas-misterio-assassinato-chalé-montanha',
  '5-temas-festa-misterio-assassinato-renascimento'
];

console.log('Deleting partial Portuguese translations...\n');

for (const slug of slugsToDelete) {
  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('slug', slug)
    .eq('language', 'pt');

  if (error) {
    console.log(`✗ Error deleting ${slug}: ${error.message}`);
  } else {
    console.log(`✓ Deleted: ${slug}`);
  }
}

console.log('\nDeletion complete.');
