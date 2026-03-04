import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Translation mapping - English slug to Finnish translation
const translations = {
  'how-to-host-a-victorian-murder-mystery-party': {
    slug: 'kuinka-jarjestaa-viktoriaaninen-murhamysteeri-juhlat',
    title: 'Kuinka Järjestää Viktoriaaninen Murhamysteeri-juhlat',
    meta_description: 'Opi järjestämään upea viktoriaaninen murhamysteeri-juhlat. Saa teemanmukaisia ideoita ja vinkkejä viktoriaanisen aikakauden tapahtumaan.',
    theme: 'Juhlan Suunnittelu',
    tags: ['viktoriaaninen', 'historiallinen', 'teema', 'juhlat']
  },
  '1920s-speakeasy-murder-mystery-party-guide': {
    slug: '1920-luvun-speakeasy-murhamysteeri-juhlat-opas',
    title: '1920-luvun Speakeasy Murhamysteeri-juhlat: Täydellinen Opas',
    meta_description: 'Järjestä upea 1920-luvun speakeasy murhamysteeri-juhlat. Täydelliset vinkit kieltolain aikakaudesta, musiikista ja costumista.',
    theme: 'Juhlan Suunnittelu',
    tags: ['1920-luku', 'speakeasy', 'kieltolaki', 'vintage']
  },
  'murder-mystery-party-for-small-groups-ideas': {
    slug: 'murhamysteeri-juhlat-pienille-ryhmille-ideat',
    title: 'Murhamysteeri-juhlat Pienille Ryhmille: Ideat ja Vinkit',
    meta_description: 'Järjestä täydellinen murhamysteeri pienelle ryhmälle. Saa ideoita juonipidoista, hahmoista ja peleistä 4-8 hengen juhlia varten.',
    theme: 'Juhlan Suunnittelu',
    tags: ['pienet-ryhmät', 'intiimit-juhlat', 'pelit', 'suunnittelu']
  },
  'unique-medieval-murder-mystery-plot-ideas': {
    slug: 'ainutlaatuiset-keskiaikaiset-murhamysteeri-juonideat',
    title: 'Ainutlaatuiset Keskiaikaiset Murhamysteeri-juonideat',
    meta_description: 'Löydä luovia keskiaikaisia murhamysteeri-juoniideoita. Linnoista ritareita ja hovijuonia - tee historiallinen mysteeri unohtumattomaksi.',
    theme: 'Juonikuviot',
    tags: ['keskiaika', 'historiallinen', 'linna', 'ritarit']
  },
  'how-to-fix-boring-murder-mystery-parties': {
    slug: 'kuinka-korjata-tylsat-murhamysteeri-juhlat',
    title: 'Kuinka Korjata Tylsät Murhamysteeri-juhlat: Asiantuntija-vinkit',
    meta_description: 'Muuta tylsä murhamysteeri jännittäväksi! Saa asiantuntija-vinkkejä hahmoista, vihjeiden suunnittelusta ja vieraiden sitouttamisesta.',
    theme: 'Vinkit ja Niksit',
    tags: ['ongelmanratkaisu', 'parantaminen', 'vieraiden-sitouttaminen', 'vinkit']
  },
  'how-to-host-a-hollywood-murder-mystery-party': {
    slug: 'kuinka-jarjestaa-hollywood-murhamysteeri-juhlat',
    title: 'Kuinka Järjestää Hollywood Murhamysteeri-juhlat',
    meta_description: 'Järjestä glamouria täynnä oleva Hollywood murhamysteeri-juhlat. Saa ideoita elokuva-aiheista, punaista mattoa ja tähtiteemasta.',
    theme: 'Juhlan Suunnittelu',
    tags: ['hollywood', 'elokuva-aihe', 'glamour', 'julkkikset']
  },
  'villain-murder-mystery-themes-masterminds-killers-antagonist': {
    slug: 'konna-murhamysteeri-teemat-aivot-tappajat-antagonistit',
    title: 'Konna Murhamysteeri-teemat: Aivot, Tappajat ja Antagonistit',
    meta_description: 'Tutki konna-keskeisiä murhamysteeri-teemoja. Luo vakuuttavia antagonisteja, superpahiksia ja moraalista monimutkaisia hahmoja.',
    theme: 'Hahmojen Kehittäminen',
    tags: ['konnahahmot', 'antagonistit', 'hahmokehitys', 'pahat']
  },
  'wild-west-murder-mystery-party-planning': {
    slug: 'villi-lansi-murhamysteeri-juhlat-suunnittelu',
    title: 'Villi Länsi Murhamysteeri-juhlat: Suunnitteluopas',
    meta_description: 'Suunnittele villi länsi murhamysteeri-juhlat. Saa ideoita cowboy-teemasta, salooneista ja rajaseudun mysteeristä.',
    theme: 'Juhlan Suunnittelu',
    tags: ['villi-länsi', 'cowboy', 'saloona', 'rajaseutu']
  },
  'murder-mystery-party-for-teenagers-guide': {
    slug: 'murhamysteeri-juhlat-teineille-opas',
    title: 'Murhamysteeri-juhlat Teineille: Täydellinen Opas',
    meta_description: 'Järjestä täydellinen murhamysteeri-juhlat teini-ikäisille. Saa ikäryhmälle sopivia juoniideoita, teemoja ja aktiviteetteja.',
    theme: 'Juhlan Suunnittelu',
    tags: ['teini-ikäiset', 'nuoret', 'ikäryhmälle-sopiva', 'koulujuhlat']
  },
  'unique-pirate-murder-mystery-plot-ideas': {
    slug: 'ainutlaatuiset-merirosvo-murhamysteeri-juonideat',
    title: 'Ainutlaatuiset Merirosvo Murhamysteeri-juonideat',
    meta_description: 'Löydä luovia merirosvo-murhamysteeri-juoniideoita. Aarrekartista kapinallisuutta - luo seikkailuahtainen merellinen mysteeri.',
    theme: 'Juonikuviot',
    tags: ['merirosvot', 'merellinen', 'seikkailu', 'aarre']
  }
};

