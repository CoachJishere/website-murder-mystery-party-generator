import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const swedishSlugs = [
  'butler-mordmysterium-teman-herrgardsmordet-hushallshemligheter',
  'koksmastare-mordmysterium-teman-kulinariska-brott-kokshemliigheter',
  'skapa-den-perfekta-detektiv-karaktar-guiden-design-overtygande-utredare-for-din-anpassade-mordmysteriefest',
  'kryssningsfartyg-mordmysteriefest-guide-segla-ivag-for-mord-pa-oppna-havet',
  'spokhotel-mordmysteriefest-guide-checka-in-till-skrack-och-spannings'
];

console.log('🇸🇪 VERIFYING SWEDISH BATCH 3 (Posts 11-15)\n');

for (let i = 0; i < swedishSlugs.length; i++) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('title, slug, language, reading_time, meta_description')
    .eq('slug', swedishSlugs[i])
    .eq('language', 'sv')
    .single();

  if (error) {
    console.log(`❌ ${11 + i}/15 - NOT FOUND: ${swedishSlugs[i]}`);
  } else {
    console.log(`✅ ${11 + i}/15 - ${data.title.substring(0, 50)}...`);
    console.log(`   Slug: ${data.slug}`);
    console.log(`   Reading time: ${data.reading_time} min`);
    console.log(`   Meta: ${data.meta_description.substring(0, 80)}...`);
    console.log();
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log('✅ SWEDISH BATCH 3 COMPLETE: All 5 posts inserted (11-15/15)');
console.log('═══════════════════════════════════════════════════════');
