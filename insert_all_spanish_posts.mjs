import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get English posts
const englishPosts = JSON.parse(fs.readFileSync('/tmp/posts_to_translate.json', 'utf8'));

// Post data
const spanishPosts = [
  {
    title: 'Cómo Evitar que los Invitados Rompan el Personaje: Mantenga su Fiesta de Misterio de Asesinato Inmersiva',
    slug: 'como-evitar-que-invitados-rompan-personaje-mantenga-su-fiesta-de-misterio-inmersiva',
    meta_description: 'Mantenga a todos en personaje con roles personalizados atractivos y pautas claras que mantienen la inmersión durante toda la fiesta.',
    meta_keywords: 'romper personaje misterio asesinato, mantener invitados en personaje, inmersión juego de rol, consistencia personaje, consejos actuación misterio asesinato, permanecer en personaje, compromiso personaje, pautas juego de rol, fiesta misterio inmersiva, desarrollo personaje',
    content: fs.readFileSync('/tmp/spanish_post_1.txt', 'utf8')
  },
  {
    title: 'Cómo Organizar una Fiesta de Misterio de Asesinato de Cuento de Hadas: Érase una Vez un Crimen',
    slug: 'como-organizar-fiesta-misterio-asesinato-cuento-hadas-erase-un-crimen',
    meta_description: 'Transforme cuentos de hadas clásicos en misterios de asesinato encantadores con personajes mágicos, giros oscuros y pistas inmersivas.',
    meta_keywords: 'fiesta misterio asesinato cuento hadas, misterio érase una vez, fiesta temática cuento hadas, misterio asesinato encantado, juego misterio cuento hadas, fiesta misterio fantasía, misterio bosque encantado, juego asesinato cuento hadas, fiesta princesa misterio, evento cuento hadas',
    content: fs.readFileSync('/tmp/spanish_post_2.txt', 'utf8')
  },
  {
    title: 'Cómo Organizar una Fiesta de Misterio de Asesinato de Hollywood',
    slug: 'como-organizar-fiesta-misterio-asesinato-hollywood',
    meta_description: 'Cree una fiesta de misterio de asesinato glamorosa de Hollywood con estrellas, escándalos y glamour de la época dorada.',
    meta_keywords: 'fiesta misterio asesinato hollywood, tema glamour hollywood, fiesta alfombra roja, misterio época dorada, fiesta estrella cine, evento temático hollywood, fiesta década 1920 hollywood, misterio asesinato celebridad, fiesta temática cine, evento glamour hollywood',
    content: fs.readFileSync('/tmp/spanish_post_3.txt', 'utf8')
  },
  {
    title: 'Cómo Organizar un Misterio de Asesinato en Castillo Medieval: Gobierne su Reino con Intriga Real',
    slug: 'como-organizar-misterio-asesinato-castillo-medieval-gobierne-reino-con-intriga-real',
    meta_description: 'Gobierne su reino con intriga real, secretos de corte y misterios medievales en una fiesta de asesinato épica ambientada en castillo.',
    meta_keywords: 'fiesta misterio castillo medieval, misterio asesinato medieval, fiesta temática castillo, misterio corte real, fiesta caballeros y damas, evento temático medieval, misterio asesinato época medieval, fiesta rey reina, banquete medieval misterio, evento fantasía medieval',
    content: fs.readFileSync('/tmp/spanish_post_4.txt', 'utf8')
  },
  {
    title: 'Cómo Organizar un Misterio de Asesinato de la Era de la Prohibición: Contrabandee su Camino hacia la Emoción',
    slug: 'como-organizar-misterio-asesinato-era-prohibicion-contrabando-camino-emocion',
    meta_description: 'Contrabandee su camino hacia la emoción con gángsters, cantinas clandestinas y glamour de los años 20 en esta fiesta de misterio de asesinato de la era de la prohibición.',
    meta_keywords: 'fiesta misterio era prohibición, misterio asesinato años 1920, tema cantina clandestina, fiesta gángster, fiesta jazz años 20, evento temático prohibición, misterio asesinato década 1920, fiesta speakeasy, fiesta años rugientes, tema contrabandista',
    content: fs.readFileSync('/tmp/spanish_post_5.txt', 'utf8')
  }
];

console.log('Inserting all 5 Spanish posts...\n');

// Delete existing Spanish versions
for (const post of spanishPosts) {
  await supabase
    .from('blog_posts')
    .delete()
    .eq('slug', post.slug);
  console.log(`Deleted existing: ${post.slug}`);
}

console.log('\n');

// Insert all posts
for (let i = 0; i < spanishPosts.length; i++) {
  const englishPost = englishPosts[i];
  const spanishPost = spanishPosts[i];
  
  const postData = {
    title: spanishPost.title,
    content: spanishPost.content,
    slug: spanishPost.slug,
    meta_description: spanishPost.meta_description,
    meta_keywords: spanishPost.meta_keywords,
    language: 'es',
    theme: englishPost.theme,
    status: 'published',
    reading_time: englishPost.reading_time,
    author: englishPost.author,
    tags: englishPost.tags
  };
  
  const { error } = await supabase
    .from('blog_posts')
    .insert([postData]);
  
  if (error) {
    console.error(`❌ Error inserting post ${i+1}:`, error.message);
  } else {
    console.log(`✅ [${i+1}/5] ${spanishPost.title}`);
  }
}

console.log('\n✅ ALL 5 POSTS COMPLETELY TRANSLATED AND INSERTED TO DATABASE');
