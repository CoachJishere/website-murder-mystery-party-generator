import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const spanishSlugs = [
  '5-temas-de-misterio-de-asesinato-de-thriller-de-espias-que-haran-que-tus-invitados-vayan-de-incognito',
  '5-temas-de-misterio-de-asesinato-de-circo-vintage-entra-en-la-carpa-principal-de-la-intriga',
  'guia-de-fiesta-de-misterio-de-asesinato-del-antiguo-egipto',
  'planificacion-de-fiesta-de-misterio-de-asesinato-en-galeria-de-arte-crear-crimenes-creativos-sofisticados',
  'planificacion-de-fiesta-de-misterio-de-asesinato-en-libreria-pasa-la-pagina-sobre-el-asesinato-literario'
];

async function verifyPosts() {
  console.log('Verifying Spanish translations in database:\n');
  
  for (const slug of spanishSlugs) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('title, language, content')
      .eq('slug', slug)
      .eq('language', 'es')
      .single();
    
    if (data) {
      console.log(`✅ ${data.title}`);
      console.log(`   Language: ${data.language}`);
      console.log(`   Content length: ${data.content.length} chars`);
      console.log(`   First 100 chars: ${data.content.substring(0, 100)}...\n`);
    } else {
      console.log(`❌ NOT FOUND: ${slug}\n`);
    }
  }
  
  console.log('\n=== SUMMARY ===');
  const { count } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact', head: true })
    .eq('language', 'es')
    .in('slug', spanishSlugs);
  
  console.log(`Total Spanish posts inserted: ${count}/5`);
}

verifyPosts();
