import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function insertPost() {
  const content = await fs.readFile('/tmp/post_39_es_content.txt', 'utf-8');
  
  const spanishPost = {
    title: 'Cómo Arreglar Pistas Confusas de Asesinato Misterioso',
    slug: 'como-arreglar-pistas-confusas-asesinato-misterioso',
    content: content,
    meta_description: 'Resuelve el acertijo de crear pistas claras y lógicas que guíen a invitados a conclusiones satisfactorias en tu misterio personalizado.',
    meta_keywords: 'arreglar pistas misterio, pistas claras asesinato misterioso, diseño pistas lógicas, evidencia misterio confusa, mejorar pistas investigación, pistas colaborativas misterio, pistas efectivas detective, solución problemas pistas',
    language: 'es',
    theme: 'Planning Tips',
    status: 'published',
    reading_time: 12,
    author: 'AI Assistant',
    tags: ['Planning Tips'],
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
    console.log('✅ Cómo Arreglar Pistas Confusas de Asesinato Misterioso');
  }
}

insertPost();
