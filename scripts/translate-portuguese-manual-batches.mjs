import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Slug translations
const slugTranslations = {
  'how-to-fix-guests-breaking-character-keep-your-murder-mystery-party-immersive': 'como-corrigir-convidados-quebrando-personagem-manter-festa-misterio-assassinato-imersiva',
  'how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime': 'como-organizar-festa-misterio-assassinato-conto-fadas-era-uma-vez-crime',
  'how-to-host-a-hollywood-murder-mystery-party': 'como-organizar-festa-misterio-assassinato-hollywood',
  'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue': 'como-organizar-festa-misterio-assassinato-castelo-medieval-governe-reino-intriga-real',
  'how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement': 'como-organizar-festa-misterio-assassinato-era-proibicao-contrabando-empolgacao',
  'how-to-host-a-steampunk-murder-mystery-party-gear-up-for-victorian-sci-fi-crime': 'como-organizar-festa-misterio-assassinato-steampunk-prepare-se-crime-sci-fi-vitoriano',
  'jazz-club-murder-mystery-party-planning-swing-into-prohibition-era-crime': 'planejamento-festa-misterio-assassinato-clube-jazz-swing-crime-era-proibicao',
  'journalist-murder-mystery-themes-investigative-reporters-deadly-stories': 'temas-misterio-assassinato-jornalista-reporteres-investigativos-historias-mortais',
  'lawyer-murder-mystery-themes-courtroom-drama-legal-intrigue': 'temas-misterio-assassinato-advogado-drama-tribunal-intriga-legal',
  'medical-examiner-murder-mystery-themes-forensic-investigations': 'temas-misterio-assassinato-medico-legista-investigacoes-forenses',
  'murder-mystery-party-for-birthday-celebrations-make-their-special-day-unforgettable': 'festa-misterio-assassinato-celebracoes-aniversario-torne-dia-especial-inesquecivel',
  'murder-mystery-party-for-corporate-events': 'festa-misterio-assassinato-eventos-corporativos',
  'murder-mystery-party-for-date-night-ideas-where-romance-meets-mystery': 'festa-misterio-assassinato-ideias-noite-romantica-romance-encontra-misterio',
  'murder-mystery-party-for-game-night-groups-transform-your-regular-game-night': 'festa-misterio-assassinato-grupos-noite-jogos-transforme-noite-jogos-regular',
  'murder-mystery-party-for-graduation-celebrations-academic-achievement-mysteries-with-educational-excellence': 'festa-misterio-assassinato-celebracoes-formatura-misterios-conquista-academica-excelencia-educacional',
  'murder-mystery-party-for-holiday-gatherings-festive-fun-meets-family-intrigue': 'festa-misterio-assassinato-reunioes-feriados-diversao-festiva-encontra-intriga-familiar',
  'murder-mystery-party-for-office-teams-build-bonds-through-collaborative-investigation': 'festa-misterio-assassinato-equipes-escritorio-construa-lacos-investigacao-colaborativa',
  'murder-mystery-party-for-small-groups-ideas': 'ideias-festa-misterio-assassinato-pequenos-grupos',
  'murder-mystery-party-for-teenagers-guide': 'guia-festa-misterio-assassinato-adolescentes',
  'socialite-murder-mystery-themes-high-society-scandals-elite-intrigue': 'temas-misterio-assassinato-socialite-escandalos-alta-sociedade-intriga-elite',
  'spa-resort-murder-mystery-party-guide-relax-into-danger-and-luxury': 'guia-festa-misterio-assassinato-spa-resort-relaxe-perigo-luxo',
  'unique-archaeological-dig-murder-mystery-unearth-ancient-secrets-and-modern-murders': 'misterio-assassinato-escavacao-arqueologica-unico-desenterre-segredos-antigos-assassinatos-modernos',
  'unique-circus-murder-mystery-plot-ideas': 'ideias-enredo-misterio-assassinato-circo-unico',
  'unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime': 'enredos-misterio-assassinato-filme-noir-unicos-entre-sombras-crime-urbano',
  'unique-medieval-murder-mystery-plot-ideas': 'ideias-enredo-misterio-assassinato-medieval-unico',
  'unique-pirate-murder-mystery-plot-ideas': 'ideias-enredo-misterio-assassinato-pirata-unico',
  'unique-school-reunion-murder-mystery-plots-that-uncover-buried-secrets': 'enredos-misterio-assassinato-reuniao-escola-unicos-descobrem-segredos-enterrados',
  'unique-space-colony-murder-mystery-plots-explore-the-final-frontier-of-crime': 'enredos-misterio-assassinato-colonia-espacial-unicos-explore-fronteira-final-crime',
  'unique-train-station-murder-mystery-plots-all-aboard-for-danger-and-intrigue': 'enredos-misterio-assassinato-estacao-trem-unicos-todos-bordo-perigo-intriga',
  'unique-underwater-murder-mystery-plots-that-will-make-a-splash-at-your-party': 'enredos-misterio-assassinato-subaquatico-unicos-farao-sucesso-festa',
  'villain-murder-mystery-themes-masterminds-killers-antagonists': 'temas-misterio-assassinato-vilao-mentores-assassinos-antagonistas',
  'wild-west-murder-mystery-party-planning': 'planejamento-festa-misterio-assassinato-velho-oeste'
};

async function exportPostsForTranslation() {
  // Fetch optimized posts
  const { data: posts, error: fetchError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('language', 'en')
    .gte('updated_at', '2026-02-20T00:00:00')
    .order('slug');

  if (fetchError) throw fetchError;

  const optimized = posts.filter(p => p.content.includes('*Published: February 16, 2026'));

  const batches = [
    { num: 4, start: 15, end: 20 },
    { num: 5, start: 20, end: 25 },
    { num: 6, start: 25, end: 30 },
    { num: 7, start: 30, end: 35 },
    { num: 8, start: 35, end: 40 },
    { num: 9, start: 40, end: 45 },
    { num: 10, start: 45, end: 47 }
  ];

  let postsToTranslate = [];

  for (const batch of batches) {
    const batchPosts = optimized.slice(batch.start, batch.end);

    for (let i = 0; i < batchPosts.length; i++) {
      const post = batchPosts[i];
      const portugueseSlug = slugTranslations[post.slug] || post.slug;

      // Check if already exists
      const { data: existing } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', portugueseSlug)
        .eq('language', 'pt')
        .single();

      if (!existing) {
        postsToTranslate.push({
          batch: batch.num,
          english_slug: post.slug,
          portuguese_slug: portugueseSlug,
          english_title: post.title,
          english_meta_description: post.meta_description,
          english_content: post.content,
          reading_time: post.reading_time,
          theme: post.theme,
          tags: post.tags,
          created_at: post.created_at,
          post_date: post.post_date,
          published_at: post.published_at
        });
      }
    }
  }

  // Export for translation
  await fs.writeFile(
    '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/posts-to-translate-pt.json',
    JSON.stringify(postsToTranslate, null, 2)
  );

  console.log(`\n📊 Posts needing translation: ${postsToTranslate.length}`);
  console.log(`📁 Exported to: temp-files/posts-to-translate-pt.json`);
  console.log(`\n${postsToTranslate.map((p, i) => `${i + 1}. Batch ${p.batch}: ${p.english_slug}`).join('\n')}`);
}

exportPostsForTranslation().catch(console.error);
