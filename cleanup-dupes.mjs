// cleanup-dupes.mjs — Find and remove duplicate/extra blog posts in FR, IT, PT, and JA graduation post
// Strategy: For each language, identify duplicate slugs and delete older copies.
// If still over target (61), find posts whose topics appear more than once (same English source, different slug).

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function fetchPosts(language) {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?select=id,slug,title,created_at,language,theme,tags&language=eq.${language}&status=eq.published&order=created_at.asc`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Failed to fetch ${language}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function deletePost(id) {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { ...headers, 'Prefer': 'return=representation' },
  });
  if (!res.ok) throw new Error(`Failed to delete ${id}: ${res.status} ${await res.text()}`);
  return res.json();
}

// Canonical topic keywords for each English post. We define the core topic
// (e.g. "fairy-tale", "masquerade", "speakeasy") for each English post.
// Then we match translated posts by checking if the translated title/slug
// contains the translated version of these keywords.
const ENGLISH_TOPIC_KEYWORDS = {
  'fairy-tale': ['conte-de-fees', 'fiaba', 'conto-de-fadas', 'fairy-tale', 'fairytale'],
  'masquerade': ['bal-masque', 'ballo-maschera', 'mascaras', 'masquerade', 'masque', 'maschere', 'mascarada', 'baile-mascaras'],
  'speakeasy': ['speakeasy', 'clandestino', 'bar-clandestin', 'prohibition', 'proibizionismo', 'proibicionista'],
  'detective': ['detective', 'detectives', 'detecteur', 'detetive', 'investigatore', 'investigadores'],
  'mountain-lodge': ['montagne', 'montagna', 'montanha', 'chalet', 'lodge', 'mountain'],
  'ancient-egypt': ['egypte', 'egitto', 'egito', 'egypt', 'antique', 'antico', 'antigo', 'pharaoh', 'faraone'],
  'spy-thriller': ['espion', 'spionaggio', 'espionagem', 'spy', 'thriller', 'espionnage'],
  'cruise-ship': ['croisiere', 'crociera', 'cruzeiro', 'cruise', 'navire', 'nave', 'navio'],
  'art-gallery': ['galerie-dart', 'galleria-arte', 'galeria-arte', 'art-gallery', 'galeries-dart', 'galleria'],
  'butler': ['majordome', 'maggiordomo', 'mordomo', 'butler'],
  'chef': ['chef', 'cuisinier', 'culinario', 'culinari'],
  'bookstore': ['librairie', 'libreria', 'livraria', 'bookstore'],
  'haunted-mansion': ['manoir-hante', 'villa-stregata', 'mansao-assombrada', 'haunted-mansion', 'hante', 'stregata', 'assombrada'],
  'hollywood': ['hollywood'],
  'renaissance': ['renaissance', 'rinascimento', 'renascimento', 'renascentista', 'rinascimentale'],
  'medieval': ['medieval', 'medievale', 'chateau-medieval', 'castello-medievale'],
  'victorian': ['victorien', 'vittoriana', 'vitoriana', 'victorian'],
  'wild-west': ['far-west', 'selvaggio-west', 'velho-oeste', 'wild-west', 'western'],
  'beach-resort': ['plage', 'spiaggia', 'praia', 'beach', 'resort', 'bord-de-mer'],
  'space-colony': ['spatial', 'spaziale', 'espacial', 'space-colony', 'espace', 'spazio', 'colonie-spatiale', 'colonia-spaziale', 'colonia-espacial'],
  'casino': ['casino', 'cassino'],
  'haunted-hotel': ['hotel-hante', 'hotel-infestato', 'hotel-assombrado', 'haunted-hotel', 'hotel-fantasma'],
  'prohibition': ['prohibition', 'proibizionismo', 'proibicionista', 'bootleg', 'contrabbando'],
  'steampunk': ['steampunk'],
  'jazz': ['jazz', 'soiree-jazz'],
  'journalist': ['journaliste', 'giornalista', 'jornalista', 'journalist', 'reporteres'],
  'lawyer': ['avocat', 'avvocato', 'advogado', 'lawyer', 'legal', 'legale', 'tribunal', 'aula'],
  'medical-examiner': ['medecin-legiste', 'medico-legale', 'perito-medico', 'medical-examiner', 'forensi', 'forense'],
  'birthday': ['anniversaire', 'compleanno', 'aniversario', 'birthday', 'fete-anniversaire'],
  'corporate-events': ['entreprise', 'aziendale', 'corporativo', 'corporate', 'team-building', 'eventi-aziendali'],
  'date-night': ['soiree-couple', 'serata-coppia', 'encontro-romantico', 'date-night', 'romantique', 'romantico', 'romanticos'],
  'game-night': ['soiree-jeu', 'serata-gioco', 'noite-jogos', 'game-night', 'jeux'],
  'graduation': ['diplome', 'laurea', 'formatura', 'graduation'],
  'holiday-gatherings': ['fetes', 'festive', 'festivas', 'holiday', 'noel', 'natale', 'natal', 'reunions-festives', 'riunioni-festive', 'reunioes-festivas'],
  'office-teams': ['bureau', 'ufficio', 'escritorio', 'office-teams', 'equipe-bureau', 'team-ufficio'],
  'small-groups': ['petits-groupes', 'piccoli-gruppi', 'grupos-pequenos', 'small-groups'],
  'teenagers': ['adolescents', 'adolescenti', 'adolescentes', 'teenagers', 'ados'],
  'socialite': ['mondain', 'alta-societa', 'alta-sociedade', 'socialite', 'high-society'],
  'archaeological': ['archeologique', 'archeologico', 'arqueologico', 'archaeological', 'fouilles', 'scavo', 'escavacao'],
  'circus': ['cirque', 'circo', 'circus', 'big-top', 'chapiteau', 'tendone'],
  'pirate': ['pirate', 'pirata', 'piratas', 'pirati'],
  'school-reunion': ['reunion-scolaire', 'riunione-scolastica', 'reuniao-escolar', 'school-reunion'],
  'train-station': ['gare', 'stazione-treno', 'estacao-trem', 'train-station', 'ferroviaire', 'ferroviarie'],
  'underwater': ['sous-marin', 'subacqueo', 'submarino', 'underwater'],
  'villain': ['mechant', 'cattivo', 'vilao', 'villain', 'viloes', 'cattivi', 'antagonist'],
  'dinner-party': ['diner', 'cena', 'jantar', 'dinner', 'soiree-diner', 'culinaire', 'culinaria', 'culinario'],
  'boring': ['ennuyeuse', 'noiose', 'chata', 'boring', 'ennui', 'noia'],
  'confusing-clues': ['indices-confus', 'indizi-confusi', 'pistas-confusas', 'confusing-clues', 'pistas'],
  'non-participating': ['ne-participent', 'non-partecipano', 'nao-participam', 'non-participating', 'invites-qui-ne', 'ospiti-che-non'],
  'overly-complex': ['trop-complexes', 'troppo-complessi', 'excessivamente-complexos', 'overly-complex', 'complexe', 'complessi'],
  'pacing': ['rythme', 'ritmo', 'pacing', 'timing'],
  'unrealistic': ['irrealistes', 'irrealistiche', 'irrealistas', 'unrealistic', 'realisme', 'realismo', 'credibili', 'criveis'],
  'unsatisfying-endings': ['fins-insatisfaisantes', 'finali-insoddisfacenti', 'finais-insatisfatorios', 'unsatisfying-endings', 'conclusion', 'revelacoes'],
  'breaking-character': ['personnage', 'personaggio', 'personagem', 'breaking-character', 'hors-personnage', 'fuori-personaggio'],
  'film-noir': ['film-noir', 'cinema-noir'],
  'haunted-hotel-2': ['haunted-hotel'],
  'superhero': ['super-heros', 'supereroi', 'super-herois', 'superhero'],
  'zombie': ['zombie', 'zombi', 'zumbi'],
  'vintage-circus': ['cirque-vintage', 'circo-vintage', 'circo-vintage'],
  'celtic': ['celte', 'celtico', 'celta', 'celtic', 'celtica', 'celtique'],
  'mayan': ['maya', 'maia', 'mayan'],
  'greek': ['grec', 'greco', 'grego', 'greek', 'grece', 'grecia'],
  'aztec': ['azteque', 'azteco', 'asteca', 'aztec'],
};

function matchPostToEnglishTopic(post) {
  const slugLower = post.slug.toLowerCase();
  const titleLower = post.title.toLowerCase();
  const combined = slugLower + ' ' + titleLower;
  
  let bestTopic = null;
  let bestScore = 0;
  
  for (const [topic, keywords] of Object.entries(ENGLISH_TOPIC_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (combined.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }
  
  return { topic: bestTopic, score: bestScore };
}

async function main() {
  console.log('=== Blog Post Duplicate Cleanup ===\n');

  const [enPosts, frPosts, itPosts, ptPosts, jaPosts] = await Promise.all([
    fetchPosts('en'), fetchPosts('fr'), fetchPosts('it'), fetchPosts('pt'), fetchPosts('ja'),
  ]);

  console.log(`EN: ${enPosts.length} posts`);
  console.log(`FR: ${frPosts.length} posts (target: 61)`);
  console.log(`IT: ${itPosts.length} posts (target: 61)`);
  console.log(`PT: ${ptPosts.length} posts (target: 61)`);
  console.log(`JA: ${jaPosts.length} posts\n`);

  // Map English posts to topics
  console.log('--- English topic mapping ---');
  const enTopicMap = {};
  for (const p of enPosts) {
    const { topic, score } = matchPostToEnglishTopic(p);
    enTopicMap[p.slug] = topic;
  }
  const enTopics = new Set(Object.values(enTopicMap));
  console.log(`Mapped ${Object.keys(enTopicMap).length} English posts to ${enTopics.size} topics\n`);

  const toDelete = [];

  for (const [lang, posts, target] of [['fr', frPosts, 61], ['it', itPosts, 61], ['pt', ptPosts, 61]]) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${lang.toUpperCase()} ANALYSIS (${posts.length} posts, target: ${target})`);
    console.log('='.repeat(60));

    // Step 1: Find exact slug duplicates
    const bySlug = {};
    for (const p of posts) {
      if (!bySlug[p.slug]) bySlug[p.slug] = [];
      bySlug[p.slug].push(p);
    }
    const dupSlugs = Object.entries(bySlug).filter(([, arr]) => arr.length > 1);
    
    if (dupSlugs.length > 0) {
      console.log(`\nSlug duplicates found: ${dupSlugs.length}`);
      for (const [slug, dupes] of dupSlugs) {
        dupes.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        console.log(`  "${slug}" (${dupes.length} copies):`);
        for (let i = 0; i < dupes.length; i++) {
          const action = i < dupes.length - 1 ? 'DELETE' : 'KEEP';
          console.log(`    [${action}] id=${dupes[i].id} created=${dupes[i].created_at}`);
          if (action === 'DELETE') {
            toDelete.push({ lang, id: dupes[i].id, slug: dupes[i].slug, title: dupes[i].title, reason: 'exact slug duplicate' });
          }
        }
      }
    } else {
      console.log('\nNo exact slug duplicates.');
    }

    // Step 2: Match all posts to English topics, find topic duplicates
    const remaining = posts.filter(p => !toDelete.find(d => d.id === p.id));
    const afterDupRemoval = remaining.length;
    console.log(`After slug dedup: ${afterDupRemoval} posts`);
    
    if (afterDupRemoval > target) {
      const excess = afterDupRemoval - target;
      console.log(`Need to remove ${excess} more post(s). Matching by topic...\n`);
      
      // Match each post to an English topic
      const byTopic = {};
      const unmatched = [];
      
      for (const p of remaining) {
        const { topic, score } = matchPostToEnglishTopic(p);
        if (score === 0 || !topic) {
          unmatched.push(p);
        } else {
          if (!byTopic[topic]) byTopic[topic] = [];
          byTopic[topic].push({ ...p, matchScore: score });
        }
      }
      
      // Check for junk/test posts first
      if (unmatched.length > 0) {
        console.log(`Unmatched posts (no topic match, score=0):`);
        for (const p of unmatched) {
          console.log(`  id=${p.id} slug="${p.slug}" title="${p.title}"`);
          // Posts like "french-translation", "a-propos-de-ce-guide", or generic SEO posts
          // are almost certainly junk
          const isJunk = p.slug === 'french-translation' || 
                         p.slug.includes('a-propos-de-ce-guide') ||
                         p.slug.includes('tendances-du-marche') ||
                         p.slug.includes('tendencias-de-mercado') ||
                         p.title.toUpperCase() === p.title; // ALL CAPS = placeholder
          if (isJunk) {
            console.log(`    -> JUNK post, marking for deletion`);
            toDelete.push({ lang, id: p.id, slug: p.slug, title: p.title, reason: 'junk/test/SEO post with no English equivalent' });
          }
        }
      }
      
      // Find topics with more than one post (duplicate translations)
      const topicDupes = Object.entries(byTopic).filter(([, arr]) => arr.length > 1);
      if (topicDupes.length > 0) {
        console.log(`\nTopic duplicates (same English post translated multiple times):`);
        for (const [topic, dupes] of topicDupes) {
          dupes.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          console.log(`  Topic "${topic}" (${dupes.length} posts):`);
          for (let i = 0; i < dupes.length; i++) {
            // Keep the newer one (last)
            const action = i < dupes.length - 1 ? 'DELETE' : 'KEEP';
            console.log(`    [${action}] id=${dupes[i].id} slug="${dupes[i].slug}" score=${dupes[i].matchScore} created=${dupes[i].created_at}`);
            if (action === 'DELETE') {
              toDelete.push({ lang, id: dupes[i].id, slug: dupes[i].slug, title: dupes[i].title, reason: `topic duplicate ("${topic}")` });
            }
          }
        }
      }
      
      // Check remaining count
      const langDeletions = toDelete.filter(d => d.lang === lang).length;
      const projected = posts.length - langDeletions;
      console.log(`\nProjected count after cleanup: ${projected} (target: ${target})`);
      
      if (projected > target) {
        // Still over. List remaining unmatched for manual review
        const stillExtra = projected - target;
        console.log(`Still ${stillExtra} over target. Remaining unmatched posts for review:`);
        const remainingUnmatched = unmatched.filter(p => !toDelete.find(d => d.id === p.id));
        for (const p of remainingUnmatched) {
          console.log(`  id=${p.id} slug="${p.slug}" title="${p.title}"`);
        }
      }
    }
  }

  // JA graduation post
  console.log(`\n${'='.repeat(60)}`);
  console.log('JA GRADUATION POST CHECK');
  console.log('='.repeat(60));
  const jaGrad = jaPosts.filter(p => p.slug.includes('graduation') || p.title.includes('卒業'));
  if (jaGrad.length > 0) {
    for (const p of jaGrad) {
      console.log(`[DELETE] id=${p.id} slug="${p.slug}" title="${p.title}"`);
      toDelete.push({ lang: 'ja', id: p.id, slug: p.slug, title: p.title, reason: 'JA graduation post (no EN equivalent)' });
    }
  } else {
    console.log('No JA graduation posts found.');
  }

  // EXECUTION
  console.log(`\n${'='.repeat(60)}`);
  console.log('DELETION PLAN');
  console.log('='.repeat(60));
  
  if (toDelete.length === 0) {
    console.log('No posts to delete. Manual review needed.');
    return;
  }
  
  // Summary by language
  for (const lang of ['fr', 'it', 'pt', 'ja']) {
    const langDels = toDelete.filter(d => d.lang === lang);
    if (langDels.length > 0) {
      console.log(`\n${lang.toUpperCase()} (${langDels.length} to delete):`);
      for (const d of langDels) {
        console.log(`  id=${d.id} slug="${d.slug}" reason="${d.reason}"`);
      }
    }
  }
  
  console.log(`\nTotal: ${toDelete.length} posts to delete`);
  console.log('\nExecuting deletions...\n');
  
  let deleted = 0;
  let failed = 0;
  for (const d of toDelete) {
    try {
      await deletePost(d.id);
      console.log(`  OK  [${d.lang.toUpperCase()}] "${d.slug}" (${d.reason})`);
      deleted++;
    } catch (err) {
      console.error(`  FAIL [${d.lang.toUpperCase()}] "${d.slug}": ${err.message}`);
      failed++;
    }
  }
  
  console.log(`\nDeleted: ${deleted}, Failed: ${failed}`);

  // Verify
  console.log('\n=== FINAL VERIFICATION ===');
  const [frF, itF, ptF, jaF] = await Promise.all([
    fetchPosts('fr'), fetchPosts('it'), fetchPosts('pt'), fetchPosts('ja'),
  ]);
  console.log(`FR: ${frF.length} posts (target: 61) ${frF.length === 61 ? 'OK' : 'NEEDS ATTENTION'}`);
  console.log(`IT: ${itF.length} posts (target: 61) ${itF.length === 61 ? 'OK' : 'NEEDS ATTENTION'}`);
  console.log(`PT: ${ptF.length} posts (target: 61) ${ptF.length === 61 ? 'OK' : 'NEEDS ATTENTION'}`);
  console.log(`JA: ${jaF.length} posts`);
  
  console.log('\nDone!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
