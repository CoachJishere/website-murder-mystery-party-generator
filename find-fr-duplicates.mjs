import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('translation-audit-full.json', 'utf8'));

// Group by base English slug
const byBaseSlug = new Map();

data.languages.fr.posts.forEach(post => {
  let baseSlug;
  
  if (post.slug.endsWith('-fr')) {
    baseSlug = post.slug.slice(0, -3);
  } else {
    // Manually map non -fr slugs
    if (post.slug.includes('bal-masque')) {
      baseSlug = '5-masquerade-ball-murder-mystery-themes-that-will-leave-your-guests-speechless';
    } else if (post.slug.includes('majordome')) {
      baseSlug = 'butler-murder-mystery-themes-manor-murders-household-secrets';
    } else if (post.slug.includes('conte-de-fees') || post.slug.includes('fairy-tale')) {
      baseSlug = 'how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime';
    } else if (post.slug.includes('archeologiques')) {
      baseSlug = 'unique-archaeological-dig-murder-mystery-unearth-ancient-secrets-and-modern-murders';
    } else if (post.slug.includes('film-noir')) {
      baseSlug = 'unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime';
    } else {
      baseSlug = post.slug; // unknown
    }
  }
  
  if (!byBaseSlug.has(baseSlug)) {
    byBaseSlug.set(baseSlug, []);
  }
  byBaseSlug.get(baseSlug).push(post);
});

console.log('French posts grouped by base slug:');
console.log('Unique base slugs:', byBaseSlug.size);
console.log();

console.log('Duplicates (same English post translated multiple times):');
for (const [baseSlug, posts] of byBaseSlug) {
  if (posts.length > 1) {
    console.log(`\nBase: ${baseSlug}`);
    posts.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.slug}`);
      console.log(`     Title: ${p.title}`);
    });
  }
}

console.log('\n\nUnique coverage:', byBaseSlug.size);
