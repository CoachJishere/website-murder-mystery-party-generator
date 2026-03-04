import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Fetch all optimized English posts
const { data: posts, error: fetchError } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('language', 'en')
  .gte('updated_at', '2026-02-20T00:00:00')
  .order('slug');

if (fetchError) {
  console.error('Error fetching posts:', fetchError);
  process.exit(1);
}

const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));
console.log(`\n📊 Total optimized posts found: ${optimized.length}\n`);

// Translation helper - Full Portuguese translation
async function translateToPortuguese(englishContent, englishTitle, englishMetaDescription, englishSlug) {
  // This is a comprehensive translation function
  // We'll translate the complete content maintaining all formatting

  // Common translations
  const translations = {
    'Published: February 16, 2026': 'Publicado: 16 de fevereiro de 2026',
    'Updated: February 20, 2026': 'Atualizado: 20 de fevereiro de 2026',
    'Author: Mystery Maker Party Team': 'Autor: Equipe Mystery Maker Party',
    'Next Review: May 20, 2026': 'Próxima revisão: 20 de maio de 2026',
    'Reading time:': 'Tempo de leitura:',
    'minutes': 'minutos',
    'Based on analysis of over 10,000 murder mystery parties': 'Baseado na análise de mais de 10.000 festas de mistério de assassinato',
    'Table of Contents': 'Índice',
    'Quick Answer': 'Resposta Rápida',
    'Key Takeaways': 'Pontos-Chave',
    'Essential Elements': 'Elementos Essenciais',
    'Planning Tips': 'Dicas de Planejamento',
    'Frequently Asked Questions': 'Perguntas Frequentes',
    'Sources and References': 'Fontes e Referências',
    'Related Articles': 'Artigos Relacionados',
    'Statistic': 'Estatística',
    'Value': 'Valor',
    'Source': 'Fonte',
    'Internal data': 'Dados internos',
    'Party planning research': 'Pesquisa de planejamento de festas',
    'Event industry analysis': 'Análise da indústria de eventos',
    'Customer surveys': 'Pesquisas com clientes',
    'Mystery party database': 'Banco de dados de festas mistério'
  };

  // We'll do a more sophisticated translation
  // For now, return a structure that indicates full translation is needed
  return {
    needsManualTranslation: true,
    englishContent,
    englishTitle,
    englishMetaDescription,
    englishSlug
  };
}

// Process batches 4-10
const batches = [
  { num: 4, start: 15, end: 20, posts: [] },
  { num: 5, start: 20, end: 25, posts: [] },
  { num: 6, start: 25, end: 30, posts: [] },
  { num: 7, start: 30, end: 35, posts: [] },
  { num: 8, start: 35, end: 40, posts: [] },
  { num: 9, start: 40, end: 45, posts: [] },
  { num: 10, start: 45, end: 47, posts: [] }
];

let totalTranslated = 0;
let totalSkipped = 0;
const errors = [];

for (const batch of batches) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`BATCH ${batch.num}: Posts ${batch.start + 1}-${batch.end}`);
  console.log('='.repeat(60));

  const batchPosts = optimized.slice(batch.start, batch.end);

  for (let i = 0; i < batchPosts.length; i++) {
    const post = batchPosts[i];
    const postNum = batch.start + i + 1;

    console.log(`\n[${postNum}/${optimized.length}] Processing: ${post.slug}`);

    try {
      // Export post for manual translation
      console.log(`   English Title: ${post.title}`);
      console.log(`   English Slug: ${post.slug}`);
      console.log(`   Content length: ${post.content.length} chars`);
      console.log(`   ⚠️  NEEDS MANUAL TRANSLATION`);

      // Save to file for translation
      const exportData = {
        batch: batch.num,
        postNumber: postNum,
        slug: post.slug,
        title: post.title,
        meta_description: post.meta_description,
        content: post.content,
        reading_time: post.reading_time,
        theme: post.theme,
        tags: post.tags,
        created_at: post.created_at,
        post_date: post.post_date,
        published_at: post.published_at
      };

      batch.posts.push(exportData);

    } catch (error) {
      console.error(`   ❌ Error processing: ${error.message}`);
      errors.push({ batch: batch.num, post: postNum, slug: post.slug, error: error.message });
    }
  }
}

// Export all posts for translation
const fs = await import('fs');
await fs.promises.writeFile(
  '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/portuguese-batches-4-10-to-translate.json',
  JSON.stringify(batches, null, 2)
);

console.log(`\n${'='.repeat(60)}`);
console.log('EXPORT COMPLETE');
console.log('='.repeat(60));
console.log(`📁 Exported to: temp-files/portuguese-batches-4-10-to-translate.json`);
console.log(`📊 Total posts to translate: 32`);
console.log(`📦 Batches: 7 (Batch 4-10)`);
console.log(`\n⚠️  Next step: Use AI to translate each post's content to Brazilian Portuguese`);
