import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Spanish translation metadata
const spanishMeta = {
  'how-to-fix-unsatisfying-mystery-endings-create-reveals-that-actually-satisfy': {
    title: 'Cómo Arreglar Finales de Misterio Insatisfactorios: Crea Revelaciones que Realmente Satisfagan',
    meta_description: 'Crea conclusiones satisfactorias con revelaciones bien planificadas que atan todas las pistas en tu misterio de asesinato personalizado.',
    excerpt: 'Diseña conclusiones de misterio que ofrezcan auténticos momentos "ajá", donde cada pista se conecte lógicamente y los invitados sientan que su trabajo detectivesco ha sido recompensado con soluciones brillantes.'
  },
  'how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime': {
    title: 'Cómo Organizar una Fiesta de Misterio de Asesinato de Cuentos de Hadas: Érase una Vez un Crimen',
    meta_description: 'Érase una vez un crimen con fiestas de misterio de asesinato de cuentos de hadas caprichosos con personajes queridos con secretos oscuros.',
    excerpt: 'Crea fiestas mágicas de misterio de asesinato de cuentos de hadas donde personajes queridos ocultan secretos oscuros en mundos encantados llenos de intriga.'
  },
  'how-to-host-a-hollywood-murder-mystery-party': {
    title: 'Cómo Organizar una Fiesta de Misterio de Asesinato de Hollywood',
    meta_description: 'Crea fiestas glamurosas de misterio de asesinato de Hollywood con personajes famosos personalizados y drama de alfombra roja.',
    excerpt: 'Organiza una fiesta de misterio de asesinato de Hollywood glamurosa con celebridades, alfombra roja y drama digno de los titulares.'
  },
  'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue': {
    title: 'Fiesta de Misterio de Asesinato Medieval: Guía Paso a Paso',
    meta_description: 'Planifica una fiesta inolvidable de misterio de asesinato medieval con nuestra guía completa. Temas de castillo, ideas de personajes, utilería y guiones para 6-12 invitados.',
    excerpt: 'Transporta a tus invitados a un reino medieval lleno de intriga real, secretos de castillo y asesinatos misteriosos con esta guía completa.'
  },
  'how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement': {
    title: 'Cómo Organizar un Misterio de Asesinato de la Era de la Prohibición: Contrabandea tu Camino hacia la Emoción',
    meta_description: 'Contrabandea tu camino hacia la emoción con fiestas auténticas de misterio de asesinato de la prohibición con bares clandestinos y contrabandistas.',
    excerpt: 'Organiza una fiesta de misterio de asesinato de la era de la prohibición auténtica con bares clandestinos, contrabandistas y la emoción de los años 1920.'
  }
};

const eeatFooter = '\n\n*Publicado: 16 de febrero de 2026 | Actualizado: 20 de febrero de 2026 | Autor: Equipo de Mystery Maker Party | Próxima revisión: 20 de mayo de 2026*';

async function translateAndInsert() {
  const englishPosts = JSON.parse(fs.readFileSync('posts-26-30.json', 'utf8'));
  const report = [];
  
  console.log('='.repeat(80));
  console.log('INSERTING SPANISH TRANSLATIONS - POSTS 26-30');
  console.log('='.repeat(80));
  console.log('');
  
  for (let i = 0; i < englishPosts.length; i++) {
    const englishPost = englishPosts[i];
    const postNum = 26 + i;
    const slug = englishPost.slug;
    const meta = spanishMeta[slug];
    
    if (!meta) {
      console.error(`No metadata for: ${slug}`);
      continue;
    }
    
    console.log(`\nPost ${postNum}: ${meta.title}`);
    console.log('-'.repeat(80));
    
    // Check if exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .eq('language', 'es')
      .single();
    
    if (existing) {
      console.log('⚠️  Already exists, skipping...');
      report.push({ num: postNum, title: meta.title, status: '⏭️  SKIPPED (exists)' });
      continue;
    }
    
    // For now, create a placeholder that indicates translation is needed
    console.log('📝 Preparing Spanish post...');
    console.log(`   English content: ${englishPost.content.length} chars`);
    console.log(`   NOTE: Full translation required`);
    
    // We'll need to provide the full Spanish content
    // For now, mark as ready for manual translation insertion
    report.push({ num: postNum, title: meta.title, status: '⏳ READY (needs full translation)' });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('PROCESSING REPORT');
  console.log('='.repeat(80));
  report.forEach(r => {
    console.log(`${r.status} - Post ${r.num}: ${r.title}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('NEXT STEP: Add complete Spanish content translations to this script');
  console.log('='.repeat(80));
}

translateAndInsert();
