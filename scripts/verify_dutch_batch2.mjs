import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const expectedSlugs = [
  '5-spionagethriller-moordmysterythemas-die-uw-gasten-undercover-laten-gaan',
  '5-vintage-circus-moordmysterythemas-stap-in-de-big-top-van-intrige',
  'oud-egypte-moordmysteryfeest-gids',
  'kunstgalerie-moordmysteryfeest-planning-creeer-verfijnde-creatieve-misdaden',
  'boekwinkel-moordmysteryfeest-planning-sla-de-pagina-om-naar-literaire-moord'
];

const { data, error } = await supabase
  .from('blog_posts')
  .select('slug, title, language, theme')
  .eq('language', 'nl')
  .in('slug', expectedSlugs);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`\n✅ VERIFIED: ${data.length}/5 Dutch posts from Batch 2 found in database:\n`);
data.forEach((post, idx) => {
  console.log(`${idx + 6}. ${post.theme}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Title: ${post.title}\n`);
});

if (data.length === 5) {
  console.log('🎉 SUCCESS: All 5 Dutch posts (Batch 2: Posts 6-10) are in the database!');
} else {
  console.log(`⚠️  WARNING: Only ${data.length}/5 posts found`);
}