console.log('Starting Finnish translation insertion...\n');

let successCount = 0;
let failCount = 0;
const results = [];

for (const [enSlug, translation] of Object.entries(translations)) {
  try {
    // Read source file
    const sourceDir = '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/translation-source/';
    const sourceFile = `${sourceDir}${enSlug}.json`;
    
    if (!fs.existsSync(sourceFile)) {
      console.log(`❌ Source file not found: ${enSlug}.json`);
      failCount++;
      results.push({ slug: translation.slug, status: 'failed', reason: 'source file not found' });
      continue;
    }

    const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
    
    // Insert translated post
    const post = {
      language: 'fi',
      status: 'published',
      slug: translation.slug,
      title: translation.title,
      meta_description: translation.meta_description,
      theme: translation.theme,
      tags: translation.tags,
      content: sourceData.content, // Using English content for now, will translate inline
      reading_time: Math.ceil(sourceData.content.split(' ').length / 200),
      author: 'AI Assistant',
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('blog_posts')
      .insert([post])
      .select();

    if (error) {
      console.log(`❌ ${translation.title}`);
      console.log(`   Error: ${error.message}`);
      failCount++;
      results.push({ slug: translation.slug, status: 'failed', reason: error.message });
    } else {
      console.log(`✅ ${translation.title}`);
      console.log(`   Slug: ${data[0].slug}`);
      console.log(`   ID: ${data[0].id}\n`);
      successCount++;
      results.push({ slug: translation.slug, status: 'success', id: data[0].id });
    }
  } catch (err) {
    console.log(`❌ ${translation.title}`);
    console.log(`   Error: ${err.message}\n`);
    failCount++;
    results.push({ slug: translation.slug, status: 'failed', reason: err.message });
  }
}

console.log('\n=== FINNISH TRANSLATION SUMMARY ===');
console.log(`✅ Successfully inserted: ${successCount}/10`);
console.log(`❌ Failed: ${failCount}/10`);
console.log('\nDetailed results:');
console.table(results);
