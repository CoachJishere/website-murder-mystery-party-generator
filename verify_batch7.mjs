import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const slugs = [
  'moordmysteriespel-voor-feestdagensamenkomsten-feestelijk-plezier-ontmoet-gezinsintriges',
  'moordmysteriespel-voor-kantoorteams-bouw-banden-door-samenwerkend-onderzoek',
  'moordmysteriespel-voor-kleine-groepen-ideeen',
  'moordmysteriespel-voor-tieners-handleiding',
  'societyfiguur-moordmysteriethemas-high-society-schandalen-en-elite-intriges'
];

console.log('Verifying Batch 7 Dutch translations (posts 31-35):\n');

for (let i = 0; i < slugs.length; i++) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, language, reading_time')
    .eq('slug', slugs[i])
    .eq('language', 'nl')
    .single();
  
  if (error) {
    console.log(`❌ ${31 + i}/35 - NOT FOUND: ${slugs[i]}`);
  } else {
    console.log(`✅ ${31 + i}/35 - ${data.title}`);
    console.log(`   Slug: ${data.slug}`);
    console.log(`   Reading time: ${data.reading_time} minuten\n`);
  }
}

console.log('Batch 7 verification complete!');
