import fs from 'fs';

const auditData = JSON.parse(
  fs.readFileSync('./translation-audit-full.json', 'utf-8')
);

const masterPosts = auditData.master.posts;
const ptPosts = auditData.languages.pt.posts;

// Manual verification based on PT titles list:
// These are confirmed PRESENT in Portuguese (50 posts)
const confirmedPresentSlugs = [
  'unique-medieval-murder-mystery-plot-ideas', // #1 Medieval
  'murder-mystery-party-for-teenagers-guide', // #2 Adolescentes
  'murder-mystery-party-for-date-night-ideas-where-romance-meets-mystery', // #3 Encontros Românticos
  '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable', // #4, #22 Praia (duplicate)
  'unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime', // #5 Cinema Noir
  'unique-ice-hotel-murder-mystery-plots-frozen-adventures-with-arctic-suspense-and-cold-blooded-crimes', // #6 Hotel de Gelo
  '5-casino-murder-mystery-party-themes-roll-the-dice-on-deadly-high-stakes-drama', // #7 Cassino
  'murder-mystery-party-for-graduation-celebrations-mysteries-of-academic-achievement-and-educational-excellence', // #8, #40 Formaturas (duplicate)
  'murder-mystery-party-for-office-teams-build-bonds-through-collaborative-investigation', // #9 Escritório
  'murder-mystery-party-for-small-groups-ideas', // #10 Grupos Pequenos
  'wild-west-murder-mystery-party-planning', // #11 Velho Oeste
  'medical-examiner-murder-mystery-themes-forensic-investigations', // #12 Peritos Médicos
  'unique-train-station-murder-mystery-plots-all-aboard-for-danger-and-intrigue', // #13 Estação de Trem
  'unique-space-colony-murder-mystery-plots-explore-the-final-frontier-of-crime', // #14 Colônia Espacial
  'murder-mystery-party-for-birthday-celebrations-make-their-special-day-unforgettable', // #15 Aniversário
  'murder-mystery-party-for-holiday-gatherings-festive-fun-meets-family-intrigue', // #16 Reuniões Festivas
  'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue', // #17 Castelo Medieval
  'cruise-ship-murder-mystery-party-guide-set-sail-for-murder-on-the-high-seas', // #18 Navio de Cruzeiro
  'unique-archaeological-dig-murder-mystery-unearth-ancient-secrets-and-modern-murders', // #19 Escavação Arqueológica
  'murder-mystery-party-for-game-night-groups-transform-your-regular-game-night', // #20, #46 Noite de Jogos (duplicate)
  'unique-circus-murder-mystery-plot-ideas', // #21 Circo
  '5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue', // #23 Circo Vintage
  'art-gallery-murder-mystery-party-planning-create-sophisticated-creative-crimes', // #24 Galeria de Arte
  'how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement', // #25 Era Proibicionista
  'murder-mystery-party-for-corporate-events', // #26 Eventos Corporativos
  'spa-resort-murder-mystery-party-guide-relax-into-danger-and-luxury', // #27 Spa Resort
  'socialite-murder-mystery-themes-high-society-scandals-elite-intrigue', // #28 Socialites
  'unique-school-reunion-murder-mystery-plots-that-uncover-buried-secrets', // #29 Reunião Escolar
  'ancient-egypt-murder-mystery-party-guide', // #30 Egito Antigo
  '5-spy-thriller-murder-mystery-themes-that-will-have-your-guests-going-undercover', // #31 Espionagem Thriller
  'butler-murder-mystery-themes-manor-murders-household-secrets', // #32 Mordomo
  'bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder', // #33 Livraria
  '5-haunted-mansion-murder-mystery-themes', // #34 Mansão Assombrada
  'jazz-club-murder-mystery-party-planning-swing-into-prohibition-era-crime', // #35 Clube de Jazz
  'unique-pirate-murder-mystery-plot-ideas', // #36 Piratas
  'how-to-host-a-zombie-apocalypse-murder-mystery-that-will-have-your-guests-fighting-for-survival', // #37 Apocalipse Zumbi
  'how-to-host-a-hollywood-murder-mystery-party', // #38 Hollywood
  'how-to-host-a-superhero-murder-mystery-party-powers-secret-identities-and-super-villains', // #39 Super-Heróis
  '5-mountain-lodge-murder-mystery-themes-that-will-make-your-retreat-unforgettable', // #41 Lodge de Montanha
  'detective-murder-mystery-themes-professional-investigators-sleuth-dynamics', // #42 Detetive
  '5-renaissance-murder-mystery-party-themes', // #43 Renascentista
  'chef-murder-mystery-themes-culinary-crimes-kitchen-secrets', // #44 Chef
  'villain-murder-mystery-themes-masterminds-killers-antagonists', // #45 Vilões
  'how-to-host-a-steampunk-murder-mystery-party-gear-up-for-victorian-sci-fi-crime', // #47 Steampunk
  'unique-underwater-murder-mystery-plots-that-will-make-a-splash-at-your-party', // #48 Submarino
  'haunted-hotel-murder-mystery-party-guide-check-in-to-terror-and-suspense', // #49 Hotel Assombrado
  'how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime', // #50 Conto de Fadas
];

// Find missing posts
const confirmedPresentSet = new Set(confirmedPresentSlugs);
const missingPosts = masterPosts.filter(p => !confirmedPresentSet.has(p.slug));

console.log(`Total master posts: ${masterPosts.length}`);
console.log(`Total PT posts: ${ptPosts.length}`);
console.log(`Confirmed present: ${confirmedPresentSlugs.length}`);
console.log(`Missing: ${missingPosts.length}`);
console.log(`Expected gap: ${auditData.languages.pt.gap}\n`);

if (missingPosts.length === auditData.languages.pt.gap) {
  console.log('✓ Count matches expected gap!\n');
} else {
  console.log(`⚠ Warning: Found ${missingPosts.length} missing, expected ${auditData.languages.pt.gap}\n`);
}

console.log('=== MISSING PORTUGUESE POSTS ===\n');
missingPosts.forEach((p, idx) => {
  console.log(`${idx + 1}. ${p.title}`);
  console.log(`   ID: ${p.id}`);
  console.log(`   Slug: ${p.slug}\n`);
});

// Save to JSON
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
console.log('✓ Results saved to pt-missing-posts.json');
