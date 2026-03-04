import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Load the English posts
const posts = JSON.parse(fs.readFileSync('temp-files/batch3-posts.json', 'utf-8'));

const translations = [
  // POST 11: butler-murder-mystery-themes-manor-murders-household-secrets
  {
    slug: 'temas-misterio-assassinato-mordomo-crimes-mansao-segredos-domesticos',
    title: 'Temas de Mistério de Assassinato com Mordomo: Crimes na Mansão e Segredos Domésticos',
    meta_description: 'Crie mistérios de assassinato centrados em mordomos com crimes na mansão, segredos domésticos e investigações da criadagem. Guia completo com cenários de mordomos, personagens e dinâmicas de classe.'
  },
  // POST 12: chef-murder-mystery-themes-culinary-crimes-kitchen-secrets
  {
    slug: 'temas-misterio-assassinato-chef-crimes-culinarios-segredos-cozinha',
    title: 'Temas de Mistério de Assassinato com Chef: Crimes Culinários e Segredos da Cozinha',
    meta_description: 'Crie mistérios de assassinato com tema culinário com crimes de chefs, rivalidades na cozinha e intrigas gastronômicas. Guia completo com cenários de chefs, personagens e locações.'
  },
  // POST 13: creating-the-perfect-detective-character-guide
  {
    slug: 'guia-criar-personagem-detetive-perfeito-projetar-investigadores-convincentes-festa-misterio-assassinato-personalizada',
    title: 'Guia para Criar o Personagem Detetive Perfeito: Projete Investigadores Convincentes para Sua Festa de Mistério de Assassinato Personalizada',
    meta_description: 'Domine o design de personagens detetives para festas de mistério de assassinato. Crie investigadores memoráveis com características únicas, históricos convincentes e habilidades envolventes.'
  },
  // POST 14: cruise-ship-murder-mystery-party-guide
  {
    slug: 'guia-festa-misterio-assassinato-navio-cruzeiro-navegue-para-assassinato-alto-mar',
    title: 'Guia de Festa de Mistério de Assassinato em Navio de Cruzeiro: Navegue para o Assassinato no Alto-Mar',
    meta_description: 'Organize uma festa de mistério de assassinato em navio de cruzeiro com este guia completo. Inclui enredos náuticos, personagens marítimos, locações no navio e ideias temáticas.'
  },
  // POST 15: haunted-hotel-murder-mystery-party-guide
  {
    slug: 'guia-festa-misterio-assassinato-hotel-assombrado-check-in-terror-suspense',
    title: 'Guia de Festa de Mistério de Assassinato em Hotel Assombrado: Faça Check-in no Terror e Suspense',
    meta_description: 'Organize uma festa de mistério de assassinato em hotel assombrado com este guia completo. Inclui enredos sobrenaturais, personagens fantasmagóricos, locações assustadoras e ideias temáticas.'
  }
];

console.log('Starting Portuguese translations for Batch 3 (Posts 11-15)...\n');

let successCount = 0;
let skipCount = 0;

for (let i = 0; i < posts.length; i++) {
  const post = posts[i];
  const translation = translations[i];

  console.log(`\n[${i + 11}/15] Translating: ${post.slug}`);
  console.log(`Portuguese slug: ${translation.slug}`);

  // Check if already exists
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', translation.slug)
    .eq('language', 'pt')
    .single();

  if (existing) {
    console.log(`⊘ Already exists - skipping`);
    skipCount++;
    continue;
  }

  // Translate content (will be provided in next step)
  const translatedContent = `PLACEHOLDER - Translation ${i + 1}`;

  const portuguesePost = {
    slug: translation.slug,
    title: translation.title,
    content: translatedContent,
    meta_description: translation.meta_description,
    language: 'pt',
    reading_time: post.reading_time,
    theme: post.theme,
    status: 'published',
    author: 'AI Assistant',
    tags: post.tags,
    created_at: post.created_at,
    updated_at: new Date().toISOString(),
    post_date: post.post_date,
    published_at: post.published_at
  };

  // Will insert after content is ready
  console.log(`Ready for translation: ${translation.title}`);
}

console.log(`\n✓ Processed ${posts.length} posts`);
console.log(`Success: ${successCount}, Skipped: ${skipCount}`);
