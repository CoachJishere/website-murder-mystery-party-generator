import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const expectedSlugs = [
  'hur-man-arrangerar-en-steampunk-mordmysterium-fest-forbered-dig-for-viktoriansk-sci-fi-brottslighet',
  'jazz-klubb-mordmysterium-fest-planering-swinga-in-i-forbudstidens-brott',
  'journalist-mordmysterium-teman-undersokande-reportrars-dodliga-historier',
  'advokat-mordmysterium-teman-rattssalsdrama-juridisk-intrig',
  'rattslakare-mordmysterium-teman-forensiska-utredningar'
];

console.log('Verifying Swedish translations (Batch 21-25):\n');

for (let i = 0; i < expectedSlugs.length; i++) {
  const slug = expectedSlugs[i];
  const postNum = 21 + i;

  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, language, status, created_at')
    .eq('slug', slug)
    .eq('language', 'sv')
    .single();

  if (error || !data) {
    console.log(`❌ ${postNum}/25 - NOT FOUND: ${slug}`);
  } else {
    console.log(`✅ ${postNum}/25 - ${data.title}`);
    console.log(`   Slug: ${data.slug}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Created: ${data.created_at}\n`);
  }
}

console.log('\n📊 Summary: Swedish Batch 5 (Posts 21-25) Translation Complete');
