// identify-and-cleanup.mjs — Identify missing posts per language + clean FR/KO dupes
const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';
const headers = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

import fs from 'fs';

const ENGLISH_TOPIC_KEYWORDS = {
  'fairy-tale': ['conte-de-fees', 'fiaba', 'conto-de-fadas', 'marchen', 'sprookje', 'eventyr', 'satu', 'saga'],
  'masquerade': ['bal-masque', 'ballo-maschera', 'mascaras', 'masque', 'maschere', 'mascarada', 'maskenball', 'maskerbal', 'maskerad', 'naamioitu'],
  'speakeasy': ['speakeasy', 'clandestino', 'bar-clandestin', 'flusterbar', '1920'],
  'detective': ['detective', 'detectives', 'detecteur', 'detetive', 'investigatore', 'investigadores', 'detektiv', 'etsiva'],
  'mountain-lodge': ['montagne', 'montagna', 'montanha', 'chalet', 'lodge', 'mountain', 'berglodge', 'fjallstuga'],
  'ancient-egypt': ['egypte', 'egitto', 'egito', 'egypt', 'pharaoh', 'faraone', 'agypten', 'egypten', 'egypti'],
  'spy-thriller': ['espion', 'spionaggio', 'espionagem', 'spy', 'thriller', 'espionnage', 'spion', 'vakooja'],
  'cruise-ship': ['croisiere', 'crociera', 'cruzeiro', 'cruise', 'navire', 'nave', 'navio', 'kreuzfahrt', 'cruiseschip', 'kryssning', 'krydstogt', 'risteily'],
  'art-gallery': ['galerie-dart', 'galleria-arte', 'galeria-arte', 'art-gallery', 'kunstgalerie', 'konstgalleri', 'kunstgalleri', 'taidegalleria'],
  'butler': ['majordome', 'maggiordomo', 'mordomo', 'butler', 'hovmester'],
  'chef': ['chef', 'cuisinier', 'culinario', 'culinari', 'koch', 'kok', 'kokki'],
  'bookstore': ['librairie', 'libreria', 'livraria', 'bookstore', 'buchhandlung', 'boekhandel', 'bokhandel', 'boghandel', 'kirjakauppa'],
  'haunted-mansion': ['manoir-hante', 'villa-stregata', 'mansao-assombrada', 'haunted-mansion', 'hante', 'stregata', 'assombrada', 'spukhaus', 'spookhuis', 'kummitus'],
  'hollywood': ['hollywood'],
  'renaissance': ['renaissance', 'rinascimento', 'renascimento', 'renascentista', 'rinascimentale'],
  'medieval': ['medieval', 'medievale', 'chateau-medieval', 'castello-medievale', 'mittelalter', 'middeleeuws', 'medeltida', 'middelalder', 'keskiaikainen'],
  'victorian': ['victorien', 'vittoriana', 'vitoriana', 'victorian', 'viktorianisch', 'victoriaans', 'viktoriansk'],
  'wild-west': ['far-west', 'selvaggio-west', 'velho-oeste', 'wild-west', 'western', 'wilder-westen', 'wilde-westen', 'vilda-vastern'],
  'beach-resort': ['plage', 'spiaggia', 'praia', 'beach', 'resort', 'bord-de-mer', 'strand', 'ranta'],
  'space-colony': ['spatial', 'spaziale', 'espacial', 'space-colony', 'espace', 'spazio', 'weltraum', 'ruimte', 'rymd', 'rum', 'avaruus', 'space-station', 'raumstation'],
  'casino': ['casino', 'cassino', 'kasino'],
  'haunted-hotel': ['hotel-hante', 'hotel-infestato', 'hotel-assombrado', 'haunted-hotel', 'hotel-fantasma', 'spukhotel', 'spokhotel'],
  'prohibition': ['prohibition', 'proibizionismo', 'proibicionista', 'bootleg', 'contrabbando'],
  'steampunk': ['steampunk'],
  'jazz': ['jazz', 'soiree-jazz'],
  'journalist': ['journaliste', 'giornalista', 'jornalista', 'journalist', 'reporteres', 'reporter'],
  'lawyer': ['avocat', 'avvocato', 'advogado', 'lawyer', 'legal', 'legale', 'tribunal', 'aula', 'anwalt', 'advocaat', 'advokat', 'asianajaja'],
  'medical-examiner': ['medecin-legiste', 'medico-legale', 'perito-medico', 'medical-examiner', 'forensi', 'forense', 'gerichtsmedizin', 'rechtsarts', 'rattslakar'],
  'birthday': ['anniversaire', 'compleanno', 'aniversario', 'birthday', 'fete-anniversaire', 'geburtstag', 'verjaardag', 'fodelsedag', 'fodselsdag', 'syntymapaiva'],
  'corporate-events': ['entreprise', 'aziendale', 'corporativo', 'corporate', 'team-building', 'eventi-aziendali', 'unternehmen', 'bedrijf', 'foretag', 'virksomhed', 'yritys'],
  'date-night': ['soiree-couple', 'serata-coppia', 'encontro-romantico', 'date-night', 'romantique', 'romantico', 'romanticos', 'romantisch', 'dejt', 'romantisk'],
  'game-night': ['soiree-jeu', 'serata-gioco', 'noite-jogos', 'game-night', 'jeux', 'spieleabend', 'spelavond', 'spelkvall', 'spilleaften', 'peli-ilta'],
  'graduation': ['diplome', 'laurea', 'formatura', 'graduation', 'abschluss', 'afstuderen', 'examen', 'valmistujaiset'],
  'holiday-gatherings': ['fetes', 'festive', 'festivas', 'holiday', 'noel', 'natale', 'natal', 'feiertag', 'feestdag', 'helgdag', 'helligdag', 'juhla'],
  'office-teams': ['bureau', 'ufficio', 'escritorio', 'office-teams', 'equipe-bureau', 'team-ufficio', 'kantoor', 'kontor'],
  'small-groups': ['petits-groupes', 'piccoli-gruppi', 'grupos-pequenos', 'small-groups', 'kleine-gruppen', 'kleine-groepen', 'sma-grupper'],
  'teenagers': ['adolescents', 'adolescenti', 'adolescentes', 'teenagers', 'ados', 'jugendliche', 'tieners', 'tonaring', 'teini'],
  'socialite': ['mondain', 'alta-societa', 'alta-sociedade', 'socialite', 'high-society'],
  'archaeological': ['archeologique', 'archeologico', 'arqueologico', 'archaeological', 'fouilles', 'scavo', 'escavacao', 'archaologisch', 'archeologisch', 'arkeologisk'],
  'circus': ['cirque', 'circo', 'circus', 'big-top', 'chapiteau', 'tendone', 'zirkus', 'sirkus'],
  'pirate': ['pirate', 'pirata', 'piratas', 'pirati', 'pirat', 'sjorover', 'merirosvo'],
  'school-reunion': ['reunion-scolaire', 'riunione-scolastica', 'reuniao-escolar', 'school-reunion', 'klassentreffen', 'schoolreunie', 'skoltriff'],
  'train-station': ['gare', 'stazione-treno', 'estacao-trem', 'train-station', 'ferroviaire', 'ferroviarie', 'bahnhof', 'station', 'tagstation', 'juna-asema'],
  'underwater': ['sous-marin', 'subacqueo', 'submarino', 'underwater', 'unterwasser', 'onderwater', 'undervattens', 'undervands', 'vedenalainen'],
  'villain': ['mechant', 'cattivo', 'vilao', 'villain', 'viloes', 'cattivi', 'antagonist', 'bosewicht', 'schurk'],
  'dinner-party': ['diner', 'cena', 'jantar', 'dinner', 'soiree-diner', 'culinaire', 'culinaria', 'culinario', 'abendessen', 'middag'],
  'boring': ['ennuyeuse', 'noiose', 'chata', 'boring', 'ennui', 'noia', 'langweilig', 'saai', 'trakig', 'kedelig', 'tylsa'],
  'confusing-clues': ['indices-confus', 'indizi-confusi', 'pistas-confusas', 'confusing-clues', 'pistas', 'verwirrend', 'verwarrend', 'forvirrande'],
  'non-participating': ['ne-participent', 'non-partecipano', 'nao-participam', 'non-participating', 'invites-qui-ne', 'ospiti-che-non', 'nicht-teilnehmen'],
  'overly-complex': ['trop-complexes', 'troppo-complessi', 'excessivamente-complexos', 'overly-complex', 'complexe', 'complessi', 'ubermassig', 'overmatig'],
  'pacing': ['rythme', 'ritmo', 'pacing', 'timing', 'tempo'],
  'unrealistic': ['irrealistes', 'irrealistiche', 'irrealistas', 'unrealistic', 'realisme', 'realismo', 'credibili', 'criveis', 'unrealistisch'],
  'unsatisfying-endings': ['fins-insatisfaisantes', 'finali-insoddisfacenti', 'finais-insatisfatorios', 'unsatisfying-endings', 'conclusion', 'revelacoes', 'unbefriedigend'],
  'breaking-character': ['personnage', 'personaggio', 'personagem', 'breaking-character', 'hors-personnage', 'fuori-personaggio', 'aus-der-rolle'],
  'film-noir': ['film-noir', 'cinema-noir'],
  'superhero': ['super-heros', 'supereroi', 'super-herois', 'superhero', 'superheld'],
  'zombie': ['zombie', 'zombi', 'zumbi'],
  'vintage-circus': ['cirque-vintage', 'circo-vintage'],
  'celtic': ['celte', 'celtico', 'celta', 'celtic', 'celtica', 'celtique', 'keltisch', 'keltisk'],
  'mayan': ['maya', 'maia', 'mayan'],
  'greek': ['grec', 'greco', 'grego', 'greek', 'grece', 'grecia', 'griechisch', 'grieks', 'grekisk'],
  'aztec': ['azteque', 'azteco', 'asteca', 'aztec', 'aztekisch', 'azteeks', 'aztekisk'],
};

