import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Read the posts JSON
const postsData = JSON.parse(fs.readFileSync('posts-26-30.json', 'utf8'));

// Translation map with complete Spanish content
// NOTE: These are FULL translations - to be provided by Claude
const translations = {
  'how-to-fix-unsatisfying-mystery-endings-create-reveals-that-actually-satisfy': {
    title: "Cómo Arreglar Finales de Misterio Insatisfactorios: Crea Revelaciones que Realmente Satisfagan",
    meta_description: "Crea conclusiones satisfactorias con revelaciones bien planificadas que atan todas las pistas en tu misterio de asesinato personalizado.",
    excerpt: "Diseña conclusiones de misterio que ofrezcan auténticos momentos 'ajá', donde cada pista se conecte lógicamente y los invitados sientan que su trabajo detectivesco ha sido recompensado con soluciones brillantes.",
    content_file: 'translations/post26-es.txt' // Will contain full translation
  },
  'how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime': {
    title: "Cómo Organizar una Fiesta de Misterio de Asesinato de Cuentos de Hadas: Érase una Vez un Crimen",
    meta_description: "Érase una vez un crimen con fiestas de misterio de asesinato de cuentos de hadas caprichosos con personajes queridos con secretos oscuros.",
    excerpt: "Crea fiestas mágicas de misterio de asesinato de cuentos de hadas donde personajes queridos ocultan secretos oscuros en mundos encantados llenos de intriga.",
    content_file: 'translations/post27-es.txt'
  },
  'how-to-host-a-hollywood-murder-mystery-party': {
    title: "Cómo Organizar una Fiesta de Misterio de Asesinato de Hollywood",
    meta_description: "Crea fiestas glamurosas de misterio de asesinato de Hollywood con personajes famosos personalizados y drama de alfombra roja.",
    excerpt: "Organiza una fiesta de misterio de asesinato de Hollywood glamurosa con celebridades, alfombra roja y drama digno de los titulares.",
    content_file: 'translations/post28-es.txt'
  },
  'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue': {
    title: "Fiesta de Misterio de Asesinato Medieval: Guía Paso a Paso",
    meta_description: "Planifica una fiesta inolvidable de misterio de asesinato medieval con nuestra guía completa. Temas de castillo, ideas de personajes, utilería y guiones para 6-12 invitados.",
    excerpt: "Transporta a tus invitados a un reino medieval lleno de intriga real, secretos de castillo y asesinatos misteriosos con esta guía completa.",
    content_file: 'translations/post29-es.txt'
  },
  'how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement': {
    title: "Cómo Organizar un Misterio de Asesinato de la Era de la Prohibición: Contrabandea tu Camino hacia la Emoción",
    meta_description: "Contrabandea tu camino hacia la emoción con fiestas auténticas de misterio de asesinato de la prohibición con bares clandestinos y contrabandistas.",
    excerpt: "Organiza una fiesta de misterio de asesinato de la era de la prohibición auténtica con bares clandestinos, contrabandistas y la emoción de los años 1920.",
    content_file: 'translations/post30-es.txt'
  }
};

async function processAllTranslations() {
  const report = [];
  
  for (const post of postsData) {
    const slug = post.slug;
    const translation = translations[slug];
    
    if (!translation) {
      console.error(`❌ No translation found for: ${slug}`);
      continue;
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Post ${post.number}: ${post.title}`);
    console.log('='.repeat(80));
    
    // Check if already exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .eq('language', 'es')
      .single();
    
    if (existing) {
      console.log(`⚠️  Already exists in database, skipping...`);
      report.push({
        number: post.number,
        title: translation.title,
        status: 'SKIPPED - Already exists'
      });
      continue;
    }
    
    console.log(`✓ Translation ready: ${translation.title}`);
    console.log(`  To be inserted...`);
    
    report.push({
      number: post.number,
      title: translation.title,
      slug: slug,
      status: 'READY FOR INSERTION'
    });
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('TRANSLATION REPORT');
  console.log('='.repeat(80));
  report.forEach(r => {
    console.log(`✓ Post ${r.number}: ${r.title}`);
    console.log(`  Status: ${r.status}`);
  });
}

processAllTranslations();
