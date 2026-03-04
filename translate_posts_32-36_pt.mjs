import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const translations = {
  'post-32': {
    slug_en: 'murder-mystery-party-for-graduation-celebrations-academic-achievement-mysteries-with-educational-excellence',
    slug_pt: 'festa-de-assassinato-misterioso-para-formaturas-misterios-de-conquistas-academicas-com-excelencia-educacional',
    title: 'Festa de Assassinato Misterioso para Formaturas: Mistérios de Conquistas Acadêmicas com Excelência Educacional',
    meta_description: 'Forme-se em mistério com festas de assassinato que celebram conquistas acadêmicas, marcos educacionais e sucesso futuro.'
  },
  'post-33': {
    slug_en: 'murder-mystery-party-for-holiday-gatherings-festive-fun-meets-family-intrigue',
    slug_pt: 'festa-de-assassinato-misterioso-para-reunioes-de-ferias-diversao-festiva-encontra-intriga-familiar',
    title: 'Festa de Assassinato Misterioso para Reuniões de Férias: Diversão Festiva Encontra Intriga Familiar',
    meta_description: 'Celebre feriados com festas de assassinato temáticas que reúnem famílias para diversão festiva e intriga.'
  },
  'post-34': {
    slug_en: 'murder-mystery-party-for-office-teams-build-bonds-through-collaborative-investigation',
    slug_pt: 'festa-de-assassinato-misterioso-para-equipes-de-escritorio-construa-lacos-atraves-de-investigacao-colaborativa',
    title: 'Festa de Assassinato Misterioso para Equipes de Escritório: Construa Laços Através de Investigação Colaborativa',
    meta_description: 'Construa relacionamentos mais fortes no trabalho com experiências colaborativas de mistério de assassinato que incentivam trabalho em equipe.'
  },
  'post-35': {
    slug_en: 'murder-mystery-party-for-small-groups-ideas',
    slug_pt: 'ideias-de-festa-de-assassinato-misterioso-para-grupos-pequenos',
    title: 'Ideias de Festa de Assassinato Misterioso para Grupos Pequenos',
    meta_description: 'Organize um mistério de assassinato íntimo perfeito para 4-8 convidados com histórias personalizadas que criam máximo engajamento e suspense.'
  },
  'post-36': {
    slug_en: 'murder-mystery-party-for-teenagers-guide',
    slug_pt: 'guia-de-festa-de-assassinato-misterioso-para-adolescentes',
    title: 'Guia de Festa de Assassinato Misterioso para Adolescentes',
    meta_description: 'Crie festas de assassinato apropriadas para adolescentes com enredos envolventes e personagens relacionáveis que eles vão adorar.'
  }
};

async function translatePost(postNum, translation) {
  console.log(`\n=== TRANSLATING POST ${postNum} ===`);
  
  // Read English post
  const englishData = JSON.parse(
    fs.readFileSync(`/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/post-${postNum}-en.json`, 'utf8')
  );
  
  console.log(`English title: ${englishData.title}`);
  console.log(`Portuguese slug: ${translation.slug_pt}`);
  
  // Check if Portuguese version exists
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', translation.slug_pt)
    .eq('language', 'pt')
    .single();
  
  if (existing) {
    console.log(`⚠️  Portuguese version already exists for post ${postNum}`);
    return { postNum, status: 'exists', slug: translation.slug_pt };
  }
  
  // Save translation info for manual translation
  console.log(`📝 Ready to translate post ${postNum}`);
  console.log(`Title: ${translation.title}`);
  console.log(`Slug: ${translation.slug_pt}`);
  
  return { 
    postNum, 
    status: 'ready', 
    slug: translation.slug_pt,
    title: translation.title,
    englishContent: englishData.content
  };
}

async function processAll() {
  const results = [];
  
  for (const [key, translation] of Object.entries(translations)) {
    const postNum = key.replace('post-', '');
    const result = await translatePost(postNum, translation);
    results.push(result);
  }
  
  console.log('\n\n=== SUMMARY ===');
  for (const result of results) {
    console.log(`Post ${result.postNum}: ${result.status} - ${result.slug}`);
  }
  
  fs.writeFileSync(
    '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/translation-status-32-36.json',
    JSON.stringify(results, null, 2)
  );
}

processAll();
