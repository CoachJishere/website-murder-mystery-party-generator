import fs from 'fs';

const auditData = JSON.parse(
  fs.readFileSync('./translation-audit-full.json', 'utf-8')
);

const masterPosts = auditData.master.posts;
const ptPosts = auditData.languages.pt.posts;

// Manual mapping based on careful review of titles
// English title patterns -> Portuguese title patterns
const confirmedPresent = [
  { en: 'school reunion', pt: 'reunião escolar' },  // #29
  { en: 'archaeological dig', pt: 'escavação arqueológica' },  // #19
  { en: 'date night', pt: 'encontros românticos' },  // #3
  { en: 'beach resort', pt: 'resort de praia' },  // #4, #22
  { en: 'film noir', pt: 'cinema noir' },  // #5
  { en: 'ice hotel', pt: 'hotel de gelo' },  // #6
  { en: 'casino', pt: 'cassino' },  // #7
  { en: 'graduation', pt: 'formatura' },  // #8, #40
  { en: 'office team', pt: 'equipes de escritório' },  // #9
  { en: 'small group', pt: 'grupos pequenos' },  // #10
  { en: 'wild west', pt: 'velho oeste' },  // #11
  { en: 'medical examiner', pt: 'peritos médicos' },  // #12
  { en: 'train station', pt: 'estação de trem' },  // #13
  { en: 'space colony', pt: 'colônia espacial' },  // #14
  { en: 'birthday', pt: 'aniversário' },  // #15
  { en: 'holiday gatherings', pt: 'reuniões festivas' },  // #16
  { en: 'medieval', pt: 'medieval' },  // #1, #17
  { en: 'cruise ship', pt: 'navio de cruzeiro' },  // #18
  { en: 'game night', pt: 'noite de jogos' },  // #20, #46
  { en: 'circus', pt: 'circo' },  // #21, #23
  { en: 'art gallery', pt: 'galeria de arte' },  // #24
  { en: 'prohibition', pt: 'proibicionista' },  // #25
  { en: 'corporate event', pt: 'eventos corporativos' },  // #26
  { en: 'spa resort', pt: 'spa resort' },  // #27
  { en: 'socialite', pt: 'socialites' },  // #28
  { en: 'ancient egypt', pt: 'egito antigo' },  // #30
  { en: 'spy thriller', pt: 'espionagem thriller' },  // #31
  { en: 'butler', pt: 'mordomo' },  // #32
  { en: 'bookstore', pt: 'livraria' },  // #33
  { en: 'haunted mansion', pt: 'mansão assombrada' },  // #34
  { en: 'jazz club', pt: 'clube de jazz' },  // #35
  { en: 'pirate', pt: 'piratas' },  // #36
  { en: 'zombie apocalypse', pt: 'apocalipse zumbi' },  // #37
  { en: 'hollywood', pt: 'hollywood' },  // #38
  { en: 'superhero', pt: 'super-heróis' },  // #39
  { en: 'mountain lodge', pt: 'lodge de montanha' },  // #41
  { en: 'detective', pt: 'detetive' },  // #42
  { en: 'renaissance', pt: 'renascentista' },  // #43
  { en: 'chef', pt: 'chef' },  // #44
  { en: 'villain', pt: 'vilões' },  // #45
  { en: 'steampunk', pt: 'steampunk' },  // #47
  { en: 'underwater', pt: 'submarino' },  // #48
  { en: 'haunted hotel', pt: 'hotel assombrado' },  // #49
  { en: 'fairy tale', pt: 'conto de fadas' },  // #50
  { en: 'teenagers', pt: 'adolescentes' },  // #2
];

// Find missing by process of elimination
const ptTitleLower = ptPosts.map(p => p.title.toLowerCase());
const foundMasterIds = new Set();

for (const master of masterPosts) {
  const titleLower = master.title.toLowerCase();
  const slugLower = master.slug.toLowerCase();

  for (const { en, pt } of confirmedPresent) {
    if ((titleLower.includes(en) || slugLower.includes(en.replace(/ /g, '-')))) {
      // Check if PT has this
      const hasPt = ptTitleLower.some(t => t.includes(pt));
      if (hasPt) {
        foundMasterIds.add(master.id);
        break;
      }
    }
  }
}

const missingPosts = masterPosts.filter(p => !foundMasterIds.has(p.id));

console.log(`Found: ${foundMasterIds.size}`);
console.log(`Missing: ${missingPosts.length}`);
console.log(`Expected missing: 11\n`);

console.log('=== MISSING POSTS ===\n');
missingPosts.forEach((p, idx) => {
  console.log(`${idx + 1}. [${p.id}]`);
  console.log(`   ${p.title}`);
  console.log(`   Slug: ${p.slug}\n`);
});

// Save to file
const output = {
  language: 'pt',
  totalMissing: missingPosts.length,
  missingPosts: missingPosts.map(p => ({
    id: p.id,
    slug: p.slug,
    title: p.title
  }))
};

fs.writeFileSync('./pt-missing-posts.json', JSON.stringify(output, null, 2));
console.log('✓ Saved to pt-missing-posts.json');
