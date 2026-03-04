import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const slugsToDelete = [
  '5-temas-de-misterio-de-asesinato-de-thriller-de-espias-que-haran-que-tus-invitados-se-infiltren',
  '5-temas-de-misterio-de-asesinato-de-circo-vintage-entra-en-la-carpa-grande-de-la-intriga',
  'guia-de-fiesta-de-misterio-de-asesinato-del-antiguo-egipto',
  'planificacion-de-fiesta-de-misterio-de-asesinato-de-galeria-de-arte-crea-crimenes-creativos-sofisticados',
  'planificacion-de-fiesta-de-misterio-de-asesinato-de-libreria-pasa-la-pagina-sobre-asesinato-literario'
];

async function deleteIncomplete() {
  for (const slug of slugsToDelete) {
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('slug', slug)
      .eq('language', 'es');

    if (error) {
      console.error(`Error deleting ${slug}:`, error);
    } else {
      console.log(`✅ Deleted: ${slug}`);
    }
  }
  console.log('\n✨ Cleanup complete');
}

deleteIncomplete();
