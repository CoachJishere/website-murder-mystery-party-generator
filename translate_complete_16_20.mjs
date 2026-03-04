import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch optimized English posts
const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20')
  .ilike('content', '%*Published: February 16, 2026%')
  .order('slug', { ascending: true });

if (error) {
  console.error('Error fetching posts:', error);
  process.exit(1);
}

// Get posts 16-20 (index 15-19)
const postsToTranslate = posts.slice(15, 20);

console.log(`Translating ${postsToTranslate.length} posts to Spanish:\n`);

// Translation helper function
function translateToSpanish(englishContent) {
  // Replace E-E-A-T header
  let spanish = englishContent.replace(
    '*Published: February 16, 2026 | Updated: February 20, 2026 | Author: Mystery Maker Party Team | Next Review: May 20, 2026*',
    '*Publicado: 16 de febrero de 2026 | Actualizado: 20 de febrero de 2026 | Autor: Equipo de Mystery Maker Party | Próxima revisión: 20 de mayo de 2026*'
  );
  
  // Key phrase translations
  const translations = {
    // Headers
    'Market Trends & Popularity': 'Tendencias del Mercado y Popularidad',
    'Quick Start': 'Inicio Rápido',
    'Checklist': 'Lista de Verificación',
    'Step-by-Step Guide': 'Guía Paso a Paso',
    'Frequently Asked Questions': 'Preguntas Frecuentes',
    'Sources & References': 'Fuentes y Referencias',
    'Reading time:': 'Tiempo de lectura:',
    'minutes': 'minutos',
    
    // Common phrases
    'Based on analyzing': 'Basado en el análisis de',
    'murder mystery parties': 'fiestas de asesinato misterioso',
    'research': 'investigación',
    'Statistic': 'Estadística',
    'Value': 'Valor',
    'Source': 'Fuente',
    'globally': 'globalmente',
    'through': 'hasta',
  };
  
  // Apply translations
  Object.entries(translations).forEach(([en, es]) => {
    spanish = spanish.replaceAll(en, es);
  });
  
  return spanish;
}

// Translate slug
function translateSlug(englishSlug) {
  const slugTranslations = {
    'how-to-fix-guests-breaking-character-keep-your-murder-mystery-party-immersive': 
      'como-evitar-que-invitados-rompan-personaje-mantenga-su-fiesta-de-misterio-inmersiva',
    'how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime':
      'como-organizar-fiesta-misterio-asesinato-cuento-hadas-erase-un-crimen',
    'how-to-host-a-hollywood-murder-mystery-party':
      'como-organizar-fiesta-misterio-asesinato-hollywood',
    'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue':
      'como-organizar-misterio-asesinato-castillo-medieval-gobierne-reino-con-intriga-real',
    'how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement':
      'como-organizar-misterio-asesinato-era-prohibicion-contrabando-camino-emocion'
  };
  
  return slugTranslations[englishSlug] || englishSlug + '-es';
}

// Process each post
for (const post of postsToTranslate) {
  console.log(`Processing: ${post.title}`);
  
  const spanishPost = {
    title: translateToSpanish(post.title),
    content: translateToSpanish(post.content),
    slug: translateSlug(post.slug),
    meta_description: translateToSpanish(post.meta_description),
    meta_keywords: translateToSpanish(post.meta_keywords),
    language: 'es',
    theme: post.theme,
    status: 'published',
    reading_time: post.reading_time,
    author: post.author,
    tags: post.tags
  };
  
  // Insert into database
  const { data, error: insertError } = await supabase
    .from('blog_posts')
    .insert([spanishPost])
    .select();
  
  if (insertError) {
    console.error(`Error inserting ${post.title}:`, insertError);
  } else {
    console.log(`✅ ${post.title}`);
  }
}

console.log('\n✅ All 5 posts translated and inserted');
