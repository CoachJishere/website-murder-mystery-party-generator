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

function translateToSpanish(content) {
  let t = content;
  
  // Metadata - multiple patterns
  t = t.replace(/\*Published: ([^|]+) \| Updated: ([^|]+) \| Author: ([^|]+) \| Next Review: ([^*]+)\*/g, '*Publicado: $1 | Actualizado: $2 | Autor: $3 | Próxima revisión: $4*');
  t = t.replace(/\*Last Updated: ([^*]+)\*/g, '*Actualizado: $1*');
  t = t.replace(/February 16, 2026/g, '16 de febrero de 2026');
  t = t.replace(/February 20, 2026/g, '20 de febrero de 2026');
  t = t.replace(/May 20, 2026/g, '20 de mayo de 2026');
  t = t.replace(/Mystery Maker Party Team/g, 'Equipo de Mystery Maker Party');
  
  // Research statements
  t = t.replace(/\*Based on analyzing 10,000\+ murder mystery parties and extensive research into ([^*]+)\*/g, '*Basado en el análisis de más de 10,000 fiestas de misterio y asesinato e investigación exhaustiva sobre $1*');
  t = t.replace(/\*Based on analysis of 10,000\+ murder mystery parties and research into ([^*]+)\*/g, '*Basado en el análisis de más de 10,000 fiestas de misterio y asesinato e investigación sobre $1*');
  
  // Locations in research
  t = t.replace(/beach resort entertainment trends/g, 'tendencias de entretenimiento en resorts de playa');
  t = t.replace(/casino entertainment trends/g, 'tendencias de entretenimiento en casinos');
  t = t.replace(/haunted mansion entertainment/g, 'entretenimiento en mansiones encantadas');
  t = t.replace(/mountain lodge entertainment/g, 'entretenimiento en cabañas de montaña');
  t = t.replace(/Renaissance era celebrations/g, 'celebraciones de la era del Renacimiento');
  
  // Section headers - generic patterns
  t = t.replace(/## ([^:]+) Murder Mysteries: Market Trends & Popularity/g, '## Misterios de Asesinato en $1: Tendencias del Mercado y Popularidad');
  t = t.replace(/## ([^:]+): Setting the Scene/g, '## $1: Preparando la Escena');
  t = t.replace(/## The 5 ([^M]+) Murder Mystery Themes/g, '## Los 5 Temas de Misterio y Asesinato en $1');
  t = t.replace(/## Making Your ([^M]+) Mystery Party Unforgettable/g, '## Haciendo tu Fiesta de Misterio en $1 Inolvidable');
  t = t.replace(/## Essential Props for ([^M]+) Mysteries/g, '## Accesorios Esenciales para Misterios en $1');
  t = t.replace(/## Frequently Asked Questions/g, '## Preguntas Frecuentes');
  t = t.replace(/## Final Thoughts/g, '## Pensamientos Finales');
  
  // Subsections
  t = t.replace(/### Atmosphere & Ambiance/g, '### Atmósfera y Ambiente');
  t = t.replace(/### Venue Selection/g, '### Selección del Lugar');
  t = t.replace(/### Food & Beverage Pairings/g, '### Maridajes de Comida y Bebida');
  t = t.replace(/### Costume Guidelines/g, '### Pautas de Vestuario');
  t = t.replace(/### Budget Considerations/g, '### Consideraciones de Presupuesto');
  t = t.replace(/### Timing & Pacing/g, '### Sincronización y Ritmo');
  
  // Character sections
  t = t.replace(/\*\*The Setup:\*\*/g, '**La Configuración:**');
  t = t.replace(/\*\*The Murder:\*\*/g, '**El Asesinato:**');
  t = t.replace(/\*\*Key Characters:\*\*/g, '**Personajes Clave:**');
  t = t.replace(/\*\*Perfect For:\*\*/g, '**Perfecto Para:**');
  t = t.replace(/\*\*Special Elements:\*\*/g, '**Elementos Especiales:**');
  t = t.replace(/\*\*Clue Highlights:\*\*/g, '**Aspectos Destacados de las Pistas:**');
  t = t.replace(/\(the victim\)/gi, '(la víctima)');
  t = t.replace(/\(victim\)/gi, '(víctima)');
  
  // Theme numbers
  t = t.replace(/### 1\. /g, '### 1. ');
  t = t.replace(/### 2\. /g, '### 2. ');
  t = t.replace(/### 3\. /g, '### 3. ');
  t = t.replace(/### 4\. /g, '### 4. ');
  t = t.replace(/### 5\. /g, '### 5. ');
  
  // Common phrases
  t = t.replace(/Visit \[Mystery Maker Party\]/g, 'Visita [Mystery Maker Party]');
  t = t.replace(/Ready to create your/gi, '¿Listo para crear tu');
  t = t.replace(/ready to turn your/gi, '¿Listo para convertir tu');
  t = t.replace(/into an unforgettable/g, 'en una experiencia inolvidable');
  t = t.replace(/murder mystery experience/g, 'de misterio y asesinato');
  
  // Table headers
  t = t.replace(/\| Statistic \|/g, '| Estadística |');
  t = t.replace(/\| Value \|/g, '| Valor |');
  t = t.replace(/\| Source \|/g, '| Fuente |');
  t = t.replace(/\| Theme \|/g, '| Tema |');
  t = t.replace(/\| Best For \|/g, '| Mejor Para |');
  t = t.replace(/\| Difficulty \|/g, '| Dificultad |');
  t = t.replace(/\| Group Size \|/g, '| Tamaño del Grupo |');
  
  // Stats terms
  t = t.replace(/Global coastal tourism market/g, 'Mercado global de turismo costero');
  t = t.replace(/US beach tourism visitors/g, 'Visitantes de turismo de playa en EE.UU.');
  t = t.replace(/Beach resort hotel revenue/g, 'Ingresos de hoteles en resorts de playa');
  t = t.replace(/Vacation rental market/g, 'Mercado de alquileres vacacionales');
  t = t.replace(/annual beach visits/g, 'visitas anuales a playas');
  t = t.replace(/annually/g, 'anualmente');
  
  // Casino terms
  t = t.replace(/Global casino market/g, 'Mercado global de casinos');
  t = t.replace(/US casino revenue/g, 'Ingresos de casinos en EE.UU.');
  t = t.replace(/Casino resort revenue/g, 'Ingresos de resorts con casino');
  
  // Numbers/currencies stay the same but add context
  t = t.replace(/\$(\d+(?:,\d{3})*(?:\.\d+)?) billion/g, '$$$1 mil millones');
  t = t.replace(/\$(\d+(?:,\d{3})*(?:\.\d+)?) million/g, '$$$1 millones');
  t = t.replace(/(\d+) million ([a-z]+)/g, '$1 millones de $2');
  
  // Questions
  t = t.replace(/How do I ([^?]+)\?/g, '¿Cómo $1?');
  t = t.replace(/What ([^?]+)\?/g, '¿Qué $1?');
  t = t.replace(/Why ([^?]+)\?/g, '¿Por qué $1?');
  t = t.replace(/When ([^?]+)\?/g, '¿Cuándo $1?');
  t = t.replace(/Where ([^?]+)\?/g, '¿Dónde $1?');
  
  return t;
}

async function processPost(post) {
  console.log(`\n${'-'.repeat(80)}`);
  console.log(`${post.en}`);
  
  try {
    const { data: enPost } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', post.en)
      .eq('language', 'en')
      .single();
    
    const esContent = translateToSpanish(enPost.content);
    
    const { error } = await supabase
      .from('blog_posts')
      .update({
        title: post.title,
        content: esContent
      })
      .eq('slug', post.es)
      .eq('language', 'es');
    
    if (error) throw error;
    
    console.log(`✓ Updated: ${post.title}`);
    return { success: true };
    
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('RE-TRANSLATING ALL 5 POSTS WITH IMPROVED PATTERNS\n');
  
  for (const post of posts) {
    await processPost(post);
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✓ Re-translation complete!');
}

main();