async function fetchPosts(lang) {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?language=eq.${lang}&status=eq.published&select=id,slug,title,created_at&order=created_at.asc&limit=1000`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Fetch ${lang} failed: ${res.status}`);
  return res.json();
}

async function deletePost(id) {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?id=eq.${id}`;
  const res = await fetch(url, { method: 'DELETE', headers });
  if (!res.ok) throw new Error(`Delete ${id} failed: ${res.status}`);
  return true;
}

function matchPostToTopic(post) {
  const combined = (post.slug + ' ' + post.title).toLowerCase();
  let bestTopic = null, bestScore = 0;
  for (const [topic, keywords] of Object.entries(ENGLISH_TOPIC_KEYWORDS)) {
    let score = 0;
    if (combined.includes(topic)) score += 2;
    for (const kw of keywords) {
      if (combined.includes(kw)) score++;
    }
    if (score > bestScore) { bestScore = score; bestTopic = topic; }
  }
  return { topic: bestTopic, score: bestScore };
}

function matchEnglishToTopic(slug) {
  const s = slug.toLowerCase();
  for (const topic of Object.keys(ENGLISH_TOPIC_KEYWORDS)) {
    if (s.includes(topic)) return topic;
  }
  return null;
}

async function main() {
  const enPosts = await fetchPosts('en');
  console.log(`English: ${enPosts.length} posts\n`);

  // Map English posts to topics
  const enByTopic = {};
  for (const p of enPosts) {
    const topic = matchEnglishToTopic(p.slug);
    if (topic) enByTopic[topic] = p.slug;
  }

  // === CLEANUP FR ===
  console.log('=== FRENCH CLEANUP ===');
  const frPosts = await fetchPosts('fr');
  console.log(`FR: ${frPosts.length} posts`);

  if (frPosts.length > 61) {
    // Find topic dupes
    const frByTopic = {};
    for (const p of frPosts) {
      const { topic, score } = matchPostToTopic(p);
      if (!frByTopic[topic]) frByTopic[topic] = [];
      frByTopic[topic].push({ ...p, score });
    }
    const dupes = Object.entries(frByTopic).filter(([, arr]) => arr.length > 1);
    for (const [topic, posts] of dupes) {
      posts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      console.log(`  Topic "${topic}" has ${posts.length} posts:`);
      for (let i = 0; i < posts.length - 1; i++) {
        console.log(`    DELETE id=${posts[i].id} slug="${posts[i].slug}"`);
        await deletePost(posts[i].id);
      }
      console.log(`    KEEP  id=${posts[posts.length-1].id} slug="${posts[posts.length-1].slug}"`);
    }
    // Check for unmatched
    const unmatched = Object.entries(frByTopic).filter(([topic]) => !topic);
    if (unmatched.length > 0) {
      for (const [, posts] of unmatched) {
        for (const p of posts) {
          console.log(`    UNMATCHED: id=${p.id} slug="${p.slug}" title="${p.title}"`);
        }
      }
    }
  }
  const frFinal = await fetchPosts('fr');
  console.log(`FR final: ${frFinal.length}\n`);

  // === CLEANUP KO ===
  console.log('=== KOREAN CLEANUP ===');
  const koPosts = await fetchPosts('ko');
  console.log(`KO: ${koPosts.length} posts`);

  if (koPosts.length > 61) {
    const enSlugs = new Set(enPosts.map(p => p.slug));
    const toDelete = [];

    // Check for ko- prefix dupes and unmatched
    const seen = new Set();
    for (const p of koPosts) {
      // Try to extract the English slug
      let enSlug = null;
      if (p.slug.startsWith('ko-')) {
        enSlug = p.slug.substring(3);
      }

      if (enSlug && seen.has(enSlug)) {
        console.log(`  DUPE: id=${p.id} slug="${p.slug}"`);
        toDelete.push(p.id);
      } else if (enSlug && !enSlugs.has(enSlug)) {
        console.log(`  NO EN MATCH: id=${p.id} slug="${p.slug}"`);
        toDelete.push(p.id);
      } else if (enSlug) {
        seen.add(enSlug);
      } else {
        // Non-prefix slug — might be a dupe or junk
        const { topic } = matchPostToTopic(p);
        console.log(`  NON-PREFIX: id=${p.id} slug="${p.slug}" topic=${topic}`);
        toDelete.push(p.id);
      }
    }

    // Only delete enough to get to 61
    const excess = koPosts.length - 61;
    console.log(`\nNeed to delete ${excess} of ${toDelete.length} identified posts`);
    for (let i = 0; i < Math.min(excess, toDelete.length); i++) {
      console.log(`  Deleting id=${toDelete[i]}...`);
      await deletePost(toDelete[i]);
    }
  }
  const koFinal = await fetchPosts('ko');
  console.log(`KO final: ${koFinal.length}\n`);

  // === IDENTIFY MISSING POSTS ===
  const SLUG_PATTERNS = {
    ja: 'prefix', ko: 'prefix', 'zh-cn': 'prefix',
    nl: 'translated', sv: 'translated', da: 'translated', fi: 'translated',
    fr: 'translated', de: 'translated', es: 'translated', it: 'translated', pt: 'translated'
  };

  const langsToCheck = ['it', 'nl', 'da', 'fi'];
  const result = {};

  for (const lang of langsToCheck) {
    const posts = await fetchPosts(lang);
    console.log(`=== ${lang.toUpperCase()} (${posts.length}/61) ===`);

    if (posts.length >= 61) {
      console.log(`  Already complete!\n`);
      continue;
    }

    const missing = [];
    const pattern = SLUG_PATTERNS[lang];

    if (pattern === 'prefix') {
      const existingSlugs = new Set(posts.map(p => p.slug));
      for (const en of enPosts) {
        if (!existingSlugs.has(`${lang}-${en.slug}`)) {
          missing.push(en.slug);
        }
      }
    } else {
      // Topic matching for translated slugs
      for (const en of enPosts) {
        const enTopic = matchEnglishToTopic(en.slug);
        const keywords = enTopic ? [enTopic, ...(ENGLISH_TOPIC_KEYWORDS[enTopic] || [])] : [];

        // Also use significant words from slug as fallback
        const sigWords = en.slug.split('-').filter(w =>
          w.length > 3 && !['how-', 'host', 'that', 'will', 'your', 'make', 'murder', 'mystery', 'party', 'themes', 'guide', 'unique', 'plots', 'best', 'tips', 'ways'].includes(w)
        );

        const hasTranslation = posts.some(p => {
          const combined = (p.slug + ' ' + p.title).toLowerCase();
          // Check topic keywords
          if (keywords.some(kw => combined.includes(kw))) return true;
          // Check significant words (need 2+ matches)
          const wordMatches = sigWords.filter(w => combined.includes(w));
          return wordMatches.length >= 2;
        });

        if (!hasTranslation) {
          missing.push(en.slug);
        }
      }
    }

    console.log(`  Missing: ${missing.length} posts`);
    for (const slug of missing) {
      console.log(`    - ${slug}`);
    }
    console.log();
    result[lang] = missing;
  }

  // Save results
  fs.writeFileSync('missing-posts-by-lang.json', JSON.stringify(result, null, 2));
  console.log('Saved missing posts to missing-posts-by-lang.json');
}

main().catch(console.error);
