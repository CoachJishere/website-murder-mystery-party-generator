import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const posts = [
  {
    num: 32,
    slug_pt: 'festa-de-assassinato-misterioso-para-formaturas-misterios-de-conquistas-academicas-com-excelencia-educacional',
    title_pt: 'Festa de Assassinato Misterioso para Formaturas: Mistérios de Conquistas Acadêmicas com Excelência Educacional',
    meta_desc_pt: 'Forme-se em mistério com festas de assassinato que celebram conquistas acadêmicas, marcos educacionais e sucesso futuro.',
    theme: 'Graduation'
  },
  {
    num: 33,
    slug_pt: 'festa-de-assassinato-misterioso-para-reunioes-de-ferias-diversao-festiva-encontra-intriga-familiar',
    title_pt: 'Festa de Assassinato Misterioso para Reuniões de Férias: Diversão Festiva Encontra Intriga Familiar',
    meta_desc_pt: 'Celebre feriados com festas de assassinato temáticas que reúnem famílias para diversão festiva e intriga.',
    theme: 'Holiday'
  },
  {
    num: 34,
    slug_pt: 'festa-de-assassinato-misterioso-para-equipes-de-escritorio-construa-lacos-atraves-de-investigacao-colaborativa',
    title_pt: 'Festa de Assassinato Misterioso para Equipes de Escritório: Construa Laços Através de Investigação Colaborativa',
    meta_desc_pt: 'Construa relacionamentos mais fortes no trabalho com experiências colaborativas de mistério de assassinato que incentivam trabalho em equipe.',
    theme: 'Office/Corporate'
  },
  {
    num: 35,
    slug_pt: 'ideias-de-festa-de-assassinato-misterioso-para-grupos-pequenos',
    title_pt: 'Ideias de Festa de Assassinato Misterioso para Grupos Pequenos',
    meta_desc_pt: 'Organize um mistério de assassinato íntimo perfeito para 4-8 convidados com histórias personalizadas que criam máximo engajamento e suspense.',
    theme: 'Small Groups'
  },
  {
    num: 36,
    slug_pt: 'guia-de-festa-de-assassinato-misterioso-para-adolescentes',
    title_pt: 'Guia de Festa de Assassinato Misterioso para Adolescentes',
    meta_desc_pt: 'Crie festas de assassinato apropriadas para adolescentes com enredos envolventes e personagens relacionáveis que eles vão adorar.',
    theme: 'Teenagers'
  }
];

async function translateContent(englishContent, postNum) {
  console.log(`\nTranslating post ${postNum} content...`);
  
  const prompt = `Translate this complete blog post to Brazilian Portuguese.

CRITICAL REQUIREMENTS:
1. Use formal "você" (not "tu")
2. Include ALL proper Portuguese accents (á, é, í, ó, ú, â, ê, ô, ã, õ, ç)
3. Maintain ALL markdown formatting, tables, and structure
4. Keep ALL URLs and links unchanged
5. Translate the E-E-A-T line to: "*Publicado: 16 de fevereiro de 2026 | Atualizado: 20 de fevereiro de 2026 | Autor: Equipe Mystery Maker Party | Próxima revisão: 20 de maio de 2026*"
6. Translate "Reading time: X minutes" to "*Tempo de leitura: X minutos*"
7. Keep statistical tables but translate headers and labels
8. Maintain ALL quotes but add "(Tradução livre)" after translated quotes
9. Adapt cultural references naturally to Brazilian context when appropriate
10. Keep section headers and structure identical

Translate completely and accurately:

${englishContent}`;

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  return message.content[0].text;
}

async function processPost(post) {
  console.log(`\n========================================`);
  console.log(`PROCESSING POST ${post.num}: ${post.title_pt}`);
  console.log(`========================================`);
  
  // Check if already exists
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', post.slug_pt)
    .eq('language', 'pt')
    .single();
  
  if (existing) {
    console.log(`✓ Post ${post.num} already exists in database`);
    return { postNum: post.num, status: 'exists', slug: post.slug_pt };
  }
  
  // Read English content
  const englishData = JSON.parse(
    fs.readFileSync(`/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/post-${post.num}-en.json`, 'utf8')
  );
  
  console.log(`Translating ${englishData.content.length} characters...`);
  
  // Translate content
  const translatedContent = await translateContent(englishData.content, post.num);
  
  console.log(`Translation complete! ${translatedContent.length} characters`);
  
  // Insert into database
  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      title: post.title_pt,
      content: translatedContent,
      slug: post.slug_pt,
      meta_description: post.meta_desc_pt,
      language: 'pt',
      theme: post.theme,
      status: 'published',
      reading_time: englishData.reading_time,
      author: 'AI Assistant',
      tags: englishData.tags,
      published_at: englishData.published_at,
      post_date: englishData.post_date
    })
    .select()
    .single();
  
  if (error) {
    console.error(`❌ Error inserting post ${post.num}:`, error);
    return { postNum: post.num, status: 'error', error: error.message };
  }
  
  console.log(`✓ Successfully inserted post ${post.num} into database!`);
  console.log(`  ID: ${data.id}`);
  console.log(`  Slug: ${data.slug}`);
  
  // Save translation for reference
  fs.writeFileSync(
    `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/post-${post.num}-pt.json`,
    JSON.stringify(data, null, 2)
  );
  
  return { 
    postNum: post.num, 
    status: 'success', 
    slug: post.slug_pt,
    id: data.id
  };
}

async function processAll() {
  console.log('Starting translation of posts 32-36 to Portuguese...\n');
  
  const results = [];
  
  for (const post of posts) {
    try {
      const result = await processPost(post);
      results.push(result);
      
      // Wait 2 seconds between posts to avoid rate limits
      if (post.num < 36) {
        console.log('\nWaiting 2 seconds before next translation...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`❌ Fatal error processing post ${post.num}:`, error);
      results.push({ postNum: post.num, status: 'fatal_error', error: error.message });
    }
  }
  
  console.log('\n\n========================================');
  console.log('FINAL SUMMARY');
  console.log('========================================\n');
  
  for (const result of results) {
    const statusEmoji = result.status === 'success' ? '✓' : 
                       result.status === 'exists' ? '○' : '✗';
    console.log(`${statusEmoji} Post ${result.postNum}: ${result.status.toUpperCase()}`);
    if (result.slug) console.log(`   Slug: ${result.slug}`);
    if (result.id) console.log(`   ID: ${result.id}`);
    if (result.error) console.log(`   Error: ${result.error}`);
  }
  
  const successCount = results.filter(r => r.status === 'success').length;
  const existsCount = results.filter(r => r.status === 'exists').length;
  const errorCount = results.filter(r => r.status === 'error' || r.status === 'fatal_error').length;
  
  console.log(`\nTotal: ${successCount} translated, ${existsCount} already existed, ${errorCount} errors`);
  
  fs.writeFileSync(
    '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/translation-results-32-36.json',
    JSON.stringify(results, null, 2)
  );
}

processAll().catch(console.error);
