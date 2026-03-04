import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const slugs = [
  'temas-misterio-assassinato-mordomo-crimes-mansao-segredos-domesticos',
  'temas-misterio-assassinato-chef-crimes-culinarios-segredos-cozinha',
  'guia-criar-personagem-detetive-perfeito-projetar-investigadores-convincentes-festa-misterio-assassinato-personalizada',
  'guia-festa-misterio-assassinato-navio-cruzeiro-navegue-para-assassinato-alto-mar',
  'guia-festa-misterio-assassinato-hotel-assombrado-check-in-terror-suspense'
];

console.log('Verifying Portuguese Batch 3 translations...\n');

for (let i = 0; i < slugs.length; i++) {
  const slug = slugs[i];

  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, language, status, reading_time, theme')
    .eq('slug', slug)
    .eq('language', 'pt')
    .single();

  if (error) {
    console.log(`✗ ${i + 11}. NOT FOUND: ${slug}`);
  } else {
    console.log(`✅ ${i + 11}. ${data.title}`);
    console.log(`   Slug: ${data.slug}`);
    console.log(`   Theme: ${data.theme} | Reading: ${data.reading_time}min | Status: ${data.status}`);
    console.log('');
  }
}

console.log('Verification complete!');
