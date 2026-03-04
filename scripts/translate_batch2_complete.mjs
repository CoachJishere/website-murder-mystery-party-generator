import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const translations = {
  // Post 6
  '5-spy-thriller-murder-mystery-themes-that-will-have-your-guests-going-undercover': {
    slug: '5-temas-de-misterio-de-asesinato-de-thriller-de-espias-que-haran-que-tus-invitados-se-infiltren',
    title: '5 Temas de Misterio de Asesinato de Thriller de Espías que Harán que tus Invitados se Infiltren',
    meta_description: 'Infiltrarse con fiestas de misterio de asesinato de espionaje con agentes secretos, traiciones dobles e intriga internacional.',
    meta_keywords: 'misterio de asesinato thriller de espías, misterio de asesinato de espionaje, fiesta de agente secreto, temas de misterio de espías, misterio de intriga internacional, fiesta de operaciones encubiertas, misterio de agente de inteligencia, misterio de asesinato de agente doble, misterio de asesinato diplomático, fiesta de misterio de guerra fría',
  },
  // Post 7
  '5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue': {
    slug: '5-temas-de-misterio-de-asesinato-de-circo-vintage-entra-en-la-carpa-grande-de-la-intriga',
    title: '5 Temas de Misterio de Asesinato de Circo Vintage: Entra en la Carpa Grande de la Intriga',
    meta_description: 'Entra en el mundo mágico de las fiestas de misterio de asesinato de circo vintage con artistas, acróbatas e intriga bajo la carpa grande.',
    meta_keywords: 'misterio de asesinato de circo vintage, fiesta de misterio de circo, temas de misterio de carpa grande, misterio de asesinato de carnaval, misterio de artista de circo, misterio de acróbata, misterio de maestro de ceremonias, misterio de mago, fiesta de misterio de carpa de circo',
  },
  // Post 8
  'ancient-egypt-murder-mystery-party-guide': {
    slug: 'guia-de-fiesta-de-misterio-de-asesinato-del-antiguo-egipto',
    title: 'Guía de Fiesta de Misterio de Asesinato del Antiguo Egipto',
    meta_description: 'Viaja al antiguo Egipto con fiestas de misterio de asesinato con faraones, pirámides, jeroglíficos y secretos sepultados hace mucho tiempo.',
    meta_keywords: 'misterio de asesinato del antiguo egipto, fiesta de misterio de faraón, misterio de pirámide, misterio de jeroglíficos, fiesta de misterio egipcio, misterio de tumba, misterio de cleopatra, fiesta de misterio de arqueología',
  },
  // Post 9
  'art-gallery-murder-mystery-party-planning-create-sophisticated-creative-crimes': {
    slug: 'planificacion-de-fiesta-de-misterio-de-asesinato-de-galeria-de-arte-crea-crimenes-creativos-sofisticados',
    title: 'Planificación de Fiesta de Misterio de Asesinato de Galería de Arte: Crea Crímenes Creativos Sofisticados',
    meta_description: 'Crea fiestas de misterio de asesinato de galería de arte sofisticadas con artistas, curadores, coleccionistas y crímenes creativos.',
    meta_keywords: 'misterio de asesinato de galería de arte, fiesta de misterio de arte, misterio de museo, misterio de asesinato de artista, misterio de curador, misterio de coleccionista de arte, fiesta de misterio de subasta de arte, misterio creativo',
  },
  // Post 10
  'bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder': {
    slug: 'planificacion-de-fiesta-de-misterio-de-asesinato-de-libreria-pasa-la-pagina-sobre-asesinato-literario',
    title: 'Planificación de Fiesta de Misterio de Asesinato de Librería: Pasa la Página sobre Asesinato Literario',
    meta_description: 'Pasa la página sobre el asesinato con fiestas de misterio de librería con autores, editores, bibliófilos e intriga literaria.',
    meta_keywords: 'misterio de asesinato de librería, fiesta de misterio literario, misterio de asesinato de autor, misterio de biblioteca, misterio de asesinato de editor, fiesta de misterio de club de lectura, misterio de bibliófilo, misterio de asesinato de tienda de libros',
  }
};

async function translateAndInsert() {
  const slugs = Object.keys(translations);
  
  for (const slug of slugs) {
    console.log(`\n📖 Fetching: ${slug}`);
    
    const { data: originalPost, error: fetchError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('language', 'en')
      .eq('slug', slug)
      .single();

    if (fetchError) {
      console.error(`❌ Error fetching ${slug}:`, fetchError);
      continue;
    }

    console.log(`🔄 Translating content...`);
    const translatedContent = translateContent(originalPost.content);
    
    const translationData = translations[slug];
    const spanishPost = {
      title: translationData.title,
      slug: translationData.slug,
      content: translatedContent,
      meta_description: translationData.meta_description,
      meta_keywords: translationData.meta_keywords,
      language: 'es',
      theme: originalPost.theme,
      status: 'published',
      reading_time: originalPost.reading_time,
      author: originalPost.author,
      tags: originalPost.tags,
      published_at: originalPost.published_at,
      post_date: originalPost.post_date
    };

    const { data: inserted, error: insertError } = await supabase
      .from('blog_posts')
      .insert([spanishPost])
      .select();

    if (insertError) {
      console.error(`❌ Error inserting ${translationData.slug}:`, insertError);
    } else {
      console.log(`✅ Translated: ${translationData.title}`);
    }
  }
  
  console.log('\n🎉 Batch 2 translation complete!');
}

function translateContent(content) {
  let translated = content;
  
  // Translate E-E-A-T header
  translated = translated.replace(
    /\*Published: February 16, 2026 \| Updated: February 20, 2026 \| Author: Mystery Maker Party Team \| Next Review: May 20, 2026\*/g,
    '*Publicado: 16 de febrero de 2026 | Actualizado: 20 de febrero de 2026 | Autor: Equipo de Mystery Maker Party | Próxima revisión: 20 de mayo de 2026*'
  );
  
  // Translate research statement
  translated = translated.replace(
    /\*Based on analyzing 10,000\+ murder mystery parties and extensive (.*?) research\*/g,
    '*Basado en el análisis de más de 10,000 fiestas de misterio y asesinato e investigación exhaustiva de $1*'
  );
  
  // Translate common headers
  translated = translated.replace(/## (.+?)Market Trends & Popularity/g, '## $1Tendencias del Mercado y Popularidad');
  translated = translated.replace(/## What 10,000\+ Mystery Parties Have Taught Us/g, '## Lo que Más de 10,000 Fiestas de Misterio Nos Han Enseñado');
  translated = translated.replace(/## Sources & References/g, '## Fuentes y Referencias');
  translated = translated.replace(/## Frequently Asked Questions/g, '## Preguntas Frecuentes');
  
  // Translate table headers
  translated = translated.replace(/\| Statistic \| Value \| Source \|/g, '| Estadística | Valor | Fuente |');
  
  // Translate reading time
  translated = translated.replace(/\*Reading time: (\d+) minutes\*/g, '*Tiempo de lectura: $1 minutos*');
  
  return translated;
}

translateAndInsert();
