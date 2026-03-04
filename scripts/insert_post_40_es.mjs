import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function insertPost() {
  const content = await fs.readFile('/tmp/post_40_es_content.txt', 'utf-8');
  
  const spanishPost = {
    title: '5 Temas de Misterio de Asesinato en Resort de Playa que Harán Tus Vacaciones Inolvidables',
    slug: '5-temas-misterio-asesinato-resort-playa-vacaciones-inolvidables',
    content: content,
    meta_description: 'Absorbe sol y suspenso con fiestas tropicales de asesinato misterioso en playa con personal de resort y villanos vacacionales.',
    meta_keywords: 'misterio asesinato resort playa, fiesta misterio tropical, temas misterio isla, misterio vacaciones playa, fiesta asesinato costera, misterio resort lujo, investigación playa, personajes resort tropical',
    language: 'es',
    theme: 'Beach/Tropical',
    status: 'published',
    reading_time: 14,
    author: 'AI Assistant',
    tags: ['Beach/Tropical'],
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
    console.log('✅ 5 Temas de Misterio de Asesinato en Resort de Playa');
  }
}

insertPost();
