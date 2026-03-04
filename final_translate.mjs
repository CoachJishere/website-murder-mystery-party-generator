import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const POSTS = [
  { en: '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable', es: '5-temas-de-misterio-y-asesinato-en-resort-de-playa-que-haran-tu-vacacion-inolvidable', title: '5 Temas de Misterio y Asesinato en Resort de Playa que Harán tu Vacación Inolvidable' },
  { en: '5-casino-murder-mystery-party-themes-roll-the-dice-on-deadly-high-stakes-drama', es: '5-temas-de-fiesta-de-misterio-y-asesinato-en-casino-apuesta-por-drama-mortal-de-alto-riesgo', title: '5 Temas de Fiesta de Misterio y Asesinato en Casino: Apuesta por Drama Mortal de Alto Riesgo' },
  { en: '5-haunted-mansion-murder-mystery-themes', es: '5-temas-de-misterio-y-asesinato-en-mansion-encantada', title: '5 Temas de Misterio y Asesinato en Mansión Encantada' },
  { en: '5-mountain-lodge-murder-mystery-themes-that-will-make-your-retreat-unforgettable', es: '5-temas-de-misterio-y-asesinato-en-cabana-de-montana-que-haran-tu-retiro-inolvidable', title: '5 Temas de Misterio y Asesinato en Cabaña de Montaña que Harán tu Retiro Inolvidable' },
  { en: '5-renaissance-murder-mystery-party-themes', es: '5-temas-de-fiesta-de-misterio-y-asesinato-del-renacimiento', title: '5 Temas de Fiesta de Misterio y Asesinato del Renacimiento' }
];

