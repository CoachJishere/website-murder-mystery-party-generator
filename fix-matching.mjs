// Fix matching to understand true state. Use broader keyword matching.
const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';
const headers = { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY };

async function fetchPosts(lang) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?select=id,slug,title&language=eq.${lang}&status=eq.published&order=title.asc`, { headers });
  return res.json();
}

// Better approach: map each EN post to a unique identifier and manually match FR/IT/PT titles
const TOPIC_MAP = {
  "1920s Speakeasy": /speakeasy|1920|clandestin/i,
  "Beach Resort": /beach.?resort|resort.?praia|resort.?plage|resort.?balnear|5.*(plage|praia|spiaggia)/i,
  "Casino": /casino|cassino/i,
  "Haunted Mansion": /haunted.?mansion|manoir.?hant|villa.?stregat|mans.o.?assombrad/i,
  "Masquerade Ball": /masquerad|masqu[eé]|mascher|m[áa]scar/i,
  "Mountain Lodge": /mountain.?lodge|chalet.?montag|rifug.?montan|lodge.?montanh/i,
  "Renaissance": /renaissance|rinasciment|renasciment/i,
  "Spy Thriller": /spy.?thriller|espion|spionag/i,
  "Vintage Circus": /vintage.?circus|cirque.?vintage|circo.?vintage|big.?top|chapiteau|tendone.*(intrigo|intriga)/i,
  "Ancient Egypt": /ancient.?egypt|egypt.?antiq|egitto.?antic|egito.?antig|antico.?egitt|antigo.?egit/i,
  "Art Gallery": /art.?gallery|galerie.?d.art|galleria.*(arte|dart)|galeria.?de.?arte/i,
  "Bookstore": /bookstore|librairie|libreria(?!.*circo)|livraria/i,
  "Butler": /butler|majordome|maggiordomo|mordomo/i,
  "Chef": /chef(?!.*circo)|culinari.*(crime|secret|segret)/i,
  "Cruise Ship": /cruise.?ship|croisi.re|crocier|cruzeiro|navio|nave.*(croci|crocier)/i,
  "Detective": /detective|d[ée]tective|investigat.*(professi|person)/i,
  "Haunted Hotel": /haunted.?hotel|hotel.*(hant|infest|assombrad|fantasma)/i,
  "Fix Boring": /fix.?boring|ennuyeu|noios|chata|boring/i,
  "Fix Confusing Clues": /confusing.?clue|indices.?confus|indizi.?confus|pistas.?confus/i,
  "Fix Breaking Character": /breaking.?character|hors.?person|fuori.?person|quebrando.?o.?person|ospiti.*escono.*personagg/i,
  "Fix Won't Participate": /won.?t.?participate|ne.?participent|non.?partecipano|n.o.?participam/i,
  "Fix Complex": /overly.?complex|trop.?complex|troppo.?compless|excessivamente.?complex/i,
  "Fix Pacing": /pacing|rythme.*(myst|murd)|ritmo.*(mist|murd)|timing.*(myst|murd)/i,
  "Fix Unrealistic": /unrealistic|irr[ée]aliste|irrealisti|irrealista/i,
  "Fix Unsatisfying": /unsatisfying|insatisfais|insoddisfac|insatisfat[oó]ri/i,
  "Fairy Tale": /fairy.?tale|conte.?de.?f[eé]/i,
  "Hollywood": /hollywood/i,
  "Medieval Castle": /medieval.?castle|ch[aâ]teau.?m[eé]di[eé]val|castello.?medieval|castelo.?medieval/i,
  "Prohibition Era": /prohibition.?era|[eè]re.*(prohibition|proibizion|proibicion)|prohibition.*bootleg|contrabband|contrabando/i,
  "Space Station": /space.?station|station.?spatial|stazione.?spazial|esta[çc][aã]o.?espacial/i,
  "Steampunk": /steampunk/i,
  "Superhero": /superhero|super.?h[eé]ro|supereroi|super.?her[oó]i/i,
  "Victorian": /victorian|victorien|vittoria|vitorian/i,
  "Zombie": /zombie|zumbi|apocalyps/i,
  "Innocent Bystander": /innocent.?bystander|t[eé]moin.?innocent|spettator.?innocent|espectador.?inocent|bystander|t[eé]moignage/i,
  "Jazz Club": /jazz.?club|club.?jazz/i,
  "Journalist": /journalist|journaliste|giornalista|jornalista/i,
  "Lawyer": /lawyer|avocat|avvocato|advogado|l[eé]gal|legale|juridiq|tribunal|aula/i,
  "Medical Examiner": /medical.?examiner|m[eé]decin.?l[eé]giste|medico.?legale|perit.?m[eé]dic|forensi|forense/i,
  "Birthday": /birthday|anniversaire|compleanno|anivers[aá]rio/i,
  "Corporate Events": /corporate.?event|[eé]v[eé]nement.*entreprise|eventi.?azien|eventos.?corporativ/i,
  "Date Night": /date.?night|soir[eé]e.*(couple|amoureux)|serata.?coppia|encontro.?rom[aâ]ntic/i,
  "Dinner Parties": /dinner.?part|d[iî]ner|cena.*intrigo|jantar|culinaire.*intrigue|culinaria.*intrigo/i,
  "Game Night": /game.?night|soir[eé]e.?(de.?)?jeu|serat.*(gioc|gioch)|noite.?de.?jog/i,
  "Graduation": /graduation|dipl[oô]me|laurea|formatura/i,
  "Holiday Gatherings": /holiday.?gather|vacances|f[eê]tes|festiv|natal|riunioni.?festiv|reuni[oõ]es.?festiv/i,
  "Office Teams": /office.?team|[eé]quipe.*bureau|team.*ufficio|equip.*escrit[oó]rio/i,
  "Small Groups": /small.?group|petit.*groupe|piccol.*grupp|grupo.*pequen/i,
  "Teenagers": /teenager|adolescent/i,
  "Socialite": /socialite|mondain|alta.?socied|alta.?societ/i,
  "Spa Resort": /spa.?resort|spa.*(danger|p[eé]rigo|pericol)|relax.*(danger|p[eé]rigo|pericol)/i,
  "Archaeological Dig": /archaeological|arch[eé]ologiq|archeologico|arqueol[oó]gic|fouill|scavo|escava[cç]/i,
  "Circus Plot": /circus.*(plot|trame|enredo|idee)|cirque.*(idée|trame)|circo.*(idee|enredo)|plot.*circus/i,
  "Film Noir": /film.?noir|cinema.?noir/i,
  "Medieval Plot": /medieval.*(plot|idée|idee|enredo)|unique.*medieval.*plot/i,
  "Pirate": /pirate|pirata|pirati/i,
  "School Reunion": /school.?reunion|r[eé]union.?scolair|riunion.?scolastic|reuni[aã]o.?escolar/i,
  "Space Colony": /space.?colony|coloni.?spatial|coloni.?spazial|col[oô]nia.?espacial/i,
  "Train Station": /train.?station|gare|stazion.*(treno|ferrov)|esta[çc][aã]o.*(trem|ferrov)/i,
  "Underwater": /underwater|sous.?marin|subacque|submarin/i,
  "Villain": /villain.?theme|m[eé]chant.*(theme|myst)|cattiv.*(tema|mist)|vil[aã]o.*(tema|mist)|antagonist|menti.?crimin/i,
  "Wild West": /wild.?west|far.?west|selvaggio.?west|velho.?oeste/i,
};

async function run() {
  const [frPosts, itPosts, ptPosts] = await Promise.all([
    fetchPosts('fr'), fetchPosts('it'), fetchPosts('pt'),
  ]);

  for (const [lang, posts] of [['FR', frPosts], ['IT', itPosts], ['PT', ptPosts]]) {
    console.log(`\n=== ${lang} (${posts.length} posts) ===`);
    const matched = {};
    const unmatchedPosts = [];

    for (const p of posts) {
      const text = p.slug + ' ' + p.title;
      let found = false;
      for (const [topic, regex] of Object.entries(TOPIC_MAP)) {
        if (regex.test(text)) {
          if (!matched[topic]) matched[topic] = [];
          matched[topic].push(p);
          found = true;
          break;
        }
      }
      if (!found) unmatchedPosts.push(p);
    }

    // Missing topics
    const missing = Object.keys(TOPIC_MAP).filter(t => !matched[t]);
    console.log(`Matched: ${Object.keys(matched).length}/61`);
    console.log(`Missing (${missing.length}):`);
    for (const m of missing) console.log(`  - ${m}`);
    
    // Duplicates (same topic matched multiple times)
    const dupes = Object.entries(matched).filter(([,arr]) => arr.length > 1);
    if (dupes.length > 0) {
      console.log(`\nDuplicate topics:`);
      for (const [topic, arr] of dupes) {
        console.log(`  ${topic} (${arr.length}):`);
        for (const p of arr) console.log(`    "${p.title}"`);
      }
    }

    // Unmatched posts
    if (unmatchedPosts.length > 0) {
      console.log(`\nUnmatched posts (${unmatchedPosts.length}):`);
      for (const p of unmatchedPosts) console.log(`  "${p.title}"`);
    }
  }
}

run();
