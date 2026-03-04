import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const content = readFileSync('temp-files/pt-post-1-translated.md', 'utf-8');

const portuguesePost = {
  slug: '5-temas-misterio-assassinato-resort-praia-que-tornarao-ferias-inesqueciveis',
  title: '5 Temas de Mistério de Assassinato em Resort de Praia que Tornarão suas Férias Inesquecíveis',
  content: content,
  meta_description: 'Aproveite sol e suspense com festas de mistério de assassinato tropicais com funcionários de resort e vilões de férias.',
  language: 'pt',
  theme: 'Beach/Tropical',
  status: 'published',
  reading_time: 14,
  author: 'AI Assistant',
  tags: ['Beach/Tropical'],
  created_at: '2025-12-08T05:00:21.309561+00:00',
  updated_at: new Date().toISOString(),
  post_date: '2025-12-08',
  published_at: '2025-12-08T05:00:20.414+00:00'
};

// Check if already exists
const { data: existing } = await supabase
  .from('blog_posts')
  .select('id')
  .eq('slug', portuguesePost.slug)
  .eq('language', 'pt')
  .single();

if (!existing) {
  const { data, error } = await supabase.from('blog_posts').insert(portuguesePost).select();
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log(`✅ Inserted: ${portuguesePost.slug}`);
  }
} else {
  console.log(`⊘ Skipped (exists): ${portuguesePost.slug}`);
}
