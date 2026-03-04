import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function insertPost() {
  const content = await fs.readFile('/tmp/post_36_es_content.txt', 'utf-8');
  
  const spanishPost = {
    title: 'Guía de Fiesta de Asesinato Misterioso en Centro de Spa: Relájate en el Peligro y el Lujo',
    slug: 'guia-fiesta-asesinato-misterioso-centro-spa-relajate-peligro-lujo',
    content: content,
    meta_description: 'Relájate en el peligro con lujosas fiestas de asesinato misterioso en spa con expertos en bienestar y traición terapéutica.',
    meta_keywords: 'misterio asesinato centro spa, fiesta misterio bienestar, misterio spa lujo, misterio sanación holística, misterio fin de semana spa, misterio retiro bienestar, misterio tema relajación, personaje terapeuta spa, misterio gurú bienestar, fiesta spa destino',
    language: 'es',
    theme: 'Spa/Wellness',
    status: 'published',
    reading_time: 15,
    author: 'AI Assistant',
    tags: ['Spa/Wellness'],
    published_at: '2025-12-18T05:00:39.168+00:00',
    post_date: '2025-12-18'
  };

  const { data, error } = await supabase
    .from('blog_posts')
    .insert(spanishPost)
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ Guía de Fiesta de Asesinato Misterioso en Centro de Spa');
  }
}

insertPost();
