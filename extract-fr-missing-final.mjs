import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('translation-audit-full.json', 'utf8'));

// Get master posts
const masterPosts = new Map();
data.master.posts.forEach(p => {
  masterPosts.set(p.slug, p);
});

// Build set of UNIQUE French covered posts (deduplicated)
const frenchCovered = new Set();

data.languages.fr.posts.forEach(frPost => {
  const slug = frPost.slug;
  
  if (slug.endsWith('-fr')) {
    const baseSlug = slug.slice(0, -3);
    if (masterPosts.has(baseSlug)) {
      frenchCovered.add(baseSlug);
    }
  } else {
    // Manual mappings for slugs without -fr
    if (slug.includes('bal-masque')) {
      frenchCovered.add('5-masquerade-ball-murder-mystery-themes-that-will-leave-your-guests-speechless');
    } else if (slug.includes('majordome')) {
      frenchCovered.add('butler-murder-mystery-themes-manor-murders-household-secrets');
    } else if (slug.includes('conte-de-fees')) {
      frenchCovered.add('how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime');
    } else if (slug.includes('archeologiques')) {
      frenchCovered.add('unique-archaeological-dig-murder-mystery-unearth-ancient-secrets-and-modern-murders');
    } else if (slug.includes('film-noir')) {
      frenchCovered.add('unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime');
    }
  }
});

console.log(`Master total: ${masterPosts.size}`);
console.log(`French unique coverage: ${frenchCovered.size}`);
console.log(`French total posts (with duplicates): ${data.languages.fr.total}`);
console.log(`Missing (based on unique coverage): ${masterPosts.size - frenchCovered.size}`);
console.log(`Audit reported gap: ${data.languages.fr.gap}`);
console.log();

// Find missing posts
const missingPosts = [];
for (const [slug, postData] of masterPosts) {
  if (!frenchCovered.has(slug)) {
    missingPosts.push({
      id: postData.id,
      title: postData.title,
      slug: postData.slug
    });
  }
}

missingPosts.sort((a, b) => a.title.localeCompare(b.title));

console.log(`=== ${missingPosts.length} MISSING FRENCH POSTS ===`);
console.log();

for (let i = 0; i < Math.min(missingPosts.length, 30); i++) {
  const post = missingPosts[i];
  console.log(`${i + 1}. ${post.title}`);
  console.log(`   Slug: ${post.slug}`);
  console.log();
}

if (missingPosts.length > 30) {
  console.log(`... and ${missingPosts.length - 30} more\n`);
}

// Save to JSON
const output = {
  audit_date: data.auditDate,
  note: "This list shows missing posts based on UNIQUE coverage. French has 42 total posts but 4 are duplicates, so only 38 unique English posts are covered.",
  master_total: masterPosts.size,
  french_total_posts: data.languages.fr.total,
  french_unique_coverage: frenchCovered.size,
  french_duplicates: data.languages.fr.total - frenchCovered.size,
  total_missing: missingPosts.length,
  coverage_percent: Math.round((frenchCovered.size / masterPosts.size) * 1000) / 10,
  missing_posts: missingPosts
};

writeFileSync('fr-missing-posts.json', JSON.stringify(output, null, 2));

console.log(`✓ Saved to fr-missing-posts.json (${missingPosts.length} missing posts)`);
