import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = [
  {
    en: '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable',
    es: '5-temas-de-misterio-y-asesinato-en-resort-de-playa-que-haran-tu-vacacion-inolvidable',
    title: '5 Temas de Misterio y Asesinato en Resort de Playa que Harán tu Vacación Inolvidable'
  },
  {
    en: '5-casino-murder-mystery-party-themes-roll-the-dice-on-deadly-high-stakes-drama',
    es: '5-temas-de-fiesta-de-misterio-y-asesinato-en-casino-apuesta-por-drama-mortal-de-alto-riesgo',
    title: '5 Temas de Fiesta de Misterio y Asesinato en Casino: Apuesta por Drama Mortal de Alto Riesgo'
  },
  {
    en: '5-haunted-mansion-murder-mystery-themes',
    es: '5-temas-de-misterio-y-asesinato-en-mansion-encantada',
    title: '5 Temas de Misterio y Asesinato en Mansión Encantada'
  },
  {
    en: '5-mountain-lodge-murder-mystery-themes-that-will-make-your-retreat-unforgettable',
    es: '5-temas-de-misterio-y-asesinato-en-cabana-de-montana-que-haran-tu-retiro-inolvidable',
    title: '5 Temas de Misterio y Asesinato en Cabaña de Montaña que Harán tu Retiro Inolvidable'
  },
  {
    en: '5-renaissance-murder-mystery-party-themes',
    es: '5-temas-de-fiesta-de-misterio-y-asesinato-del-renacimiento',
    title: '5 Temas de Fiesta de Misterio y Asesinato del Renacimiento'
  }
];

