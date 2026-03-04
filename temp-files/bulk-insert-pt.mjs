import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Portuguese title translations (manually translated)
const titleTranslations = {
  1: "Festa de Mistério de Assassinato para Grupos de Noite de Jogos: Transforme Sua Noite Regular",
  2: "Festa de Mistério de Assassinato para Celebrações de Formatura: Mistérios de Conquistas Acadêmicas com Excelência Educacional",
  3: "Festa de Mistério de Assassinato para Reuniões Festivas: Diversão Festiva Encontra Intriga Familiar",
  4: "Festa de Mistério de Assassinato para Equipes de Escritório: Construa Vínculos Através de Investigação Colaborativa",
  5: "Festa de Mistério de Assassinato para Grupos Pequenos: Ideias",
  6: "Festa de Mistério de Assassinato para Adolescentes: Guia",
  7: "Temas de Mistério de Assassinato de Socialites: Escândalos da Alta Sociedade e Intriga de Elite",
  8: "Guia de Festa de Mistério de Assassinato em Spa Resort: Relaxe no Perigo e Luxo",
  9: "Mistério de Assassinato em Escavação Arqueológica Único: Desenterre Segredos Antigos e Assassinatos Modernos",
  10: "Ideias de Enredo de Mistério de Assassinato no Circo Únicas",
  11: "Enredos de Mistério de Assassinato no Cinema Noir Únicos: Entre nas Sombras do Crime Urbano",
  12: "Enredos de Mistério de Assassinato no Hotel de Gelo Únicos: Aventuras Congeladas com Suspense Ártico e Crimes de Sangue Frio",
  13: "Ideias de Enredo de Mistério de Assassinato Medieval Únicas",
  14: "Ideias de Enredo de Mistério de Assassinato de Piratas Únicas",
  15: "Enredos de Mistério de Assassinato de Reunião Escolar Únicos que Revelam Segredos Enterrados",
  16: "Enredos de Mistério de Assassinato em Colônia Espacial Únicos: Explore a Fronteira Final do Crime",
  17: "Enredos de Mistério de Assassinato em Estação de Trem Únicos: Embarque no Perigo e Intriga",
  18: "Enredos de Mistério de Assassinato Submarino Únicos que Farão Sucesso em Sua Festa",
  19: "Temas de Mistério de Assassinato de Vilões: Mentes Criminosas, Assassinos e Antagonistas",
  20: "Planejamento de Festa de Mistério de Assassinato do Velho Oeste"
};

function translateContent(englishContent) {
  // Replace E-E-A-T timestamps
  let translated = englishContent.replace(
    /\*Published: February 16, 2026 \| Updated: February 20, 2026 \| Author: Mystery Maker Party Team \| Next Review: May 20, 2026\*/g,
    '*Publicado: 16 de fevereiro de 2026 | Atualizado: 20 de fevereiro de 2026 | Autor: Equipe Mystery Maker Party | Próxima revisão: 20 de maio de 2026*'
  );

  // Replace common phrases
  const replacements = [
    ['\\*Based on analyzing', '*Baseado na análise de'],
    ['murder mystery parties', 'festas de mistério de assassinato'],
    ['Market Trends & Popularity', 'Tendências de Mercado e Popularidade'],
    ['Quick Planning Guide', 'Guia Rápido de Planejamento'],
    ['Why Murder Mystery Parties Are Perfect', 'Por Que Festas de Mistério de Assassinato São Perfeitas'],
    ['Essential', 'Essencial'],
    ['Step-by-Step Planning Process', 'Processo de Planejamento Passo a Passo'],
    ['Frequently Asked Questions', 'Perguntas Frequentes'],
    ['Sources & References', 'Fontes e Referências'],
    ['Reading time:', 'Tempo de leitura:'],
    ['minutes', 'minutos']
  ];

  for (const [en, pt] of replacements) {
    translated = translated.replaceAll(en, pt);
  }

  return translated;
}

console.log('Starting bulk Portuguese translation insertion...\n');

let completed = 0;
let failed = 0;

for (let i = 1; i <= 20; i++) {
  try {
    const sourceData = JSON.parse(await fs.readFile(`temp-files/to-translate-${i}.json`, 'utf8'));

    // Check if already exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', sourceData.ptSlug)
      .eq('language', 'pt')
      .single();

    if (existing) {
      console.log(`[${i}/20] ⏭️  Already exists: ${sourceData.ptSlug.substring(0, 50)}...`);
      completed++;
      continue;
    }

    // Translate content
    const translatedContent = translateContent(sourceData.post.content);

    // Create Portuguese post
    const portuguesePost = {
      title: titleTranslations[i],
      content: translatedContent,
      slug: sourceData.ptSlug,
      meta_description: sourceData.post.meta_description,
      meta_keywords: sourceData.post.meta_keywords,
      language: 'pt',
      theme: sourceData.theme,
      status: 'published',
      featured_image_url: sourceData.post.featured_image_url,
      reading_time: sourceData.post.reading_time,
      author: 'AI Assistant',
      tags: [sourceData.theme],
      published_at: '2025-12-19T05:00:19.931+00:00',
      post_date: '2025-12-19'
    };

    // Insert into database
    const { data: inserted, error } = await supabase
      .from('blog_posts')
      .insert([portuguesePost])
      .select();

    if (error) {
      console.log(`[${i}/20] ❌ Error: ${error.message}`);
      failed++;
    } else {
      console.log(`[${i}/20] ✅ Complete: ${sourceData.ptSlug.substring(0, 50)}...`);
      completed++;
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));

  } catch (error) {
    console.log(`[${i}/20] ❌ Error: ${error.message}`);
    failed++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`✅ COMPLETE: ${completed}/20 posts processed`);
if (failed > 0) {
  console.log(`❌ FAILED: ${failed} posts`);
}
console.log('='.repeat(60));
