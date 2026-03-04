import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const englishPosts = JSON.parse(fs.readFileSync('/tmp/posts_to_translate.json', 'utf8'));

// Comprehensive translation mappings
const spanishTranslations = [
  // POST 1: Breaking Character
  {
    originalSlug: 'how-to-fix-guests-breaking-character-keep-your-murder-mystery-party-immersive',
    slug: 'como-evitar-que-invitados-rompan-personaje-mantenga-su-fiesta-de-misterio-inmersiva',
    title: 'Cómo Evitar que los Invitados Rompan el Personaje: Mantenga su Fiesta de Misterio de Asesinato Inmersiva',
    metaDescription: 'Mantenga a todos en personaje con roles personalizados atractivos y pautas claras que mantienen la inmersión durante toda la fiesta.',
    metaKeywords: 'romper personaje misterio asesinato, mantener invitados en personaje, inmersión juego de rol, consistencia personaje, consejos actuación misterio asesinato, permanecer en personaje, compromiso personaje, pautas juego de rol, fiesta misterio inmersiva, desarrollo personaje'
  },
  // POST 2: Fairy Tale
  {
    originalSlug: 'how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime',
    slug: 'como-organizar-fiesta-misterio-asesinato-cuento-hadas-erase-un-crimen',
    title: 'Cómo Organizar una Fiesta de Misterio de Asesinato de Cuento de Hadas: Érase una Vez un Crimen',
    metaDescription: 'Transforme cuentos de hadas clásicos en misterios de asesinato encantadores con personajes mágicos, giros oscuros y pistas inmersivas.',
    metaKeywords: 'fiesta misterio asesinato cuento hadas, misterio érase una vez, fiesta temática cuento hadas, misterio asesinato encantado, juego misterio cuento hadas, fiesta misterio fantasía, misterio bosque encantado, juego asesinato cuento hadas, fiesta princesa misterio, evento cuento hadas'
  },
  // POST 3: Hollywood
  {
    originalSlug: 'how-to-host-a-hollywood-murder-mystery-party',
    slug: 'como-organizar-fiesta-misterio-asesinato-hollywood',
    title: 'Cómo Organizar una Fiesta de Misterio de Asesinato de Hollywood',
    metaDescription: 'Cree una fiesta de misterio de asesinato glamorosa de Hollywood con estrellas, escándalos y glamour de la época dorada.',
    metaKeywords: 'fiesta misterio asesinato hollywood, tema glamour hollywood, fiesta alfombra roja, misterio época dorada, fiesta estrella cine, evento temático hollywood, fiesta década 1920 hollywood, misterio asesinato celebridad, fiesta temática cine, evento glamour hollywood'
  },
  // POST 4: Medieval Castle
  {
    originalSlug: 'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue',
    slug: 'como-organizar-misterio-asesinato-castillo-medieval-gobierne-reino-con-intriga-real',
    title: 'Cómo Organizar un Misterio de Asesinato en Castillo Medieval: Gobierne su Reino con Intriga Real',
    metaDescription: 'Gobierne su reino con intriga real, secretos de corte y misterios medievales en una fiesta de asesinato épica ambientada en castillo.',
    metaKeywords: 'fiesta misterio castillo medieval, misterio asesinato medieval, fiesta temática castillo, misterio corte real, fiesta caballeros y damas, evento temático medieval, misterio asesinato época medieval, fiesta rey reina, banquete medieval misterio, evento fantasía medieval'
  },
  // POST 5: Prohibition Era
  {
    originalSlug: 'how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement',
    slug: 'como-organizar-misterio-asesinato-era-prohibicion-contrabando-camino-emocion',
    title: 'Cómo Organizar un Misterio de Asesinato de la Era de la Prohibición: Contrabandee su Camino hacia la Emoción',
    metaDescription: 'Contrabandee su camino hacia la emoción con gángsters, cantinas clandestinas y glamour de los años 20 en esta fiesta de misterio de asesinato de la era de la prohibición.',
    metaKeywords: 'fiesta misterio era prohibición, misterio asesinato años 1920, tema cantina clandestina, fiesta gángster, fiesta jazz años 20, evento temático prohibición, misterio asesinato década 1920, fiesta speakeasy, fiesta años rugientes, tema contrabandista'
  }
];

console.log('Starting complete Spanish translations for posts 16-20...\n');

// Delete existing Spanish versions first
for (const trans of spanishTranslations) {
  await supabase
    .from('blog_posts')
    .delete()
    .eq('slug', trans.slug);
}

console.log('✅ Deleted existing Spanish versions\n');

// Process each post
for (let i = 0; i < englishPosts.length; i++) {
  const englishPost = englishPosts[i];
  const translation = spanishTranslations[i];
  
  console.log(`[${i+1}/5] ${translation.title}`);
  
  // Translate content - save to individual file for Claude to translate
  const contentFile = `/tmp/content_to_translate_${i+1}.txt`;
  fs.writeFileSync(contentFile, englishPost.content);
  
  console.log(`   Saved content to ${contentFile} for translation`);
  console.log(`   Content length: ${englishPost.content.length} characters`);
}

console.log('\n✅ Prepared all 5 posts for translation');
console.log('\nNext: Translate each content file and insert into database');