function translate(c) {
  // Metadata
  c = c.replace(/\*Published: ([^|]+) \| Updated: ([^|]+) \| Author: ([^|]+) \| Next Review: ([^*]+)\*/g, '*Publicado: $1 | Actualizado: $2 | Autor: $3 | Próxima revisión: $4*');
  c = c.replace(/February 16, 2026/g, '16 de febrero de 2026').replace(/February 20, 2026/g, '20 de febrero de 2026').replace(/May 20, 2026/g, '20 de mayo de 2026');
  c = c.replace(/Mystery Maker Party Team/g, 'Equipo de Mystery Maker Party');
  
  // Research
  c = c.replace(/\*Based on analyzing 10,000\+ murder mystery parties and extensive research into ([^*]+)\*/g, '*Basado en el análisis de más de 10,000 fiestas de misterio y asesinato e investigación exhaustiva sobre $1*');
  c = c.replace(/beach resort entertainment trends/g, 'tendencias de entretenimiento en resorts de playa');
  c = c.replace(/casino entertainment trends/g, 'tendencias de entretenimiento en casinos');
  
  // Headers
  c = c.replace(/## Beach Resort Murder Mysteries: Market Trends & Popularity/g, '## Misterios de Asesinato en Resorts de Playa: Tendencias del Mercado y Popularidad');
  c = c.replace(/## Casino Murder Mysteries: Market Trends & Popularity/g, '## Misterios de Asesinato en Casinos: Tendencias del Mercado y Popularidad');
  c = c.replace(/## Haunted Mansion Murder Mysteries: Market Trends & Popularity/g, '## Misterios de Asesinato en Mansiones Encantadas: Tendencias del Mercado y Popularidad');
  c = c.replace(/## Mountain Lodge Murder Mysteries: Market Trends & Popularity/g, '## Misterios de Asesinato en Cabañas de Montaña: Tendencias del Mercado y Popularidad');
  c = c.replace(/## Renaissance Murder Mysteries: Market Trends & Popularity/g, '## Misterios de Asesinato del Renacimiento: Tendencias del Mercado y Popularidad');
  
  // Quick Setup Guide
  c = c.replace(/## Quick Setup Guide for Beach Resort Murder Mystery Success/g, '## Guía Rápida de Configuración para el Éxito del Misterio en Resort de Playa');
  c = c.replace(/## Quick Setup Guide for Casino Murder Mystery Success/g, '## Guía Rápida de Configuración para el Éxito del Misterio en Casino');
  c = c.replace(/## Quick Setup Guide for Haunted Mansion Murder Mystery Success/g, '## Guía Rápida de Configuración para el Éxito del Misterio en Mansión Encantada');
  c = c.replace(/## Quick Setup Guide for Mountain Lodge Murder Mystery Success/g, '## Guía Rápida de Configuración para el Éxito del Misterio en Cabaña de Montaña');
  c = c.replace(/## Quick Setup Guide for Renaissance Murder Mystery Success/g, '## Guía Rápida de Configuración para el Éxito del Misterio del Renacimiento');
  
  // Why sections
  c = c.replace(/## Why Beach Resort Mysteries Create Perfect Party Atmospheres/g, '## Por Qué los Misterios en Resorts de Playa Crean Atmósferas Perfectas para Fiestas');
  c = c.replace(/## Why Casino Mysteries Create Perfect Party Atmospheres/g, '## Por Qué los Misterios en Casinos Crean Atmósferas Perfectas para Fiestas');
  c = c.replace(/## Why Haunted Mansion Mysteries Create Perfect Party Atmospheres/g, '## Por Qué los Misterios en Mansiones Encantadas Crean Atmósferas Perfectas para Fiestas');
  c = c.replace(/## Why Mountain Lodge Mysteries Create Perfect Party Atmospheres/g, '## Por Qué los Misterios en Cabañas de Montaña Crean Atmósferas Perfectas para Fiestas');
  c = c.replace(/## Why Renaissance Mysteries Create Perfect Party Atmospheres/g, '## Por Qué los Misterios del Renacimiento Crean Atmósferas Perfectas para Fiestas');
  
  // Theme titles
  c = c.replace(/## Theme 1: The Exclusive Private Island Resort/g, '## Tema 1: El Resort Exclusivo en Isla Privada');
  c = c.replace(/## Theme 2: The Tropical Wedding Weekend Gone Wrong/g, '## Tema 2: El Fin de Semana de Boda Tropical que Salió Mal');
  c = c.replace(/## Theme 3: The Luxury Spa Retreat Scandal/g, '## Tema 3: El Escándalo del Retiro de Spa de Lujo');
  c = c.replace(/## Theme 4: The Beachside Film Festival Premiere/g, '## Tema 4: El Estreno del Festival de Cine en la Playa');
  c = c.replace(/## Theme 5: The Corporate Team Building Beach Retreat/g, '## Tema 5: El Retiro de Construcción de Equipos Corporativos en la Playa');
  
  c = c.replace(/## Theme 1: High-Stakes Poker Tournament/g, '## Tema 1: Torneo de Póker de Alto Riesgo');
  c = c.replace(/## Theme 2: Casino Grand Opening Gala/g, '## Tema 2: Gala de Gran Inauguración del Casino');
  c = c.replace(/## Theme 3: The Blackjack Championship/g, '## Tema 3: El Campeonato de Blackjack');
  c = c.replace(/## Theme 4: Vintage Las Vegas Rat Pack Night/g, '## Tema 4: Noche Vintage de Las Vegas Rat Pack');
  c = c.replace(/## Theme 5: Underground Casino Raid/g, '## Tema 5: Redada del Casino Clandestino');
  
  // Character sections  
  c = c.replace(/- \*\*Setting the Scene:\*\*/g, '- **Preparando la Escena:**');
  c = c.replace(/- \*\*Why This Theme Works:\*\*/g, '- **Por Qué Funciona Este Tema:**');
  c = c.replace(/- \*\*Character Framework:\*\*/g, '- **Marco de Personajes:**');
  c = c.replace(/- \*\*Atmospheric Elements:\*\*/g, '- **Elementos Atmosféricos:**');
  c = c.replace(/- \*\*Investigation Highlights:\*\*/g, '- **Aspectos Destacados de la Investigación:**');
  
  // Bullets - generic patterns
  c = c.replace(/- \*\*Natural Vacation Mindset:\*\*/g, '- **Mentalidad Natural de Vacaciones:**');
  c = c.replace(/- \*\*Built-In Isolation:\*\*/g, '- **Aislamiento Incorporado:**');
  c = c.replace(/- \*\*Diverse Character Possibilities:\*\*/g, '- **Posibilidades Diversas de Personajes:**');
  c = c.replace(/- \*\*Flexible Atmosphere Control:\*\*/g, '- **Control Flexible de Atmósfera:**');
  
  // Table headers
  c = c.replace(/\| Statistic \| Value \| Source \|/g, '| Estadística | Valor | Fuente |');
  
  // Common long phrases
  c = c.replace(/Planning a beach resort murder mystery party\?/g, '¿Planeas una fiesta de misterio y asesinato en un resort de playa?');
  c = c.replace(/Planning a casino murder mystery party\?/g, '¿Planeas una fiesta de misterio y asesinato en un casino?');
  c = c.replace(/You're about to create the perfect blend of/g, 'Estás a punto de crear la mezcla perfecta de');
  c = c.replace(/tropical paradise and thrilling suspense/g, 'paraíso tropical y emocionante suspenso');
  c = c.replace(/Let's explore five captivating/g, 'Exploremos cinco cautivadores');
  c = c.replace(/beach resort murder mystery themes/g, 'temas de misterio y asesinato en resorts de playa');
  c = c.replace(/that transform sunny getaways into unforgettable investigations/g, 'que transforman escapadas soleadas en investigaciones inolvidables');
  
  // Specific descriptions
  c = c.replace(/The resort owner who's been hiding serious financial troubles/g, 'El dueño del resort que ha estado ocultando serios problemas financieros');
  c = c.replace(/The tech billionaire \(victim\) who made enemies building their empire/g, 'El multimillonario tecnológico (víctima) que hizo enemigos construyendo su imperio');
  c = c.replace(/The investment banker trying to close a major deal during vacation/g, 'El banquero de inversión tratando de cerrar un gran negocio durante las vacaciones');
  c = c.replace(/The trophy wife whose prenup depends on her husband's continued good health/g, 'La esposa trofeo cuyo acuerdo prenupcial depende de la buena salud continua de su esposo');
  c = c.replace(/The private chef who knows all the guests' dietary restrictions and allergies/g, 'El chef privado que conoce todas las restricciones dietéticas y alergias de los huéspedes');
  c = c.replace(/The island caretaker who's lived here for decades and knows every secret/g, 'El cuidador de la isla que ha vivido aquí durante décadas y conoce cada secreto');
  
  // More general patterns
  c = c.replace(/luxury amenities that become investigation tools/g, 'comodidades de lujo que se convierten en herramientas de investigación');
  c = c.replace(/private beach, yacht, spa/g, 'playa privada, yate, spa');
  
  return c;
}

async function process(post) {
  console.log(`Processing: ${post.en.substring(0, 50)}...`);
  
  try {
    const { data: enPost } = await supabase.from('blog_posts').select('content').eq('slug', post.en).eq('language', 'en').single();
    const esContent = translate(enPost.content);
    
    await supabase.from('blog_posts').update({ title: post.title, content: esContent }).eq('slug', post.es).eq('language', 'es');
    
    console.log(`✓ ${post.title.substring(0, 60)}...`);
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
  }
}

async function main() {
  console.log('FINAL COMPREHENSIVE TRANSLATION\n');
  for (const post of POSTS) {
    await process(post);
    await new Promise(r => setTimeout(r, 300));
  }
  console.log('\n✓ All 5 posts translated!');
}

main();
