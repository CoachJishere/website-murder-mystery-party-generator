import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const content = readFileSync('temp-files/pt-post-2-translated.md', 'utf-8');

const portuguesePost = {
  slug: '5-temas-festa-misterio-assassinato-cassino-role-dados-drama-mortal-altas-apostas',
  title: '5 Temas de Festa de Mistério de Assassinato em Cassino: Role os Dados no Drama Mortal de Altas Apostas',
  content: content,
  meta_description: 'Role os dados no perigo com festas de mistério de assassinato em cassino de altas apostas com jogadores, dealers e apostas mortais.',
  language: 'pt',
  theme: 'Casino/Vegas',
  status: 'published',
  reading_time: 14,
  author: 'AI Assistant',
  tags: ['Casino/Vegas'],
  created_at: '2025-12-08T05:00:21.309561+00:00',
  updated_at: new Date().toISOString(),
  post_date: '2025-12-08',
  published_at: '2025-12-08T05:00:20.414+00:00'
};

const { data: existing } = await supabase
  .from('blog_posts')
  .select('id')
  .eq('slug', portuguesePost.slug)
  .eq('language', 'pt')
  .single();

if (!existing) {
  const { error } = await supabase.from('blog_posts').insert(portuguesePost);
  if (error) console.error('❌ Error:', error);
  else console.log(`✅ Inserted: ${portuguesePost.slug}`);
} else {
  console.log(`⊘ Skipped (exists): ${portuguesePost.slug}`);
}
