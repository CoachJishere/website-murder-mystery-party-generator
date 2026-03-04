import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('Verifying Italian translations for posts 20-24...\n');

const slugs = [
  'come-ospitare-mistero-omicidio-era-proibizionismo-strada-emozione',
  'come-ospitare-festa-mistero-omicidio-steampunk-prepararsi-crimine-fantascienza-vittoriana',
  'pianificazione-festa-mistero-omicidio-jazz-club-immergersi-crimine-era-proibizionismo',
  'temi-mistero-omicidio-giornalista-reporter-investigativi-storie-mortali',
  'temi-mistero-omicidio-avvocato-dramma-aula-intrigo-legale'
];

for (let i = 0; i < slugs.length; i++) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, language, theme, reading_time, content')
    .eq('slug', slugs[i])
    .eq('language', 'it')
    .single();
  
  if (error || !data) {
    console.log(`❌ Post ${i + 1}/5: NOT FOUND`);
    console.log(`   Slug: ${slugs[i]}\n`);
  } else {
    console.log(`✅ Post ${i + 1}/5: ${data.title}`);
    console.log(`   Slug: ${data.slug}`);
    console.log(`   Theme: ${data.theme}`);
    console.log(`   Content: ${data.content.length} chars`);
    console.log(`   Reading time: ${data.reading_time} minutes\n`);
  }
}

console.log('='.repeat(80));
console.log('Verification complete!');
