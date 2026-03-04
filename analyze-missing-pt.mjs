import fs from 'fs';

const auditData = JSON.parse(
  fs.readFileSync('./translation-audit-full.json', 'utf-8')
);

// Get all master posts and PT posts
const masterPosts = auditData.master.posts;
const ptPosts = auditData.languages.pt.posts;

console.log(`Master posts: ${masterPosts.length}`);
console.log(`PT posts: ${ptPosts.length}`);
console.log(`Expected missing: ${auditData.languages.pt.gap}`);

// Since we don't have a direct relationship in the audit file,
// we need to check the actual database or find another way

// Let's check if there are any PT slugs that give us hints
// PT posts should have translated slug patterns

// Let's look for patterns:
// English: "how-to-host-a-fairy-tale-murder-mystery"
// PT might be: "como-hospedar-festa-misterio-assassinato-conto-fadas"

// Let's create a mapping based on key themes/words
const themeMapping = {
  'butler': 'mordomo',
  'beach': 'praia',
  'casino': 'cassino',
  'haunted': 'assombrada',
  'renaissance': 'renascenca',
  'space': 'espacial',
  'train': 'trem',
  'circus': 'circo',
  'detective': 'detetive',
  'film-noir': 'cinema-noir',
  'archaeological': 'arqueologico',
  'masquerade': 'mascarada',
  'fairy-tale': 'conto-fadas',
  'hollywood': 'hollywood',
  'prohibition': 'proibicao',
  'medieval': 'medieval',
  'steampunk': 'steampunk',
  'journalist': 'jornalista',
  'jazz': 'jazz',
  'medical-examiner': 'perito-medico',
  'pirate': 'pirata',
  'hotel': 'hotel',
  'office': 'escritorio',
  'dinner': 'jantar',
  'teenagers': 'adolescentes',
  'birthday': 'aniversario',
  'holiday': 'festivas',
  'graduation': 'formaturas',
  'date-night': 'encontros-romanticos',
  'game-night': 'noite-jogo',
  'small-groups': 'grupos-pequenos',
};

// Analyze which English themes are present in PT
const ptSlugs = ptPosts.map(p => p.slug);
const ptTitles = ptPosts.map(p => p.title.toLowerCase());

console.log('\n--- Checking which master themes exist in PT ---\n');

const missing = [];
const found = [];

for (const masterPost of masterPosts) {
  const slug = masterPost.slug.toLowerCase();
  const title = masterPost.title.toLowerCase();

  // Check if this theme exists in PT
  let hasMatch = false;

  // Extract key themes from English slug
  const themes = [];
  for (const [enKey, ptKey] of Object.entries(themeMapping)) {
    if (slug.includes(enKey) || title.includes(enKey)) {
      themes.push({ en: enKey, pt: ptKey });
    }
  }

  // Check if any PT post contains the Portuguese theme
  if (themes.length > 0) {
    for (const theme of themes) {
      const ptMatches = ptSlugs.some(s => s.includes(theme.pt)) ||
                        ptTitles.some(t => t.includes(theme.pt.replace('-', ' ')));
      if (ptMatches) {
        hasMatch = true;
        break;
      }
    }
  } else {
    // For posts without clear themes, check for title word matches
    // This is less reliable but better than nothing
    const titleWords = title.split(' ').filter(w => w.length > 5);
    // Skip for now - too fuzzy
  }

  if (!hasMatch) {
    missing.push(masterPost);
  } else {
    found.push(masterPost);
  }
}

console.log(`\nMatched: ${found.length}`);
console.log(`Potentially missing: ${missing.length}`);

console.log('\n--- Potentially Missing Posts ---\n');
missing.forEach((post, idx) => {
  console.log(`${idx + 1}. [${post.id}] ${post.title}`);
  console.log(`   Slug: ${post.slug}\n`);
});

// Save results
const output = {
  language: 'pt',
  totalMissing: missing.length,
  totalMaster: masterPosts.length,
  totalPt: ptPosts.length,
  expectedGap: auditData.languages.pt.gap,
  missingPosts: missing.map(p => ({
    id: p.id,
    slug: p.slug,
    title: p.title
  }))
};

fs.writeFileSync(
  './pt-missing-posts.json',
  JSON.stringify(output, null, 2)
);

console.log('\n✓ Results saved to pt-missing-posts.json');
