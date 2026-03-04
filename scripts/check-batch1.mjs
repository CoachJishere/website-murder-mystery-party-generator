import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const targetSlugs = [
  'how-to-host-a-victorian-murder-mystery-party',
  'unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime',
  'unique-ice-hotel-murder-mystery-plots-frozen-adventures-with-arctic-suspense-and-cold-blooded-crimes',
  'how-to-host-a-zombie-apocalypse-murder-mystery-that-will-have-your-guests-fighting-for-survival',
  'how-to-host-a-superhero-murder-mystery-party-powers-secret-identities-and-super-villains'
];

console.log('Checking batch 1 posts...\n');

for (const slug of targetSlugs) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, reading_time, updated_at, content')
    .eq('slug', slug)
    .eq('language', 'en')
    .single();

  if (error) {
    console.log(`✗ ${slug}: ERROR - ${error.message}`);
  } else {
    const hasEEAT = data.content.includes('*Published: February 16, 2026');
    console.log(`${hasEEAT ? '✓' : '✗'} ${slug}`);
    console.log(`  Title: ${data.title}`);
    console.log(`  Reading time: ${data.reading_time} min`);
    console.log(`  Has E-E-A-T: ${hasEEAT}`);
  }
  console.log('');
}
