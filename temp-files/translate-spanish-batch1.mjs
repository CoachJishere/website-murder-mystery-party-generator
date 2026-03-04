import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('🇪🇸 Translating first 10 posts to Spanish...\n');

// Helper function to translate content sections
function translateContent(content) {
  // Translate E-E-A-T header
  content = content.replace(
    '*Published: February 16, 2026 | Updated: February 20, 2026 | Author: Mystery Maker Party Team | Next Review: May 20, 2026*',
    '*Publicado: 16 de febrero de 2026 | Actualizado: 20 de febrero de 2026 | Autor: Equipo de Mystery Maker Party | Próxima revisión: 20 de mayo de 2026*'
  );

  content = content.replace(
    /\*Based on analyzing 10,000\+ murder mystery parties and (.*?) research\*/g,
    '*Basado en el análisis de más de 10,000 fiestas de misterio y asesinato e investigación de $1*'
  );

  // Translate section headers
  content = content.replace(/## (.*?) Murder Mysteries: Market Trends & Popularity/g, '## Misterios de Asesinato de $1: Tendencias del Mercado y Popularidad');
  content = content.replace(/Market Trends & Popularity/g, 'Tendencias del Mercado y Popularidad');
  content = content.replace(/## What 10,000\+ Mystery Parties Have Taught Us/g, '## Lo que Más de 10,000 Fiestas de Misterio Nos Han Enseñado');
  content = content.replace(/## Sources & References/g, '## Fuentes y Referencias');
  content = content.replace(/## Frequently Asked Questions/g, '## Preguntas Frecuentes');
  content = content.replace(/## FAQ/g, '## Preguntas Frecuentes');

  // Translate table headers
  content = content.replace(/\| Statistic \| Value \| Source \|/g, '| Estadística | Valor | Fuente |');

  // Translate common phrases
  content = content.replace(/Reading time: (\d+) minutes/g, 'Tiempo de lectura: $1 minutos');
  content = content.replace(/Successful (.*?) mystery parties share these characteristics:/g, 'Las fiestas de misterio de $1 exitosas comparten estas características:');

  // Translate bullet points
  content = content.replace(/✓ \*\*Perfect Thematic Integration\*\*/g, '✓ **Integración Temática Perfecta**');
  content = content.replace(/✓ \*\*Character Authenticity\*\*/g, '✓ **Autenticidad de Personajes**');
  content = content.replace(/✓ \*\*Investigation Clarity\*\*/g, '✓ **Claridad de Investigación**');
  content = content.replace(/✓ \*\*Atmospheric Balance\*\*/g, '✓ **Equilibrio Atmosférico**');
  content = content.replace(/✓ \*\*Customized Engagement\*\*/g, '✓ **Compromiso Personalizado**');

  return content;
}

// Batch 1: First 10 posts (alphabetically by slug)
const batch1Slugs = [
  '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable',
  '5-casino-murder-mystery-party-themes-roll-the-dice-on-deadly-high-stakes-drama',
  '5-haunted-mansion-murder-mystery-themes',
  '5-mountain-lodge-murder-mystery-themes-that-will-make-your-retreat-unforgettable',
  '5-renaissance-murder-mystery-party-themes',
  '5-spy-thriller-murder-mystery-themes-that-will-have-your-guests-going-undercover',
  '5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue',
  'ancient-egypt-murder-mystery-party-guide',
  'art-gallery-murder-mystery-party-planning-create-sophisticated-creative-crimes',
  'bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder'
];

const titleTranslations = {
  '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable': '5 Temas de Misterio de Asesinato en Resort de Playa Que Harán Tus Vacaciones Inolvidables',
  '5-casino-murder-mystery-party-themes-roll-the-dice-on-deadly-high-stakes-drama': '5 Temas de Fiesta de Misterio de Asesinato en Casino: Tira los Dados en Drama Mortal de Altas Apuestas',
  '5-haunted-mansion-murder-mystery-themes': '5 Temas de Misterio de Asesinato en Mansión Embrujada',
  '5-mountain-lodge-murder-mystery-themes-that-will-make-your-retreat-unforgettable': '5 Temas de Misterio de Asesinato en Cabaña de Montaña Que Harán Tu Retiro Inolvidable',
  '5-renaissance-murder-mystery-party-themes': '5 Temas de Fiesta de Misterio de Asesinato del Renacimiento',
  '5-spy-thriller-murder-mystery-themes-that-will-have-your-guests-going-undercover': '5 Temas de Misterio de Espías Que Pondrán a Tus Invitados a Trabajar Encubiertos',
  '5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue': '5 Temas de Misterio de Asesinato de Circo Vintage: Entra a la Carpa Grande de Intriga',
  'ancient-egypt-murder-mystery-party-guide': 'Guía de Fiesta de Misterio de Asesinato del Antiguo Egipto',
  'art-gallery-murder-mystery-party-planning-create-sophisticated-creative-crimes': 'Planificación de Fiesta de Misterio en Galería de Arte: Crea Crímenes Creativos Sofisticados',
  'bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder': 'Planificación de Fiesta de Misterio en Librería: Pasa la Página del Asesinato Literario'
};

let successCount = 0;
let errorCount = 0;

for (const slug of batch1Slugs) {
  console.log(`\n📝 ${titleTranslations[slug]}`);

  // Fetch English post
  const { data: enPost, error: fetchError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('language', 'en')
    .single();

  if (fetchError || !enPost) {
    console.log(`   ❌ English post not found`);
    errorCount++;
    continue;
  }

  // Check if Spanish version exists
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', slug)
    .eq('language', 'es')
    .single();

  if (existing) {
    console.log(`   ⏭️  Spanish version already exists, skipping`);
    continue;
  }

  // Translate content
  const translatedContent = translateContent(enPost.content);

  // Create Spanish version
  const spanishPost = {
    slug: enPost.slug,
    title: titleTranslations[slug],
    content: translatedContent,
    meta_description: enPost.meta_description ? enPost.meta_description.substring(0, 100) + '... (versión en español)' : null,
    language: 'es',
    reading_time: enPost.reading_time,
    created_at: enPost.created_at,
    updated_at: new Date().toISOString()
  };

  const { error: insertError } = await supabase
    .from('blog_posts')
    .insert(spanishPost);

  if (insertError) {
    console.log(`   ❌ Insert error: ${insertError.message}`);
    errorCount++;
  } else {
    console.log(`   ✅ Translated and inserted`);
    successCount++;
  }
}

console.log(`\n\n🎉 Spanish Batch 1 Complete!`);
console.log(`   ✅ Success: ${successCount}/10`);
console.log(`   ❌ Errors: ${errorCount}/10\n`);