// Comprehensive translation patterns
function translateToSpanish(content) {
  let translated = content;
  
  // E-E-A-T dates and metadata
  translated = translated.replace(
    /\*Published: February 16, 2026 \| Last Updated: February 20, 2026 \| Author: Mystery Maker Party Team \| Next Review: May 20, 2026\*/g,
    '*Publicado: 16 de febrero de 2026 | Actualizado: 20 de febrero de 2026 | Autor: Equipo de Mystery Maker Party | Próxima revisión: 20 de mayo de 2026*'
  );
  
  // Research statements - comprehensive patterns
  translated = translated.replace(/\*Based on analysis of 10,000\+ murder mystery parties and research into/g, '*Basado en el análisis de más de 10,000 fiestas de misterio y asesinato e investigación sobre');
  
  // Main section headers - make them more specific
  translated = translated.replace(/# 5 Beach Resort Murder Mystery Themes That Will Make Your Vacation Unforgettable/g, '# 5 Temas de Misterio y Asesinato en Resort de Playa que Harán tu Vacación Inolvidable');
  translated = translated.replace(/# 5 Casino Murder Mystery Party Themes: Roll the Dice on Deadly High-Stakes Drama/g, '# 5 Temas de Fiesta de Misterio y Asesinato en Casino: Apuesta por Drama Mortal de Alto Riesgo');
  translated = translated.replace(/# 5 Haunted Mansion Murder Mystery Themes/g, '# 5 Temas de Misterio y Asesinato en Mansión Encantada');
  translated = translated.replace(/# 5 Mountain Lodge Murder Mystery Themes That Will Make Your Retreat Unforgettable/g, '# 5 Temas de Misterio y Asesinato en Cabaña de Montaña que Harán tu Retiro Inolvidable');
  translated = translated.replace(/# 5 Renaissance Murder Mystery Party Themes/g, '# 5 Temas de Fiesta de Misterio y Asesinato del Renacimiento');
  
  // Common section headers
  translated = translated.replace(/## Why Beach Resorts Are Perfect for Murder Mystery Parties/g, '## Por Qué los Resorts de Playa son Perfectos para Fiestas de Misterio y Asesinato');
  translated = translated.replace(/## Why Casinos Are Perfect for Murder Mystery Parties/g, '## Por Qué los Casinos son Perfectos para Fiestas de Misterio y Asesinato');
  translated = translated.replace(/## Why Haunted Mansions Are Perfect for Murder Mystery Parties/g, '## Por Qué las Mansiones Encantadas son Perfectas para Fiestas de Misterio y Asesinato');
  translated = translated.replace(/## Why Mountain Lodges Are Perfect for Murder Mystery Parties/g, '## Por Qué las Cabañas de Montaña son Perfectas para Fiestas de Misterio y Asesinato');
  translated = translated.replace(/## Why Renaissance Settings Are Perfect for Murder Mystery Parties/g, '## Por Qué los Escenarios del Renacimiento son Perfectos para Fiestas de Misterio y Asesinato');
  
  // The 5 Best... headers
  translated = translated.replace(/## The 5 Best Beach Resort Murder Mystery Themes/g, '## Los 5 Mejores Temas de Misterio y Asesinato en Resorts de Playa');
  translated = translated.replace(/## The 5 Best Casino Murder Mystery Themes/g, '## Los 5 Mejores Temas de Misterio y Asesinato en Casinos');
  translated = translated.replace(/## The 5 Best Haunted Mansion Murder Mystery Themes/g, '## Los 5 Mejores Temas de Misterio y Asesinato en Mansiones Encantadas');
  translated = translated.replace(/## The 5 Best Mountain Lodge Murder Mystery Themes/g, '## Los 5 Mejores Temas de Misterio y Asesinato en Cabañas de Montaña');
  translated = translated.replace(/## The 5 Best Renaissance Murder Mystery Themes/g, '## Los 5 Mejores Temas de Misterio y Asesinato del Renacimiento');
  
  // Character formatting
  translated = translated.replace(/\*\*The Setup:\*\*/g, '**La Configuración:**');
  translated = translated.replace(/\*\*Key Characters:\*\*/g, '**Personajes Clave:**');
  translated = translated.replace(/\*\*Perfect For:\*\*/g, '**Perfecto Para:**');
  translated = translated.replace(/\*\*Special Elements:\*\*/g, '**Elementos Especiales:**');
  translated = translated.replace(/\(the victim\)/gi, '(la víctima)');
  
  // Common subsection headers
  translated = translated.replace(/### Location Considerations/g, '### Consideraciones de Ubicación');
  translated = translated.replace(/### Timing Your Mystery/g, '### Cronometrando tu Misterio');
  translated = translated.replace(/### Group Size Sweet Spots/g, '### Tamaños de Grupo Ideales');
  translated = translated.replace(/### Budget Breakdown/g, '### Desglose del Presupuesto');
  translated = translated.replace(/### Theme-Specific Items/g, '### Artículos Específicos del Tema');
  
  // How to Adapt sections
  translated = translated.replace(/## How to Adapt These Themes to Your Beach Resort/g, '## Cómo Adaptar Estos Temas a tu Resort de Playa');
  translated = translated.replace(/## How to Adapt These Themes to Your Casino/g, '## Cómo Adaptar Estos Temas a tu Casino');
  translated = translated.replace(/## How to Adapt These Themes to Your Haunted Mansion/g, '## Cómo Adaptar Estos Temas a tu Mansión Encantada');
  translated = translated.replace(/## How to Adapt These Themes to Your Mountain Lodge/g, '## Cómo Adaptar Estos Temas a tu Cabaña de Montaña');
  translated = translated.replace(/## How to Adapt These Themes to Your Renaissance Setting/g, '## Cómo Adaptar Estos Temas a tu Escenario del Renacimiento');
  
  // Essential Props and Materials
  translated = translated.replace(/## Essential Props and Materials/g, '## Materiales y Accesorios Esenciales');
  
  // Tips for Hosting
  translated = translated.replace(/## Tips for Hosting at Your Beach Resort/g, '## Consejos para Organizar en tu Resort de Playa');
  translated = translated.replace(/## Tips for Hosting at Your Casino/g, '## Consejos para Organizar en tu Casino');
  translated = translated.replace(/## Tips for Hosting in Your Haunted Mansion/g, '## Consejos para Organizar en tu Mansión Encantada');
  translated = translated.replace(/## Tips for Hosting at Your Mountain Lodge/g, '## Consejos para Organizar en tu Cabaña de Montaña');
  translated = translated.replace(/## Tips for Hosting Your Renaissance Party/g, '## Consejos para Organizar tu Fiesta del Renacimiento');
  
  // Pricing and Guest Considerations
  translated = translated.replace(/## Pricing and Guest Considerations/g, '## Precios y Consideraciones de Huéspedes');
  
  // Why ... Create Lasting Memories
  translated = translated.replace(/## Why Beach Resort Mysteries Create Lasting Memories/g, '## Por Qué los Misterios en Resorts de Playa Crean Recuerdos Duraderos');
  translated = translated.replace(/## Why Casino Mysteries Create Lasting Memories/g, '## Por Qué los Misterios en Casinos Crean Recuerdos Duraderos');
  translated = translated.replace(/## Why Haunted Mansion Mysteries Create Lasting Memories/g, '## Por Qué los Misterios en Mansiones Encantadas Crean Recuerdos Duraderos');
  translated = translated.replace(/## Why Mountain Lodge Mysteries Create Lasting Memories/g, '## Por Qué los Misterios en Cabañas de Montaña Crean Recuerdos Duraderos');
  translated = translated.replace(/## Why Renaissance Mysteries Create Lasting Memories/g, '## Por Qué los Misterios del Renacimiento Crean Recuerdos Duraderos');
  
  // Getting Started
  translated = translated.replace(/## Getting Started with Your Beach Resort Mystery/g, '## Comenzando con tu Misterio en Resort de Playa');
  translated = translated.replace(/## Getting Started with Your Casino Mystery/g, '## Comenzando con tu Misterio en Casino');
  translated = translated.replace(/## Getting Started with Your Haunted Mansion Mystery/g, '## Comenzando con tu Misterio en Mansión Encantada');
  translated = translated.replace(/## Getting Started with Your Mountain Lodge Mystery/g, '## Comenzando con tu Misterio en Cabaña de Montaña');
  translated = translated.replace(/## Getting Started with Your Renaissance Mystery/g, '## Comenzando con tu Misterio del Renacimiento');
  
  // Group sizes
  translated = translated.replace(/\*\*Small groups \(8-12\)\*\*: Intense, personal mysteries where everyone has significant roles/g, '**Grupos pequeños (8-12)**: Misterios intensos y personales donde todos tienen roles significativos');
  translated = translated.replace(/\*\*Medium groups \(12-20\)\*\*: Optimal for most [^.]+\./g, '**Grupos medianos (12-20)**: Óptimo para la mayoría de los misterios con buena relación sospechoso-huésped.');
  translated = translated.replace(/\*\*Large groups \(20\+\)\*\*: Work best with team-based investigation format/g, '**Grupos grandes (20+)**: Funcionan mejor con formato de investigación basado en equipos');
  
  // Budget items
  translated = translated.replace(/For a medium-sized group \(15 people\)/g, 'Para un grupo de tamaño mediano (15 personas)');
  translated = translated.replace(/\*\*Mystery materials\*\*: \$150-300 \(character packets, props, clues\)/g, '**Materiales del misterio**: $150-300 (paquetes de personajes, accesorios, pistas)');
  translated = translated.replace(/\*\*Costumes\/accessories\*\*: \$200-400 \(optional but enhances experience\)/g, '**Disfraces/accesorios**: $200-400 (opcional pero mejora la experiencia)');
  translated = translated.replace(/\*\*Special food\/drinks\*\*: \$300-600/g, '**Comida/bebidas especiales**: $300-600');
  translated = translated.replace(/\*\*Professional facilitator\*\*: \$500-1000 \(recommended for groups 20\+\)/g, '**Facilitador profesional**: $500-1000 (recomendado para grupos de 20+)');
  translated = translated.replace(/\*\*Total per person\*\*: \$75-150/g, '**Total por persona**: $75-150');
  
  // Mystery Maker Party links and standard text
  translated = translated.replace(/Visit \[Mystery Maker Party\]\(https:\/\/www\.mysterymakerparty\.com\)/g, 'Visita [Mystery Maker Party](https://www.mysterymakerparty.com)');
  translated = translated.replace(/Ready to turn your/g, '¿Listo para convertir tu');
  translated = translated.replace(/into an unforgettable murder mystery experience\?/g, 'en una experiencia de misterio inolvidable?');
  translated = translated.replace(/Our customizable mystery kits include:/g, 'Nuestros kits de misterio personalizables incluyen:');
  translated = translated.replace(/Complete character backgrounds with secrets, motives, and objectives/g, 'Antecedentes completos de personajes con secretos, motivos y objetivos');
  translated = translated.replace(/Detailed clue timelines with flexible reveal options/g, 'Líneas de tiempo detalladas de pistas con opciones flexibles de revelación');
  translated = translated.replace(/Hosting guide with scheduling, setup, and facilitation tips/g, 'Guía de organización con consejos de programación, configuración y facilitación');
  translated = translated.replace(/Printable props, evidence, and documents/g, 'Accesorios imprimibles, evidencia y documentos');
  translated = translated.replace(/Solution reveal script with dramatic presentation suggestions/g, 'Guion de revelación de solución con sugerencias de presentación dramática');
  translated = translated.replace(/Customization guidance for your specific/g, 'Orientación de personalización para tu');
  
  return translated;
}

async function processPost(post) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Processing: ${post.en}`);
  console.log('='.repeat(80));
  
  try {
    // Fetch English post
    console.log('1. Fetching English post...');
    const { data: enPost, error: fetchError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', post.en)
      .eq('language', 'en')
      .single();
    
    if (fetchError) throw fetchError;
    console.log(`   ✓ Found: "${enPost.title}"`);
    
    // Translate
    console.log('2. Translating...');
    const esContent = translateToSpanish(enPost.content);
    console.log(`   ✓ Translated (${esContent.length} chars)`);
    
    // Prepare Spanish post
    const esPost = {
      slug: post.es,
      language: 'es',
      title: post.title,
      content: esContent,
      meta_description: enPost.meta_description,
      meta_keywords: enPost.meta_keywords,
      theme: enPost.theme,
      status: 'published',
      featured_image_url: enPost.featured_image_url,
      reading_time: enPost.reading_time,
      author: enPost.author,
      tags: enPost.tags,
      published_at: enPost.published_at,
      post_date: enPost.post_date
    };
    
    // Check if exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', post.es)
      .single();
    
    if (existing) {
      console.log('3. Updating existing...');
      const { error } = await supabase
        .from('blog_posts')
        .update(esPost)
        .eq('id', existing.id);
      
      if (error) throw error;
      console.log(`   ✓ Updated!`);
    } else {
      console.log('3. Inserting new...');
      const { error } = await supabase
        .from('blog_posts')
        .insert([esPost]);
      
      if (error) throw error;
      console.log(`   ✓ Inserted!`);
    }
    
    console.log(`   ✓ SUCCESS: ${post.title}`);
    return { success: true, slug: post.en };
    
  } catch (error) {
    console.error(`   ✗ ERROR: ${error.message}`);
    return { success: false, slug: post.en, error: error.message };
  }
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('SPANISH TRANSLATION - 5 BLOG POSTS');
  console.log('='.repeat(80));
  
  const results = [];
  for (const post of posts) {
    const result = await processPost(post);
    results.push(result);
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✓ Successful: ${successful.length}/${results.length}`);
  if (failed.length > 0) {
    console.log(`✗ Failed: ${failed.length}`);
    failed.forEach(f => console.log(`  - ${f.slug}: ${f.error}`));
  }
  
  console.log('\n✓ Translation complete!');
}

main();
