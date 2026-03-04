const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';
const headers = { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY };

async function fetchPosts(lang) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?select=id,slug,title&language=eq.${lang}&status=eq.published&order=title.asc`, { headers });
  return res.json();
}

// 61 English post titles mapped to the canonical topic name
const EN_TOPICS = [
  "1920s Speakeasy",
  "Beach Resort",
  "Casino",
  "Haunted Mansion",
  "Masquerade Ball",
  "Mountain Lodge",
  "Renaissance",
  "Spy Thriller",
  "Vintage Circus",
  "Ancient Egypt",
  "Art Gallery",
  "Bookstore",
  "Butler",
  "Chef",
  "Cruise Ship",
  "Detective",
  "Haunted Hotel",
  "Fix Boring",
  "Fix Confusing Clues",
  "Fix Breaking Character",
  "Fix Won't Participate",
  "Fix Complex",
  "Fix Pacing",
  "Fix Unrealistic",
  "Fix Unsatisfying",
  "Fairy Tale",
  "Hollywood",
  "Medieval Castle",
  "Prohibition Era",
  "Space Station",
  "Steampunk",
  "Superhero",
  "Victorian",
  "Zombie",
  "Innocent Bystander",
  "Jazz Club",
  "Journalist",
  "Lawyer",
  "Medical Examiner",
  "Birthday",
  "Corporate Events",
  "Date Night",
  "Dinner Parties",
  "Game Night",
  "Graduation",
  "Holiday Gatherings",
  "Office Teams",
  "Small Groups",
  "Teenagers",
  "Socialite",
  "Spa Resort",
  "Archaeological Dig",
  "Circus Plot",
  "Film Noir",
  "Medieval Plot",
  "Pirate",
  "School Reunion",
  "Space Colony",
  "Train Station",
  "Underwater",
  "Villain",
  "Wild West",
];

// Now for each language, manually match by reading through the titles
// Return the unmatched topics

function matchPost(title, slug) {
  const t = (title + ' ' + slug).toLowerCase();
  
  if (/speakeasy|1920/.test(t)) return "1920s Speakeasy";
  if (/beach.?resort|resort.?(praia|balnear|plage|spiaggia)/.test(t) && !/spa/.test(t)) return "Beach Resort";
  if (/casino|cassino/.test(t)) return "Casino";
  if (/haunted.?mansion|manoir.?hant|villa.?stregat|mans.o.?assombrad|5.*(hant|streg|assombr).*mansion/.test(t)) return "Haunted Mansion";
  if (/masquerad|masqu[eé]|mascher|m[áa]scar|baile.*m[áa]scar/.test(t)) return "Masquerade Ball";
  if (/mountain.?lodge|chalet|rifug.*montan|lodge.*montanh|montagne.*chalet|temi.*rifug|thèmes.*chalet|5.*(montagne|montan|montanh)/.test(t)) return "Mountain Lodge";
  if (/renaissance|rinasciment|renasciment/.test(t)) return "Renaissance";
  if (/spy.?thriller|espion|spionag|undercover|disfarç/.test(t)) return "Spy Thriller";
  if (/vintage.?circus|cirque.?vintage|circo.?vintage|big.?top|chapiteau|tendone.*intrig|5.*(circo|cirque).*(vintage|tendone|chapiteau)/.test(t)) return "Vintage Circus";
  if (/ancient.?egypt|egypt.*antiq|egitto.*antic|egito.*antig|[eé]gypte.*antiq|antico.*egitt|antigo.*egit|guida.*egitto|guia.*egito/.test(t)) return "Ancient Egypt";
  if (/art.?gallery|galerie.?d.?art|galleria.*art|galeria.*arte/.test(t)) return "Art Gallery";
  if (/bookstore|librairie|libreri|livrari/.test(t) && !/circo|circus/.test(t)) return "Bookstore";
  if (/butler|majordome|maggiordomo|mordomo/.test(t)) return "Butler";
  if (/chef.*(theme|murder|myst|mist|crim|culin)|culinari.*(crime|secret|segret|mist)/.test(t)) return "Chef";
  if (/cruise.?ship|croisi[eè]re|crocier|cruzeiro|navio.*cruzeiro|nave.*crocier/.test(t)) return "Cruise Ship";
  if (/detective.*theme|theme.*detective|d[eé]tective.*th[eè]m|person.*detective|investigat.*(profess|person|avvincent|convincent)/.test(t)) return "Detective";
  if (/haunted.?hotel|hotel.*(hant|infest|assombrad|fantasma)/.test(t)) return "Haunted Hotel";
  if (/boring|ennuyeu|noios|noiose|chata/.test(t)) return "Fix Boring";
  if (/confusing.?clue|indices.?confus|indizi.?confus|pistas.?confus/.test(t)) return "Fix Confusing Clues";
  if (/breaking.?character|hors.?person|fuori.?person|quebrando.*person|escono.*personagg|ospiti.*escono|corrigi.*quebrando/.test(t)) return "Fix Breaking Character";
  if (/(won.?t.?participat|ne.?participent|non.?partecip|n[aã]o.?participam)/.test(t)) return "Fix Won't Participate";
  if (/overly.?complex|trop.?complex|troppo.?compless|excessivamente.?complex/.test(t)) return "Fix Complex";
  if (/pacing|rythme.*(myst|murd|polic|enqu)|ritmo.*(mist|murd|giall|assas)|timing.*(myst|murd|mist)/.test(t)) return "Fix Pacing";
  if (/unrealistic|irr[eé]aliste|irrealisti|irrealista/.test(t)) return "Fix Unrealistic";
  if (/unsatisfying|insatisfais|insoddisfac|insatisfat[oó]ri/.test(t)) return "Fix Unsatisfying";
  if (/fairy.?tale|conte.?de.?f[eé]|fiab|conto.?de.?fada/.test(t)) return "Fairy Tale";
  if (/hollywood/.test(t)) return "Hollywood";
  if (/medieval.?castle|ch[aâ]teau.*m[eé]di[eé]val|castello.*medieval|castelo.*medieval|medieval.*castle|guida.*passo.*medieval/.test(t)) return "Medieval Castle";
  if (/prohibition|proibizion|proibicion|bootleg|contrabbando|contrabando|[eè]re.*prohibition/.test(t) && !/jazz/.test(t)) return "Prohibition Era";
  if (/space.?station|station.?spatial|stazione.?spazial|esta[çc][aã]o.?espacial/.test(t)) return "Space Station";
  if (/steampunk/.test(t)) return "Steampunk";
  if (/superhero|super.?h[eé]ro|supereroi|super.?her[oó]i/.test(t)) return "Superhero";
  if (/victorian|victorien|vittoria|vitorian/.test(t) && !/steampunk/.test(t)) return "Victorian";
  if (/zombie|zumbi|apocalyps/.test(t)) return "Zombie";
  if (/innocent.?bystander|t[eé]moin.*innocent|spettator.*innocent|espectador.*inocent|bystander/.test(t)) return "Innocent Bystander";
  if (/jazz.?club|club.*jazz|planification.*jazz|pianificazione.*jazz|planejamento.*jazz/.test(t)) return "Jazz Club";
  if (/journalist|journaliste|giornalista|jornalista|report.*investigati/.test(t)) return "Journalist";
  if (/lawyer|avocat|avvocato|advogado|courtroom|tribunal|aula.*legal|legale.*intrig|juridiq/.test(t)) return "Lawyer";
  if (/medical.?examiner|m[eé]decin.?l[eé]gist|medico.?legal|perit.*m[eé]dic|forensi.*expert|expert.*forensi|forense.*resolv/.test(t)) return "Medical Examiner";
  if (/birthday|anniversaire|compleanno|anivers[aá]rio/.test(t)) return "Birthday";
  if (/corporate.?event|[eé]v[eé]nement.*entreprise|eventi.*aziend|eventos.*corporativ/.test(t)) return "Corporate Events";
  if (/date.?night|soir[eé]e.*(couple|amoureux)|serata.*coppia|encontro.*rom[aâ]ntic/.test(t)) return "Date Night";
  if (/dinner.?part|d[iî]ner.*intrigue|cena.*intrig|jantar.*intrig|culinaire.*intrigue|culinaria.*intrig|culin[aá]ri.*intrig/.test(t)) return "Dinner Parties";
  if (/game.?night|soir[eé]e.*(de.?)?jeu|serat.*(gioc|gioch)|noite.*jog/.test(t)) return "Game Night";
  if (/graduation|dipl[oô]me|laurea|formatura/.test(t)) return "Graduation";
  if (/holiday.?gather|rassemblement.*vacance|riunion.*festiv|reuni[oõ].*festiv|festiv.*fun/.test(t)) return "Holiday Gatherings";
  if (/office.?team|[eé]quipe.*bureau|team.*ufficio|equip.*escrit[oó]rio/.test(t)) return "Office Teams";
  if (/small.?group|petit.*groupe|piccol.*grupp|grupo.*pequen/.test(t)) return "Small Groups";
  if (/teenager|adolescent/.test(t)) return "Teenagers";
  if (/socialite|mondain|alta.*socied|alta.*societ|high.*society/.test(t)) return "Socialite";
  if (/spa.?resort|spa.*(danger|p[eé]rigo|pericol|luxe|lusso|luxo)|relax.*(danger|luxe|lusso|luxo|pericol)/.test(t)) return "Spa Resort";
  if (/archaeological|arch[eé]ologiq|archeologico|arqueol[oó]gic|fouill|scavo|escava[cç]/.test(t)) return "Archaeological Dig";
  if (/(circus|cirque|circo).*(plot|trame|enredo|id[eé]e)|id[eé]e.*(cirque|circo)|enredo.*(circo)/.test(t) && !/vintage/.test(t)) return "Circus Plot";
  if (/film.?noir|cinema.?noir/.test(t)) return "Film Noir";
  if (/(medieval|m[eé]di[eé]val).*(plot|id[eé]e|enredo)|id[eé]e.*m[eé]di[eé]val|enredo.*medieval|unique.*medieval.*plot/.test(t) && !/castle|ch[aâ]teau|castello|castelo/.test(t)) return "Medieval Plot";
  if (/pirate|pirata|pirati/.test(t)) return "Pirate";
  if (/school.?reunion|r[eé]union.*scolair|riunion.*scolastic|reuni[aã]o.*escolar/.test(t)) return "School Reunion";
  if (/space.?colony|coloni.*spatial|coloni.*spazial|col[oô]nia.*espacial/.test(t)) return "Space Colony";
  if (/train.?station|gare|stazion.*(treno|ferrov)|esta[çc][aã]o.*(trem|ferrov)|ferroviari/.test(t)) return "Train Station";
  if (/underwater|sous.?marin|subacque|submarin/.test(t)) return "Underwater";
  if (/villain|m[eé]chant.*(theme|myst)|cattiv.*(tema|mist)|vil[aã]o.*(tema|mist)|antagonist|menti.*crimin/.test(t) && !/super/.test(t)) return "Villain";
  if (/wild.?west|far.?west|selvaggio.?west|velho.?oeste/.test(t)) return "Wild West";
  
  return null;
}

async function run() {
  const [enPosts, frPosts, itPosts, ptPosts] = await Promise.all([
    fetchPosts('en'), fetchPosts('fr'), fetchPosts('it'), fetchPosts('pt'),
  ]);

  // Match EN posts to topics first to verify our mapping works
  console.log('=== EN TOPIC MATCHING ===');
  const enMatched = {};
  const enUnmatched = [];
  for (const p of enPosts) {
    const topic = matchPost(p.title, p.slug);
    if (topic) {
      enMatched[topic] = p;
    } else {
      enUnmatched.push(p);
    }
  }
  console.log(`Matched: ${Object.keys(enMatched).length}/61`);
  if (enUnmatched.length > 0) {
    console.log('Unmatched EN:');
    for (const p of enUnmatched) console.log(`  "${p.title}" slug="${p.slug}"`);
  }
  
  // Now for each translated language
  for (const [lang, posts] of [['FR', frPosts], ['IT', itPosts], ['PT', ptPosts]]) {
    console.log(`\n=== ${lang} (${posts.length} posts) ===`);
    const matched = {};
    const unmatched = [];
    const duplicates = {};
    
    for (const p of posts) {
      const topic = matchPost(p.title, p.slug);
      if (topic) {
        if (matched[topic]) {
          // Duplicate topic
          if (!duplicates[topic]) duplicates[topic] = [matched[topic]];
          duplicates[topic].push(p);
        } else {
          matched[topic] = p;
        }
      } else {
        unmatched.push(p);
      }
    }
    
    const missingTopics = EN_TOPICS.filter(t => !matched[t]);
    console.log(`Matched: ${Object.keys(matched).length}/61`);
    console.log(`Missing (${missingTopics.length}):`);
    for (const t of missingTopics) console.log(`  - ${t}`);
    
    if (Object.keys(duplicates).length > 0) {
      console.log(`Duplicates:`);
      for (const [topic, posts] of Object.entries(duplicates)) {
        console.log(`  ${topic}: ${posts.length + 1} copies`);
      }
    }
    
    if (unmatched.length > 0) {
      console.log(`Unmatched posts (${unmatched.length}):`);
      for (const p of unmatched) console.log(`  "${p.title}" slug="${p.slug}"`);
    }
  }
}

run();
