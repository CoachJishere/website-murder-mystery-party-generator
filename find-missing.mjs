// Identify exactly which English posts are missing translations in FR, IT, PT
const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';
const headers = { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY };

async function fetchPosts(lang) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?select=id,slug,title&language=eq.${lang}&status=eq.published&order=title.asc`, { headers });
  return res.json();
}

// Manually map each English post title to check if it exists in a translated set
// We'll use a title-keyword approach with careful hand-picked keywords per English post
const EN_POSTS_KEYWORDS = [
  { en: "1920s Speakeasy Murder Mystery Party Guide", keywords: ["speakeasy", "1920", "bar clandestin"] },
  { en: "5 Beach Resort Murder Mystery Themes", keywords: ["beach", "resort", "praia", "plage", "spiaggia", "balneare", "spa resort", "spa"] },
  { en: "5 Casino Murder Mystery Party Themes", keywords: ["casino", "cassino"] },
  { en: "5 Haunted Mansion Murder Mystery Themes", keywords: ["haunted mansion", "manoir hant", "villa stregata", "mans.o assombrada", "mansion"] },
  { en: "5 Masquerade Ball Murder Mystery Themes", keywords: ["masquerade", "masque", "maschera", "m.scaras", "bal masqu"] },
  { en: "5 Mountain Lodge Murder Mystery Themes", keywords: ["mountain", "montagne", "montagna", "montanha", "lodge", "chalet", "rifug"] },
  { en: "5 Renaissance Murder Mystery Party Themes", keywords: ["renaissance", "rinasciment", "renasciment"] },
  { en: "5 Spy Thriller Murder Mystery Themes", keywords: ["spy", "espion", "spionag", "espionag"] },
  { en: "5 Vintage Circus Murder Mystery Themes", keywords: ["vintage circus", "cirque vintage", "circo vintage", "big top", "chapiteau", "tendone"] },
  { en: "Ancient Egypt Murder Mystery Party Guide", keywords: ["egypt", "egypte", "egitto", "egito"] },
  { en: "Art Gallery Murder Mystery Party Planning", keywords: ["art gallery", "galerie d'art", "galleria", "galeria de arte", "galeries"] },
  { en: "Bookstore Murder Mystery Party Planning", keywords: ["bookstore", "librairie", "libreria", "livraria"] },
  { en: "Butler Murder Mystery Themes", keywords: ["butler", "majordome", "maggiordomo", "mordomo"] },
  { en: "Chef Murder Mystery Themes", keywords: ["chef", "culinari", "culin.ri"] },
  { en: "Cruise Ship Murder Mystery Party Guide", keywords: ["cruise", "croisi.re", "crociera", "cruzeiro", "navire", "nave", "navio"] },
  { en: "Detective Murder Mystery Themes", keywords: ["detective", "d.tective", "investigat"] },
  { en: "Haunted Hotel Murder Mystery Party Guide", keywords: ["haunted hotel", "hotel hant", "hotel infest", "hotel assombrad"] },
  { en: "How to Fix Boring Murder Mystery Parties", keywords: ["boring", "ennuyeus", "noios", "chata"] },
  { en: "How to Fix Confusing Murder Mystery Clues", keywords: ["confusing clue", "indices confus", "indizi confus", "pistas confus"] },
  { en: "How to Fix Guests Breaking Character", keywords: ["breaking character", "personnage", "personaggio", "personagem", "hors personn", "fuori person", "quebrando"] },
  { en: "How to Fix Guests Who Won't Participate", keywords: ["won't participate", "ne participent", "non partecipano", "n.o participam"] },
  { en: "How to Fix Overly Complex Murder Mysteries", keywords: ["complex", "complessi", "complexos"] },
  { en: "How to Fix Poor Mystery Pacing Issues", keywords: ["pacing", "rythme", "ritmo"] },
  { en: "How to Fix Unrealistic Murder Mystery Plots", keywords: ["unrealistic", "irr.aliste", "irrealistic", "irrealista", "r.alisme", "realismo"] },
  { en: "How to Fix Unsatisfying Mystery Endings", keywords: ["unsatisfying", "insatisfais", "insoddisfac", "insatisfat.ri", "conclusion", "finali"] },
  { en: "How to Host a Fairy Tale Murder Mystery Party", keywords: ["fairy tale", "conte de f.es", "fiab", "conto de fadas"] },
  { en: "How to Host a Hollywood Murder Mystery Party", keywords: ["hollywood"] },
  { en: "How to Host a Medieval Castle Murder Mystery", keywords: ["medieval castle", "ch.teau m.di.val", "castello medieval", "castelo medieval"] },
  { en: "How to Host a Prohibition Era Murder Mystery", keywords: ["prohibition", "proibizion", "proibicion"] },
  { en: "How to Host a Space Station Murder Mystery", keywords: ["space station", "station spatiale", "stazione spaziale", "esta..o espacial"] },
  { en: "How to Host a Steampunk Murder Mystery Party", keywords: ["steampunk"] },
  { en: "How to Host a Superhero Murder Mystery Party", keywords: ["superhero", "super-h.ro", "supereroi", "super-her.is"] },
  { en: "How to Host a Victorian Murder Mystery Party", keywords: ["victorian", "victorien", "vittoria", "vitorian"] },
  { en: "How to Host a Zombie Apocalypse Murder Mystery", keywords: ["zombie", "zumbi", "apocalypse", "apocaliss"] },
  { en: "Innocent Bystander Murder Mystery Themes", keywords: ["innocent bystander", "t.moin innocent", "testimone innocent", "espectador inocent", "bystander"] },
  { en: "Jazz Club Murder Mystery Party Planning", keywords: ["jazz"] },
  { en: "Journalist Murder Mystery Themes", keywords: ["journalist", "journaliste", "giornalista", "jornalista"] },
  { en: "Lawyer Murder Mystery Themes", keywords: ["lawyer", "avocat", "avvocato", "advogado", "legal", "legale", "juridiq"] },
  { en: "Medical Examiner Murder Mystery Themes", keywords: ["medical examiner", "m.decin l.giste", "medico legale", "perito m.dic", "forensi", "forense"] },
  { en: "Murder Mystery Party for Birthday Celebrations", keywords: ["birthday", "anniversaire", "compleanno", "anivers.rio"] },
  { en: "Murder Mystery Party for Corporate Events", keywords: ["corporate", "entreprise", "aziendal", "corporativ", "eventi aziendal"] },
  { en: "Murder Mystery Party for Date Night Ideas", keywords: ["date night", "soiree couple", "serata coppia", "encontro rom.ntic", "soiree amoureux"] },
  { en: "Murder Mystery Party for Dinner Parties", keywords: ["dinner part", "d.ner", "cena", "jantar"] },
  { en: "Murder Mystery Party for Game Night Groups", keywords: ["game night", "soiree jeu", "serata gioco", "noite de jog"] },
  { en: "Murder Mystery Party for Holiday Gatherings", keywords: ["holiday gather", "vacances", "festiv", "f.tes", "natal", "riunioni festiv", "reuni.es festiv"] },
  { en: "Murder Mystery Party for Office Teams", keywords: ["office team", ".quipe bureau", "team ufficio", "equipe escrit.rio", "equipes de escrit.rio"] },
  { en: "Murder Mystery Party for Small Groups Ideas", keywords: ["small group", "petits groupe", "piccoli grupp", "grupos pequen"] },
  { en: "Murder Mystery Party for Teenagers Guide", keywords: ["teenager", "adolescent", "ado"] },
  { en: "Socialite Murder Mystery Themes", keywords: ["socialite", "mondain", "socialit", "alta socied", "alta societ"] },
  { en: "Spa Resort Murder Mystery Party Guide", keywords: ["spa resort", "spa", "d.tente", "rilassar", "relaxe"] },
  { en: "Unique Archaeological Dig Murder Mystery", keywords: ["archaeological", "arch.ologiq", "archeologico", "arqueol.gic", "fouill", "scavo", "escava..o"] },
  { en: "Unique Circus Murder Mystery Plot Ideas", keywords: ["circus plot", "cirque", "circo", "idee trame", "ideias enredo"] },
  { en: "Unique Film Noir Murder Mystery Plots", keywords: ["film noir", "cinema noir"] },
  { en: "Unique Medieval Murder Mystery Plot Ideas", keywords: ["medieval plot", "m.di.val", "medieval idee", "medieval uniq"] },
  { en: "Unique Pirate Murder Mystery Plot Ideas", keywords: ["pirate", "pirata", "pirati"] },
  { en: "Unique School Reunion Murder Mystery Plots", keywords: ["school reunion", "reunion scolair", "riunione scolastic", "reuni.o escolar"] },
  { en: "Unique Space Colony Murder Mystery Plots", keywords: ["space colony", "colonie spatial", "colonia spazial", "col.nia espacial"] },
  { en: "Unique Train Station Murder Mystery Plots", keywords: ["train station", "gare", "stazione", "esta..o de trem", "ferroviari"] },
  { en: "Unique Underwater Murder Mystery Plots", keywords: ["underwater", "sous-marin", "subacque", "submarin"] },
  { en: "Villain Murder Mystery Themes", keywords: ["villain", "m.chant", "cattiv", "vil.o", "antagonist"] },
  { en: "Wild West Murder Mystery Party Planning", keywords: ["wild west", "far west", "selvaggio west", "velho oeste", "western"] },
];

function findMatch(posts, keywords) {
  for (const p of posts) {
    const combined = (p.slug + ' ' + p.title).toLowerCase();
    for (const kw of keywords) {
      // Use a simple includes check, converting regex-like patterns to actual regex
      const pattern = kw.replace(/\./g, '.'); // dots in keywords match any char
      try {
        if (new RegExp(pattern, 'i').test(combined)) {
          return p;
        }
      } catch {
        if (combined.includes(kw.toLowerCase())) {
          return p;
        }
      }
    }
  }
  return null;
}

async function run() {
  const [frPosts, itPosts, ptPosts] = await Promise.all([
    fetchPosts('fr'), fetchPosts('it'), fetchPosts('pt'),
  ]);

  for (const [lang, posts] of [['FR', frPosts], ['IT', itPosts], ['PT', ptPosts]]) {
    console.log(`\n=== ${lang} (${posts.length} posts) - MISSING TRANSLATIONS ===`);
    const missing = [];
    const matched = new Set();
    
    for (const enPost of EN_POSTS_KEYWORDS) {
      const match = findMatch(posts, enPost.keywords);
      if (match) {
        matched.add(match.id);
      } else {
        missing.push(enPost.en);
      }
    }
    
    if (missing.length > 0) {
      console.log(`Missing ${missing.length} translations:`);
      for (const m of missing) {
        console.log(`  - ${m}`);
      }
    } else {
      console.log('All 61 English posts have translations!');
    }

    // Check for extra posts (not matched to any English post)
    const extras = posts.filter(p => !matched.has(p.id));
    if (extras.length > 0) {
      console.log(`\nExtra posts (${extras.length}) not matched to any English post:`);
      for (const p of extras) {
        console.log(`  id=${p.id} title="${p.title}"`);
      }
    }
  }
}

run();
