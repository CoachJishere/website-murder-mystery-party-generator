import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Get all Japanese posts sorted
const { data, error } = await supabase
  .from('blog_posts')
  .select('slug')
  .eq('language', 'ja')
  .like('slug', 'ja-%')
  .order('slug', { ascending: true });

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`\nTotal Japanese posts with 'ja-' prefix: ${data.length}\n`);

// Expected slugs from posts 6-47
const expectedSlugs = [
  '5-spy-thriller-murder-mystery-themes-that-will-have-your-guests-going-undercover',
  '5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue',
  'ancient-egypt-murder-mystery-party-guide',
  'art-gallery-murder-mystery-party-planning-create-sophisticated-creative-crimes',
  'bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder',
  'butler-murder-mystery-themes-manor-murders-household-secrets',
  'chef-murder-mystery-themes-culinary-crimes-kitchen-secrets',
  'creating-the-perfect-detective-character-guide-design-compelling-investigators-for-your-custom-murder-mystery-party',
  'cruise-ship-murder-mystery-party-guide-set-sail-for-murder-on-the-high-seas',
  'haunted-hotel-murder-mystery-party-guide-check-in-to-terror-and-suspense',
  'how-to-fix-guests-breaking-character-keep-your-murder-mystery-party-immersive',
  'how-to-host-a-fairy-tale-murder-mystery-party-once-upon-a-crime',
  'how-to-host-a-hollywood-murder-mystery-party',
  'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue',
  'how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement',
  'how-to-host-a-steampunk-murder-mystery-party-gear-up-for-victorian-sci-fi-crime',
  'how-to-host-a-superhero-murder-mystery-party-powers-secret-identities-and-super-villains',
  'how-to-host-a-zombie-apocalypse-murder-mystery-that-will-have-your-guests-fighting-for-survival',
  'jazz-club-murder-mystery-party-planning-swing-into-prohibition-era-crime',
  'journalist-murder-mystery-themes-investigative-reporters-deadly-stories',
  'lawyer-murder-mystery-themes-courtroom-drama-legal-intrigue',
  'medical-examiner-murder-mystery-themes-forensic-investigations',
  'murder-mystery-party-for-birthday-celebrations-make-their-special-day-unforgettable',
  'murder-mystery-party-for-corporate-events',
  'murder-mystery-party-for-date-night-ideas-where-romance-meets-mystery',
  'murder-mystery-party-for-game-night-groups-transform-your-regular-game-night',
  'murder-mystery-party-for-graduation-celebrations-academic-achievement-mysteries-with-educational-excellence',
  'murder-mystery-party-for-holiday-gatherings-festive-fun-meets-family-intrigue',
  'murder-mystery-party-for-office-teams-build-bonds-through-collaborative-investigation',
  'murder-mystery-party-for-small-groups-ideas',
  'murder-mystery-party-for-teenagers-guide',
  'socialite-murder-mystery-themes-high-society-scandals-elite-intrigue',
  'spa-resort-murder-mystery-party-guide-relax-into-danger-and-luxury',
  'unique-archaeological-dig-murder-mystery-unearth-ancient-secrets-and-modern-murders',
  'unique-circus-murder-mystery-plot-ideas',
  'unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime',
  'unique-ice-hotel-murder-mystery-plots-frozen-adventures-with-arctic-suspense-and-cold-blooded-crimes',
  'unique-medieval-murder-mystery-plot-ideas',
  'unique-pirate-murder-mystery-plot-ideas',
  'unique-school-reunion-murder-mystery-plots-that-uncover-buried-secrets',
  'unique-space-colony-murder-mystery-plots-explore-the-final-frontier-of-crime',
  'unique-train-station-murder-mystery-plots-all-aboard-for-danger-and-intrigue'
];

// Check which are present
let found = 0;
let missing = [];

expectedSlugs.forEach(slug => {
  const jaSlug = `ja-${slug}`;
  if (data.find(p => p.slug === jaSlug)) {
    found++;
  } else {
    missing.push(slug);
  }
});

console.log(`✅ Found ${found}/42 expected posts (posts 6-47)`);

if (missing.length > 0) {
  console.log(`\n⚠️  Missing ${missing.length} posts:`);
  missing.forEach(s => console.log(`  - ${s}`));
} else {
  console.log('\n🎉 ALL 42 POSTS (6-47) SUCCESSFULLY TRANSLATED!');
}

console.log(`\n📊 Database stats:`);
console.log(`   Total 'ja-' posts: ${data.length}`);
console.log(`   Expected posts 6-47: 42`);
console.log(`   Match: ${found === 42 ? '✅ YES' : '❌ NO'}\n`);
