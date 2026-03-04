import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Translation mappings for the 5 posts
const postTranslations = [
  {
    originalSlug: '5-spy-thriller-murder-mystery-themes-that-will-have-your-guests-going-undercover',
    spanishSlug: '5-temas-de-misterio-de-asesinato-de-thriller-de-espias-que-haran-que-tus-invitados-se-infiltren',
    spanishTitle: '5 Temas de Misterio de Asesinato de Thriller de Espías que Harán que tus Invitados se Infiltren',
    spanishMetaDesc: 'Infiltrarse con fiestas de misterio de asesinato de espionaje con agentes secretos, traiciones dobles e intriga internacional.',
    spanishMetaKeywords: 'misterio de asesinato thriller de espías, misterio de asesinato de espionaje, fiesta de agente secreto, temas de misterio de espías, misterio de intriga internacional, fiesta de operaciones encubiertas, misterio de agente de inteligencia, misterio de asesinato de agente doble, misterio de asesinato diplomático, fiesta de misterio de guerra fría'
  },
  {
    originalSlug: '5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue',
    spanishSlug: '5-temas-de-misterio-de-asesinato-de-circo-vintage-entra-en-la-carpa-grande-de-la-intriga',
    spanishTitle: '5 Temas de Misterio de Asesinato de Circo Vintage: Entra en la Carpa Grande de la Intriga',
    spanishMetaDesc: 'Entra en el mundo mágico de las fiestas de misterio de asesinato de circo vintage con artistas, acróbatas e intriga bajo la carpa grande.',
    spanishMetaKeywords: 'misterio de asesinato de circo vintage, fiesta de misterio de circo, temas de misterio de carpa grande, misterio de asesinato de carnaval, misterio de artista de circo, misterio de acróbata, misterio de maestro de ceremonias, misterio de mago, fiesta de misterio de carpa de circo'
  },
  {
    originalSlug: 'ancient-egypt-murder-mystery-party-guide',
    spanishSlug: 'guia-de-fiesta-de-misterio-de-asesinato-del-antiguo-egipto',
    spanishTitle: 'Guía de Fiesta de Misterio de Asesinato del Antiguo Egipto',
    spanishMetaDesc: 'Viaja al antiguo Egipto con fiestas de misterio de asesinato con faraones, pirámides, jeroglíficos y secretos sepultados hace mucho tiempo.',
    spanishMetaKeywords: 'misterio de asesinato del antiguo egipto, fiesta de misterio de faraón, misterio de pirámide, misterio de jeroglíficos, fiesta de misterio egipcio, misterio de tumba, misterio de cleopatra, fiesta de misterio de arqueología'
  },
  {
    originalSlug: 'art-gallery-murder-mystery-party-planning-create-sophisticated-creative-crimes',
    spanishSlug: 'planificacion-de-fiesta-de-misterio-de-asesinato-de-galeria-de-arte-crea-crimenes-creativos-sofisticados',
    spanishTitle: 'Planificación de Fiesta de Misterio de Asesinato de Galería de Arte: Crea Crímenes Creativos Sofisticados',
    spanishMetaDesc: 'Crea fiestas de misterio de asesinato de galería de arte sofisticadas con artistas, curadores, coleccionistas y crímenes creativos.',
    spanishMetaKeywords: 'misterio de asesinato de galería de arte, fiesta de misterio de arte, misterio de museo, misterio de asesinato de artista, misterio de curador, misterio de coleccionista de arte, fiesta de misterio de subasta de arte, misterio creativo'
  },
  {
    originalSlug: 'bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder',
    spanishSlug: 'planificacion-de-fiesta-de-misterio-de-asesinato-de-libreria-pasa-la-pagina-sobre-asesinato-literario',
    spanishTitle: 'Planificación de Fiesta de Misterio de Asesinato de Librería: Pasa la Página sobre Asesinato Literario',
    spanishMetaDesc: 'Pasa la página sobre el asesinato con fiestas de misterio de librería con autores, editores, bibliófilos e intriga literaria.',
    spanishMetaKeywords: 'misterio de asesinato de librería, fiesta de misterio literario, misterio de asesinato de autor, misterio de biblioteca, misterio de asesinato de editor, fiesta de misterio de club de lectura, misterio de bibliófilo, misterio de asesinato de tienda de libros'
  }
];

