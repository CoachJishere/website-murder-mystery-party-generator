import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const posts = [
  {
    slug: 'murder-mystery-party-for-game-night-groups-transform-your-regular-game-night',
    ptSlug: 'festa-de-assassinato-misterioso-para-noite-de-jogos-transforme-sua-noite-regular',
    theme: 'Noite de Jogos'
  },
  {
    slug: 'murder-mystery-party-for-graduation-celebrations-academic-achievement-mysteries-with-educational-excellence',
    ptSlug: 'festa-de-assassinato-misterioso-para-formaturas-misterios-de-excelencia-academica',
    theme: 'Formatura'
  },
  {
    slug: 'murder-mystery-party-for-holiday-gatherings-festive-fun-meets-family-intrigue',
    ptSlug: 'festa-de-assassinato-misterioso-para-reunioes-festivas-diversao-e-intriga-familiar',
    theme: 'Reuniões Festivas'
  },
  {
    slug: 'murder-mystery-party-for-office-teams-build-bonds-through-collaborative-investigation',
    ptSlug: 'festa-de-assassinato-misterioso-para-equipes-de-escritorio-construa-vinculos',
    theme: 'Equipes de Escritório'
  },
  {
    slug: 'murder-mystery-party-for-small-groups-ideas',
    ptSlug: 'festa-de-assassinato-misterioso-para-grupos-pequenos-ideias',
    theme: 'Grupos Pequenos'
  },
  {
    slug: 'murder-mystery-party-for-teenagers-guide',
    ptSlug: 'festa-de-assassinato-misterioso-para-adolescentes-guia',
    theme: 'Adolescentes'
  },
  {
    slug: 'socialite-murder-mystery-themes-high-society-scandals-elite-intrigue',
    ptSlug: 'temas-de-assassinato-misterioso-alta-sociedade-escandalos-e-intriga-de-elite',
    theme: 'Alta Sociedade'
  },
  {
    slug: 'spa-resort-murder-mystery-party-guide-relax-into-danger-and-luxury',
    ptSlug: 'festa-de-assassinato-misterioso-em-spa-resort-relaxe-no-perigo-e-luxo',
    theme: 'Spa Resort'
  },
  {
    slug: 'unique-archaeological-dig-murder-mystery-unearth-ancient-secrets-and-modern-murders',
    ptSlug: 'assassinato-misterioso-em-escavacao-arqueologica-segredos-antigos-e-crimes-modernos',
    theme: 'Escavação Arqueológica'
  },
  {
    slug: 'unique-circus-murder-mystery-plot-ideas',
    ptSlug: 'ideias-de-enredo-de-assassinato-misterioso-no-circo',
    theme: 'Circo'
  },
  {
    slug: 'unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime',
    ptSlug: 'enredos-de-assassinato-misterioso-cinema-noir-entre-nas-sombras-do-crime-urbano',
    theme: 'Cinema Noir'
  },
  {
    slug: 'unique-ice-hotel-murder-mystery-plots-frozen-adventures-with-arctic-suspense-and-cold-blooded-crimes',
    ptSlug: 'enredos-de-assassinato-misterioso-em-hotel-de-gelo-aventuras-congeladas-suspense-artico',
    theme: 'Hotel de Gelo'
  },
  {
    slug: 'unique-medieval-murder-mystery-plot-ideas',
    ptSlug: 'ideias-de-enredo-de-assassinato-misterioso-medieval',
    theme: 'Medieval'
  },
  {
    slug: 'unique-pirate-murder-mystery-plot-ideas',
    ptSlug: 'ideias-de-enredo-de-assassinato-misterioso-de-piratas',
    theme: 'Piratas'
  },
  {
    slug: 'unique-school-reunion-murder-mystery-plots-that-uncover-buried-secrets',
    ptSlug: 'enredos-de-assassinato-misterioso-em-reuniao-escolar-descubra-segredos-enterrados',
    theme: 'Reunião Escolar'
  },
  {
    slug: 'unique-space-colony-murder-mystery-plots-explore-the-final-frontier-of-crime',
    ptSlug: 'enredos-de-assassinato-misterioso-em-colonia-espacial-fronteira-final-do-crime',
    theme: 'Colônia Espacial'
  },
  {
    slug: 'unique-train-station-murder-mystery-plots-all-aboard-for-danger-and-intrigue',
    ptSlug: 'enredos-de-assassinato-misterioso-em-estacao-de-trem-embarque-no-perigo-e-intriga',
    theme: 'Estação de Trem'
  },
  {
    slug: 'unique-underwater-murder-mystery-plots-that-will-make-a-splash-at-your-party',
    ptSlug: 'enredos-de-assassinato-misterioso-submarino-que-farao-sucesso-em-sua-festa',
    theme: 'Submarina'
  },
  {
    slug: 'villain-murder-mystery-themes-masterminds-killers-antagonists',
    ptSlug: 'temas-de-assassinato-misterioso-viloes-mestres-do-crime-assassinos-antagonistas',
    theme: 'Vilões'
  },
  {
    slug: 'wild-west-murder-mystery-party-planning',
    ptSlug: 'planejamento-de-festa-de-assassinato-misterioso-velho-oeste',
    theme: 'Velho Oeste'
  }
];

console.log('Fetching all 20 English posts...\n');

for (let i = 0; i < posts.length; i++) {
  const post = posts[i];
  const { data: englishPost, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', post.slug)
    .eq('language', 'en')
    .single();

  if (error) {
    console.log(`❌ Error fetching ${post.slug}`);
    continue;
  }

  // Save to individual file for Claude to translate
  await fs.writeFile(
    `temp-files/to-translate-${i + 1}.json`,
    JSON.stringify({
      index: i + 1,
      total: posts.length,
      englishSlug: post.slug,
      ptSlug: post.ptSlug,
      theme: post.theme,
      post: englishPost
    }, null, 2)
  );

  console.log(`[${i + 1}/20] Prepared: ${post.slug}`);
}

console.log('\n✅ All 20 posts prepared for translation');
console.log('Files saved as: temp-files/to-translate-1.json through to-translate-20.json');
