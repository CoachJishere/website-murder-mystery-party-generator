import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Load Portuguese translations from external files
const translations = {
  'victorian-murder-mystery': {
    slug: 'misterio-assassinato-vitoriano',
    title: 'Festas de Mistério de Assassinato Vitorianas: Guia Completo para Criar uma Experiência Autêntica',
    meta_description: 'Aprenda a organizar a festa de mistério de assassinato vitoriana perfeita. Baseado em dados de mais de 10.000 festas. Guia de especialistas sobre personagens, pistas, atmosfera e engajamento.',
    file: 'pt-victorian.md'
  },
  'film-noir-murder-mystery': {
    slug: 'misterio-assassinato-filme-noir',
    title: 'Festas de Mistério de Assassinato Estilo Filme Noir: Guia Definitivo de 1940 para Anfitriões',
    meta_description: 'Domine festas de mistério estilo film noir com nosso guia baseado em dados. Mais de 10.000 festas analisadas. Personagens noir autênticos, atmosfera, iluminação e técnicas de investigação.',
    file: 'pt-filmnoir.md'
  },
  'ice-hotel-murder-mystery': {
    slug: 'misterio-assassinato-hotel-gelo',
    title: 'Festas de Mistério de Assassinato em Hotel de Gelo: Guia Completo de Cenário Único',
    meta_description: 'Crie uma festa de mistério em hotel de gelo inesquecível. Baseado em mais de 10.000 festas. Guia especializado sobre atmosfera, personagens, revelação de pistas em camadas e isolamento psicológico.',
    file: 'pt-icehotel.md'
  },
  'zombie-apocalypse-murder-mystery': {
    slug: 'misterio-assassinato-apocalipse-zumbi',
    title: 'Festas de Mistério de Assassinato Apocalipse Zumbi: Guia Completo de Sobrevivência e Mistério',
    meta_description: 'Domine festas de mistério de apocalipse zumbi com nosso guia baseado em dados. Mais de 10.000 festas analisadas. Mecânicas de sobrevivência, personagens, atmosfera e tensão psicológica.',
    file: 'pt-zombie.md'
  },
  'superhero-murder-mystery': {
    slug: 'misterio-assassinato-super-heroi',
    title: 'Festas de Mistério de Assassinato de Super-Heróis: Guia Completo de Poderes e Traição',
    meta_description: 'Crie a festa de mistério de super-heróis definitiva. Baseado em mais de 10.000 festas. Mecânicas de superpoderes, criação de personagens, investigação baseada em poderes e dinâmicas de equipe.',
    file: 'pt-superhero.md'
  }
};

// Fetch English posts
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

console.log(`Found ${batch1.length} posts to translate:\n`);
batch1.forEach((p, i) => console.log(`${i + 1}. ${p.slug}`));
console.log('\n');

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

for (let i = 0; i < batch1.length; i++) {
  const post = batch1[i];
  const translation = translations[post.slug];

  if (!translation) {
    console.log(`⚠ No translation config for: ${post.slug}`);
    errorCount++;
    continue;
  }

  console.log(`\n[${i + 1}/${batch1.length}] Processing: ${post.slug} -> ${translation.slug}`);

  // Check if already exists
  const { data: existing, error: checkError } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', translation.slug)
    .eq('language', 'pt')
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error(`Error checking existence: ${checkError.message}`);
    errorCount++;
    continue;
  }

  if (existing) {
    console.log(`⊘ Skipped (already exists): ${translation.slug}`);
    skipCount++;
    continue;
  }

  // Load content from file
  const contentPath = join(__dirname, 'pt-translations', translation.file);
  let content;
  try {
    content = readFileSync(contentPath, 'utf-8');
  } catch (err) {
    console.error(`✗ Error reading ${translation.file}:`, err.message);
    errorCount++;
    continue;
  }

  // Insert new translation
  const portuguesePost = {
    slug: translation.slug,
    title: translation.title,
    content: content,
    meta_description: translation.meta_description,
    language: 'pt',
    reading_time: post.reading_time,
    created_at: post.created_at,
    updated_at: new Date().toISOString()
  };

  const { error: insertError } = await supabase
    .from('blog_posts')
    .insert(portuguesePost);

  if (insertError) {
    console.error(`✗ Error inserting ${translation.slug}:`, insertError.message);
    errorCount++;
  } else {
    console.log(`✓ Successfully inserted: ${translation.slug}`);
    successCount++;
  }
}

console.log('\n' + '='.repeat(60));
console.log('PORTUGUESE BATCH 1 TRANSLATION COMPLETE');
console.log('='.repeat(60));
console.log(`✓ Successfully inserted: ${successCount}`);
console.log(`⊘ Skipped (existed): ${skipCount}`);
console.log(`✗ Errors: ${errorCount}`);
console.log(`Total processed: ${batch1.length}`);
console.log('='.repeat(60));