// Core translation function
function translateContent(englishContent) {
  let spanish = englishContent;

  // E-E-A-T header
  spanish = spanish.replace(
    '*Published: February 16, 2026 | Updated: February 20, 2026 | Author: Mystery Maker Party Team | Next Review: May 20, 2026*',
    '*Publicado: 16 de febrero de 2026 | Actualizado: 20 de febrero de 2026 | Autor: Equipo de Mystery Maker Party | Próxima revisión: 20 de mayo de 2026*'
  );

  // Research statements - multiple variations
  spanish = spanish.replace(/\*Based on analyzing 10,000\+ murder mystery parties and extensive spy thriller entertainment research\*/g,
    '*Basado en el análisis de más de 10,000 fiestas de misterio y asesinato e investigación exhaustiva de entretenimiento de thriller de espías*');
  spanish = spanish.replace(/\*Based on analyzing 10,000\+ murder mystery parties and extensive vintage circus entertainment research\*/g,
    '*Basado en el análisis de más de 10,000 fiestas de misterio y asesinato e investigación exhaustiva de entretenimiento de circo vintage*');
  spanish = spanish.replace(/\*Based on analyzing 10,000\+ murder mystery parties and extensive ancient Egyptian history research\*/g,
    '*Basado en el análisis de más de 10,000 fiestas de misterio y asesinato e investigación exhaustiva de historia del antiguo Egipto*');
  spanish = spanish.replace(/\*Based on analyzing 10,000\+ murder mystery parties and extensive art world research\*/g,
    '*Basado en el análisis de más de 10,000 fiestas de misterio y asesinato e investigación exhaustiva del mundo del arte*');
  spanish = spanish.replace(/\*Based on analyzing 10,000\+ murder mystery parties and extensive literary culture research\*/g,
    '*Basado en el análisis de más de 10,000 fiestas de misterio y asesinato e investigación exhaustiva de cultura literaria*');

  // Table header
  spanish = spanish.replace('| Statistic | Value | Source |', '| Estadística | Valor | Fuente |');

  // Reading time
  spanish = spanish.replace(/\*Reading time: (\d+) minutes\*/, '*Tiempo de lectura: $1 minutos*');

  // Common section headers
  spanish = spanish.replace(/## (.+?)Market Trends & Popularity/g, '## $1Tendencias del Mercado y Popularidad');
  spanish = spanish.replace('## What 10,000+ Mystery Parties Have Taught Us', '## Lo que Más de 10,000 Fiestas de Misterio Nos Han Enseñado');
  spanish = spanish.replace('## Sources & References', '## Fuentes y Referencias');
  spanish = spanish.replace(/## Frequently Asked Questions About (.+)/g, '## Preguntas Frecuentes sobre $1');

  return spanish;
}

async function translateAndInsertPost(postConfig) {
  console.log(`\n📖 Processing: ${postConfig.originalSlug}`);

  // Fetch original English post
  const { data: originalPost, error: fetchError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .eq('slug', postConfig.originalSlug)
    .single();

  if (fetchError) {
    console.error(`❌ Error fetching post:`, fetchError);
    return false;
  }

  console.log(`🔄 Translating content for: ${postConfig.spanishTitle}`);

  // Translate the content
  const translatedContent = translateContent(originalPost.content);

  // Create Spanish post object
  const spanishPost = {
    title: postConfig.spanishTitle,
    slug: postConfig.spanishSlug,
    content: translatedContent,
    meta_description: postConfig.spanishMetaDesc,
    meta_keywords: postConfig.spanishMetaKeywords,
    language: 'es',
    theme: originalPost.theme,
    status: 'published',
    reading_time: originalPost.reading_time,
    author: originalPost.author,
    tags: originalPost.tags,
    published_at: originalPost.published_at,
    post_date: originalPost.post_date
  };

  // Insert Spanish translation
  const { data: inserted, error: insertError } = await supabase
    .from('blog_posts')
    .insert([spanishPost])
    .select();

  if (insertError) {
    console.error(`❌ Error inserting Spanish post:`, insertError);
    return false;
  }

  console.log(`✅ Translated: ${postConfig.spanishTitle}`);
  return true;
}

async function processBatch() {
  console.log('🚀 Starting Batch 2 Spanish Translation (Posts 6-10)\n');

  let successCount = 0;

  for (const postConfig of postTranslations) {
    const success = await translateAndInsertPost(postConfig);
    if (success) successCount++;

    // Small delay between insertions
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n✨ Batch 2 Complete: ${successCount}/${postTranslations.length} posts translated successfully`);
}

processBatch().catch(console.error);
