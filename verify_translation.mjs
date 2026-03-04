import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function verify() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, language, title, content')
    .eq('slug', '5-temas-de-misterio-y-asesinato-en-resort-de-playa-que-haran-tu-vacacion-inolvidable')
    .eq('language', 'es')
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Spanish Post Verification:');
  console.log('='.repeat(80));
  console.log(`Slug: ${data.slug}`);
  console.log(`Language: ${data.language}`);
  console.log(`Title: ${data.title}`);
  console.log('\nContent Preview (first 800 chars):');
  console.log(data.content.substring(0, 800));
  console.log('\n...\n');
  console.log('\nChecking key translations:');
  console.log(`- Has Spanish E-E-A-T metadata: ${data.content.includes('Publicado: 16 de febrero de 2026') ? '✓ YES' : '✗ NO'}`);
  console.log(`- Has Spanish research statement: ${data.content.includes('Basado en el análisis de más de 10,000') ? '✓ YES' : '✗ NO'}`);
  console.log(`- Has Spanish title in content: ${data.content.includes('# 5 Temas de Misterio y Asesinato') ? '✓ YES' : '✗ NO'}`);
  console.log(`- Has Spanish section headers: ${data.content.includes('## Por Qué') ? '✓ YES' : '✗ NO'}`);
  console.log(`- Has character labels: ${data.content.includes('**La Configuración:**') ? '✓ YES' : '✗ NO'}`);
  console.log(`- Has victim label: ${data.content.includes('(la víctima)') ? '✓ YES' : '✗ NO'}`);
}

verify();
