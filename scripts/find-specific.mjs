import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const targetSlugs = [
  'victorian-murder-mystery',
  'film-noir-murder-mystery',
  'ice-hotel-murder-mystery',
  'zombie-apocalypse-murder-mystery',
  'superhero-murder-mystery'
];

console.log('Searching for specific posts...\n');

for (const slug of targetSlugs) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, language, updated_at')
    .eq('slug', slug)
    .eq('language', 'en')
    .single();

  if (error) {
    console.log(`✗ ${slug}: NOT FOUND (${error.message})`);
  } else {
    console.log(`✓ ${slug}:`);
    console.log(`  Title: ${data.title}`);
    console.log(`  Updated: ${data.updated_at}`);
  }
  console.log('');
}
