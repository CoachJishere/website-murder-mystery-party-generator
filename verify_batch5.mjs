import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const expectedSlugs = [
  'hoe-u-een-steampunk-moordmysterie-organiseert-victoriaanse-sci-fi-misdaad',
  'jazz-club-moordmysterie-feestplanning-swing-drooglegging-era-misdaad',
  'journalist-moordmysterie-themas-onderzoeksjournalisten-dodelijke-verhalen',
  'advocaat-moordmysterie-themas-rechtbank-drama-ontmoet-juridische-intriges',
  'lijkschouwer-moordmysterie-themas-forensische-onderzoeken-dodelijke-geheimen'
];

console.log('Verifying Dutch Batch 5 posts (21-25):\n');

for (let i = 0; i < expectedSlugs.length; i++) {
  const slug = expectedSlugs[i];
  const { data, error } = await supabase
    .from('blog_posts')
    .select('title, slug, language, theme, reading_time')
    .eq('slug', slug)
    .eq('language', 'nl')
    .single();
  
  if (error) {
    console.log(`❌ Post ${i + 21}/25: NOT FOUND - ${slug}`);
  } else {
    console.log(`✅ ${i + 21}/25: ${data.theme} - ${data.title.substring(0, 60)}...`);
  }
}

console.log('\n🎉 Batch 5 verification complete!');
