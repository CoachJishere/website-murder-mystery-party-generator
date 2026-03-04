import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// All 32 posts (16-47)
const allPosts = [
  "how-to-fix-guests-breaking-character-keep-your-murder-mystery-party-immersive",
  "how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime",
  "how-to-host-a-hollywood-murder-mystery-party",
  "how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue",
  "how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement",
  "how-to-host-a-steampunk-murder-mystery-party-gear-up-for-victorian-sci-fi-crime",
  "how-to-host-a-superhero-murder-mystery-party-powers-secret-identities-and-super-villains",
  "how-to-host-a-zombie-apocalypse-murder-mystery-that-will-have-your-guests-fighting-for-survival",
  "jazz-club-murder-mystery-party-planning-swing-into-prohibition-era-crime",
  "journalist-murder-mystery-themes-investigative-reporters-deadly-stories",
  "lawyer-murder-mystery-themes-courtroom-drama-legal-intrigue",
  "medical-examiner-murder-mystery-themes-forensic-investigations",
  "murder-mystery-party-for-birthday-celebrations-make-their-special-day-unforgettable",
  "murder-mystery-party-for-corporate-events",
  "murder-mystery-party-for-date-night-ideas-where-romance-meets-mystery",
  "murder-mystery-party-for-game-night-groups-transform-your-regular-game-night",
  "murder-mystery-party-for-graduation-celebrations-academic-achievement-mysteries-with-educational-excellence",
  "murder-mystery-party-for-holiday-gatherings-festive-fun-meets-family-intrigue",
  "murder-mystery-party-for-office-teams-build-bonds-through-collaborative-investigation",
  "murder-mystery-party-for-small-groups-ideas",
  "murder-mystery-party-for-teenagers-guide",
  "socialite-murder-mystery-themes-high-society-scandals-elite-intrigue",
  "spa-resort-murder-mystery-party-guide-relax-into-danger-and-luxury",
  "unique-archaeological-dig-murder-mystery-unearth-ancient-secrets-and-modern-murders",
  "unique-circus-murder-mystery-plot-ideas",
  "unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime",
  "unique-ice-hotel-murder-mystery-plots-frozen-adventures-with-arctic-suspense-and-cold-blooded-crimes",
  "unique-medieval-murder-mystery-plot-ideas",
  "unique-pirate-murder-mystery-plot-ideas",
  "unique-school-reunion-murder-mystery-plots-that-uncover-buried-secrets",
  "unique-space-colony-murder-mystery-plots-explore-the-final-frontier-of-crime",
  "unique-train-station-murder-mystery-plots-all-aboard-for-danger-and-intrigue"
];

// Check which are already translated
const { data: frExisting } = await supabase
  .from('blog_posts')
  .select('slug')
  .eq('language', 'fr')
  .like('slug', '%-fr');

const existingSlugs = frExisting.map(p => p.slug.replace('-fr', ''));
const remaining = allPosts.filter(slug => !existingSlugs.includes(slug));

console.log(`\n=== TRANSLATION STATUS ===`);
console.log(`Total posts: ${allPosts.length}`);
console.log(`Already done: ${existingSlugs.length}`);
console.log(`Remaining: ${remaining.length}\n`);

// Save list for Claude
const output = {
  remaining_count: remaining.length,
  remaining_slugs: remaining,
  next_batch: remaining.slice(0, 5)
};

fs.writeFileSync(
  '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/translation-status.json',
  JSON.stringify(output, null, 2)
);

console.log('Remaining posts to translate:');
remaining.forEach((slug, idx) => {
  console.log(`${idx + 17}. ${slug}`);
});

