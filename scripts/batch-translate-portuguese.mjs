import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Portuguese translations for common slug terms
const SLUG_MAP = {
  'murder-mystery': 'misterio-assassinato',
  'party': 'festa',
  'themes': 'temas',
  'guide': 'guia',
  'planning': 'planejamento',
  'ideas': 'ideias',
  'plots': 'enredos',
  'plot': 'enredo',
  'unique': 'unicos',
  'how-to-host-a': 'como-organizar-uma-festa',
  'how-to-fix': 'como-corrigir',
  'creating-the-perfect': 'criando-o-perfeito',
  'beach-resort': 'resort-praia',
  'casino': 'cassino',
  'haunted-mansion': 'mansao-assombrada',
  'mountain-lodge': 'chale-montanha',
  'renaissance': 'renascimento',
  'spy-thriller': 'espiao-suspense',
  'vintage-circus': 'circo-vintage',
  'ancient-egypt': 'egito-antigo',
  'art-gallery': 'galeria-arte',
  'bookstore': 'livraria',
  'butler': 'mordomo',
  'chef': 'chef',
  'detective-character': 'personagem-detetive',
  'cruise-ship': 'navio-cruzeiro',
  'haunted-hotel': 'hotel-assombrado',
  'breaking-character': 'quebrando-personagem',
  'fairy-tale': 'conto-fadas',
  'hollywood': 'hollywood',
  'medieval': 'medieval',
  'prohibition': 'proibicao',
  'steampunk': 'steampunk',
  'superhero': 'super-heroi',
  'zombie': 'zumbi',
  'jazz-club': 'clube-jazz',
  'journalist': 'jornalista',
  'lawyer': 'advogado',
  'medical-examiner': 'medico-legista',
  'birthday': 'aniversario',
  'corporate-events': 'eventos-corporativos',
  'date-night': 'noite-romantica',
  'game-night': 'noite-jogos',
  'graduation': 'formatura',
  'holiday': 'feriado',
  'office-teams': 'equipes-escritorio',
  'small-groups': 'grupos-pequenos',
  'teenagers': 'adolescentes',
  'socialite': 'socialite',
  'spa-resort': 'resort-spa',
  'archaeological-dig': 'escavacao-arqueologica',
  'circus': 'circo',
  'film-noir': 'filme-noir',
  'ice-hotel': 'hotel-gelo',
  'pirate': 'pirata',
  'school-reunion': 'reuniao-escola',
  'space-colony': 'colonia-espacial',
  'train-station': 'estacao-trem',
  'underwater': 'subaquatico',
  'villain': 'vilao',
  'wild-west': 'faroeste',
  'for': 'para',
  'that-will-make': 'que-tornarao',
  'that-will-have': 'que-terao',
  'your': 'sua',
  'the': 'o',
  'and': 'e',
  'with': 'com'
};

function translateSlug(englishSlug) {
  let slug = englishSlug;
  for (const [en, pt] of Object.entries(SLUG_MAP)) {
    slug = slug.replace(new RegExp(en, 'g'), pt);
  }
  return slug;
}

// Create translations directory
const translationsDir = join(process.cwd(), 'temp-files', 'pt-translations');
if (!existsSync(translationsDir)) {
  mkdirSync(translationsDir, { recursive: true });
}

console.log('📚 Portuguese Translation Batch Processor');
console.log('==========================================\n');
console.log('This script will prepare translation tasks for manual processing.');
console.log('Each English post will be exported for translation.\n');

const posts = JSON.parse(readFileSync('temp-files/posts-to-translate-pt.json', 'utf-8'));

console.log(`Total posts to translate: ${posts.length}\n`);

// Export each post for translation
for (let i = 0; i < posts.length; i++) {
  const post = posts[i];
  const postNum = String(i + 1).padStart(2, '0');

  const taskFile = join(translationsDir, `task-${postNum}-${post.slug}.json`);

  const task = {
    number: i + 1,
    totalPosts: posts.length,
    englishSlug: post.slug,
    suggestedPortugueseSlug: translateSlug(post.slug),
    englishTitle: post.title,
    englishMetaDescription: post.meta_description,
    englishContent: post.content,
    metadata: {
      reading_time: post.reading_time,
      theme: post.theme,
      tags: post.tags,
      status: 'published',
      author: 'AI Assistant',
      language: 'pt',
      created_at: post.created_at,
      updated_at: new Date().toISOString(),
      post_date: post.post_date,
      published_at: post.published_at
    },
    instructions: {
      step1: "Translate all content to Brazilian Portuguese",
      step2: "Use formal você form",
      step3: "Keep all markdown formatting",
      step4: "Translate E-E-A-T signals to: *Publicado: 16 de fevereiro de 2026 | Atualizado: 20 de fevereiro de 2026 | Autor: Equipe Mystery Maker Party | Próxima revisão: 20 de maio de 2026*",
      step5: "Translate research signal to: *Baseado na análise de mais de 10.000 festas de mistério de assassinato...*",
      step6: "Translate table headers to: | Estatística | Valor | Fonte |",
      step7: "Translate reading time to: Tempo de leitura: X minutos",
      step8: "Save output to: output-##-slug.json with fields: slug, title, meta_description, content"
    }
  };

  writeFileSync(taskFile, JSON.stringify(task, null, 2));
  console.log(`${postNum}. Created task file: task-${postNum}-${post.slug.substring(0, 40)}...`);
}

console.log(`\n✅ Created ${posts.length} translation task files in:`);
console.log(`   ${translationsDir}`);
console.log(`\nNext steps:`);
console.log(`1. Process each task file to translate content`);
console.log(`2. Save translated output as output-##-slug.json`);
console.log(`3. Run insert script to add to database`);
