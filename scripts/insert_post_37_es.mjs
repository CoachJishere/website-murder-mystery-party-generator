import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function insertPost() {
  const content = await fs.readFile('/tmp/post_37_es_content.txt', 'utf-8');
  
  const spanishPost = {
    title: 'Temas de Misterio de Asesinato de Villanos: Cerebros, Asesinos Desesperados y Antagonistas Inesperados',
    slug: 'temas-misterio-asesinato-villanos-cerebros-asesinos-antagonistas',
    content: content,
    meta_description: 'Crea misterios de asesinato con personajes villanos convincentes desde cerebros calculadores hasta asesinos simpáticos. Genera antagonistas personalizados para cualquier tema de fiesta.',
    meta_keywords: 'misterio asesinato villanos, tema misterio antagonista, ideas villano misterio asesinato, escenarios villano convincente, villanos fiesta misterio, misterios centrados villano, misterio asesinato cerebro, tema asesino desesperado, misterio asesino inesperado',
    language: 'es',
    theme: 'Mystery Themes',
    status: 'published',
    reading_time: 13,
    author: 'AI Assistant',
    tags: ['Mystery Themes'],
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
    console.log('✅ Temas de Misterio de Asesinato de Villanos');
  }
}

insertPost();
