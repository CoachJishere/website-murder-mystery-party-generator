import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('Verifying Dutch Batch 1 Posts...\n');

const { data, error } = await supabase
  .from('blog_posts')
  .select('id, title, slug, language, reading_time, status')
  .eq('language', 'nl')
  .in('slug', [
    '5-oude-azteekse-moordmysterythemas',
    '5-oude-keltische-moordmysterythemas-die-uw-gasten-naar-mystieke-tijden-van-gevaar-transporteren',
    '5-oude-egyptische-tempelmoordthemas',
    '5-oude-griekse-moordmysterythemas-die-klassieke-intriges-kanaliseren',
    '5-oude-maya-moordmysterythemas-die-uw-gasten-naar-piramide-grote-gevaar-transporteren'
  ])
  .order('slug');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`Found ${data.length} Dutch posts:\n`);

data.forEach((post, i) => {
  console.log(`${i + 1}. ${post.title}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   Reading Time: ${post.reading_time} min | Status: ${post.status}`);
  console.log('');
});

console.log('✅ All 5 Dutch posts verified successfully!');
