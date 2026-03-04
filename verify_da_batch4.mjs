import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const expectedSlugs = [
  'saadan-loeser-du-gaester-der-bryder-karakteren-hold-din-mordmysteriefest-fordybende',
  'saadan-arrangerer-du-en-eventyr-mordmysteriefest-der-var-engang-en-forbrydelse',
  'saadan-arrangerer-du-en-hollywood-mordmysteriefest',
  'saadan-arrangerer-du-et-middelalderborg-mordmysterium-regn-dit-rige-med-kongelig-intriger',
  'saadan-arrangerer-du-et-forbudstids-mordmysterium-smugl-dig-til-spaending'
];

console.log('Verifying Danish Batch 4 (Posts 16-20):\n');

for (let i = 0; i < expectedSlugs.length; i++) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('title, slug, language')
    .eq('slug', expectedSlugs[i])
    .eq('language', 'da')
    .single();

  if (error || !data) {
    console.log(`❌ ${i + 16}/20: NOT FOUND - ${expectedSlugs[i]}`);
  } else {
    console.log(`✅ ${i + 16}/20: ${data.title}`);
  }
}

console.log('\n✅ BATCH 4 VERIFICATION COMPLETE!');
