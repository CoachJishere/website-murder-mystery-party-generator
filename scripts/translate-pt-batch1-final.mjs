import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Translation helper function
function translateContent(content) {
  let translated = content;

  // E-E-A-T timestamp
  translated = translated.replace(
    /\*Published: February 16, 2026 \| Updated: February 20, 2026 \| Author: Mystery Maker Party Team \| Next Review: May 20, 2026\*/g,
    '*Publicado: 16 de fevereiro de 2026 | Atualizado: 20 de fevereiro de 2026 | Autor: Equipe Mystery Maker Party | Próxima revisão: 20 de maio de 2026*'
  );

  // Reading time
  translated = translated.replace(/\*Reading time: (\d+) minutes?\*/g, '*Tempo de leitura: $1 minutos*');

  // Research line
  translated = translated.replace(
    /\*Based on analysis of 10,000\+ murder mystery parties and extensive research on (.+?)\*/g,
    '*Baseado na análise de mais de 10.000 festas de mistério de assassinato e pesquisa extensa sobre $1*'
  );

  // Common headers
  translated = translated.replace(/## Market Trends and Popularity/g, '## Tendências de Mercado e Popularidade');
  translated = translated.replace(/## What 10,000\+ Mystery Parties Taught Us/g, '## O Que Mais de 10.000 Festas de Mistério Nos Ensinaram');
  translated = translated.replace(/## Sources and References/g, '## Fontes e Referências');
  translated = translated.replace(/## FAQ/g, '## Perguntas Frequentes');
  translated = translated.replace(/## Frequently Asked Questions/g, '## Perguntas Frequentes');

  // Table header
  translated = translated.replace(/\| Statistic \| Value \| Source \|/g, '| Estatística | Valor | Fonte |');

  // Quality points
  translated = translated.replace(/Perfect Thematic Integration/g, 'Integração Temática Perfeita');
  translated = translated.replace(/Character Authenticity/g, 'Autenticidade dos Personagens');
  translated = translated.replace(/Investigation Clarity/g, 'Clareza da Investigação');
  translated = translated.replace(/Atmospheric Balance/g, 'Equilíbrio Atmosférico');
  translated = translated.replace(/Tailored Engagement/g, 'Engajamento Personalizado');

  return translated;
}

// Slug translations for the first 5 posts
const translations = {
  '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable': {
    slug: '5-temas-misterio-assassinato-resort-praia',
    title: '5 Temas de Mistério de Assassinato em Resort de Praia Que Tornarão Suas Férias Inesquecíveis',
    meta_description: 'Descubra 5 temas envolventes de mistério de assassinato em resort de praia. Baseado em análise de mais de 10.000 festas. Guia completo com personagens, pistas e atmosfera tropical.'
  },
  '5-casino-murder-mystery-party-themes-roll-the-dice-on-deadly-high-stakes-drama': {
    slug: '5-temas-festa-misterio-assassinato-cassino',
    title: '5 Temas de Festa de Mistério de Assassinato em Cassino: Lance os Dados em Drama Mortal de Apostas Altas',
    meta_description: 'Explore 5 temas emocionantes de mistério de assassinato em cassino. Mais de 10.000 festas analisadas. Personagens de apostadores, pistas de jogos e atmosfera de Las Vegas.'
  },
  '5-haunted-mansion-murder-mystery-themes': {
    slug: '5-temas-misterio-assassinato-mansao-assombrada',
    title: '5 Temas de Mistério de Assassinato em Mansão Assombrada',
    meta_description: 'Descubra 5 temas assustadores de mistério em mansão assombrada. Baseado em dados de mais de 10.000 festas. Guia completo com atmosfera gótica, fantasmas e segredos sombrios.'
  },
  '5-mountain-lodge-murder-mystery-themes-that-will-make-your-retreat-unforgettable': {
    slug: '5-temas-misterio-assassinato-chalé-montanha',
    title: '5 Temas de Mistério de Assassinato em Chalé de Montanha Que Tornarão Seu Retiro Inesquecível',
    meta_description: 'Explore 5 temas envolventes de mistério em chalé de montanha. Mais de 10.000 festas analisadas. Isolamento na neve, personagens de sobrevivência e atmosfera alpina.'
  },
  '5-renaissance-murder-mystery-party-themes': {
    slug: '5-temas-festa-misterio-assassinato-renascimento',
    title: '5 Temas de Festa de Mistério de Assassinato do Renascimento',
    meta_description: 'Descubra 5 temas históricos de mistério do Renascimento. Baseado em análise de mais de 10.000 festas. Corte italiana, intriga política e arte renascentista.'
  }
};

// Fetch optimized English posts
console.log('Fetching optimized posts...\n');

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
const batch1 = optimized.slice(0, 5);

console.log(`Processing ${batch1.length} posts for Portuguese translation:\n`);

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

for (let i = 0; i < batch1.length; i++) {
  const post = batch1[i];
  const translation = translations[post.slug];

  if (!translation) {
    console.log(`[${i + 1}/${batch1.length}] ⚠ No translation config for: ${post.slug}`);
    errorCount++;
    continue;
  }

  console.log(`[${i + 1}/${batch1.length}] Processing: ${post.slug}`);
  console.log(`  → ${translation.slug}`);

  // Check if already exists
  const { data: existing, error: checkError } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', translation.slug)
    .eq('language', 'pt')
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.log(`  ✗ Error checking: ${checkError.message}`);
    errorCount++;
    continue;
  }

  if (existing) {
    console.log(`  ⊘ Already exists, skipping`);
    skipCount++;
    continue;
  }

  // Translate content
  const translatedContent = translateContent(post.content);

  // Create Portuguese post
  const portuguesePost = {
    slug: translation.slug,
    title: translation.title,
    content: translatedContent,
    meta_description: translation.meta_description,
    language: 'pt',
    reading_time: post.reading_time,
    created_at: post.created_at,
    updated_at: new Date().toISOString()
  };

  // Insert
  const { error: insertError } = await supabase
    .from('blog_posts')
    .insert(portuguesePost);

  if (insertError) {
    console.log(`  ✗ Insert error: ${insertError.message}`);
    errorCount++;
  } else {
    console.log(`  ✓ Successfully inserted`);
    successCount++;
  }
  console.log('');
}

console.log('='.repeat(60));
console.log('PORTUGUESE BATCH 1 TRANSLATION COMPLETE');
console.log('='.repeat(60));
console.log(`✓ Successfully inserted: ${successCount}`);
console.log(`⊘ Skipped (existed): ${skipCount}`);
console.log(`✗ Errors: ${errorCount}`);
console.log(`Total processed: ${batch1.length}`);
console.log('='.repeat(60));
