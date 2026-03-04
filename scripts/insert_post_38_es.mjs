import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function insertPost() {
  const content = await fs.readFile('/tmp/post_38_es_content.txt', 'utf-8');
  
  const spanishPost = {
    title: 'Fiesta de Asesinato Misterioso Zombi: Guía Completa de Planificación',
    slug: 'fiesta-asesinato-misterioso-zombi-guia-completa-planificacion',
    content: content,
    meta_description: 'Organiza una emocionante fiesta de asesinato misterioso de apocalipsis zombi. Escenarios de supervivencia, tarjetas de personajes, giros no-muertos y accesorios para 6-12 invitados.',
    meta_keywords: 'fiesta misterio apocalipsis zombi, fiesta asesinato misterioso zombi, escenarios supervivencia horror, misterio temático zombi, fiesta apocalipsis 6-12 invitados, accesorios misterio zombi, personajes sobrevivientes zombi, misterio terror supervivencia',
    language: 'es',
    theme: 'Horror/Survival',
    status: 'published',
    reading_time: 17,
    author: 'AI Assistant',
    tags: ['Horror/Survival'],
    published_at: '2025-10-29T05:00:58.01+00:00',
    post_date: '2025-10-29'
  };

  const { data, error } = await supabase
    .from('blog_posts')
    .insert(spanishPost)
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ Fiesta de Asesinato Misterioso Zombi');
  }
}

insertPost();
