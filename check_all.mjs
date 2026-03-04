import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const slugs = [
  '5-temas-de-misterio-y-asesinato-en-resort-de-playa-que-haran-tu-vacacion-inolvidable',
  '5-temas-de-fiesta-de-misterio-y-asesinato-en-casino-apuesta-por-drama-mortal-de-alto-riesgo',
  '5-temas-de-misterio-y-asesinato-en-mansion-encantada',
  '5-temas-de-misterio-y-asesinato-en-cabana-de-montana-que-haran-tu-retiro-inolvidable',
  '5-temas-de-fiesta-de-misterio-y-asesinato-del-renacimiento'
];

async function check() {
  const { data } = await supabase
    .from('blog_posts')
    .select('slug, title, language')
    .in('slug', slugs)
    .eq('language', 'es');
  
  console.log('All 5 Spanish Posts in Database:\n');
  data.forEach((post, i) => {
    console.log(`${i+1}. ${post.title}`);
    console.log(`   Slug: ${post.slug}`);
    console.log(`   Language: ${post.language}\n`);
  });
  
  console.log(`✓ Total: ${data.length}/5 posts successfully in database`);
}

check();
