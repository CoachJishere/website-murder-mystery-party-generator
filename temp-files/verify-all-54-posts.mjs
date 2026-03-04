import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://mhfikaomkmqcndqfohbp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w"
);

// All 54 optimized post slugs organized by pack
const allOptimizedSlugs = {
  'Pack 1 (9)': [
    '5-film-noir-murder-mystery-party-ideas-for-shadowy-intrigue',
    '5-art-gallery-murder-mystery-themes-perfect-for-creative-minds',
    '5-speakeasy-murder-mystery-themes-step-into-the-roaring-twenties',
    'how-to-host-a-gatsby-murder-mystery-party-roaring-twenties-glamour-meets-deadly-secrets',
    '5-masquerade-ball-murder-mystery-themes-unmask-the-killer',
    'hosting-a-hollywood-murder-mystery-party-lights-camera-murder',
    'how-to-host-a-las-vegas-murder-mystery-party-high-stakes-and-deadly-secrets',
    'casino-night-murder-mystery-themes-deal-deadly-hands',
    '5-train-journey-murder-mystery-themes-for-an-unforgettable-ride'
  ],
  'Pack 2 (21)': [
    '5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue',
    '5-pirate-ship-murder-mystery-party-themes',
    'unique-school-reunion-murder-mystery-plots-that-uncover-buried-secrets',
    '5-hotel-murder-mystery-themes',
    'haunted-house-murder-mystery-party',
    '5-museum-murder-mystery-themes-that-bring-history-to-deadly-life',
    'hosting-a-spy-themed-murder-mystery-party-espionage-intrigue-and-deadly-secrets',
    'theater-murder-mystery-party-planning-all-the-worlds-a-stage-for-murder',
    '5-beach-resort-murder-mystery-themes-sun-sand-and-suspicion',
    'safari-murder-mystery-party-planning-wild-adventure-meets-deadly-intrigue',
    'ice-hotel-murder-mystery-themes-chilling-tales-of-frozen-intrigue',
    '5-airport-murder-mystery-themes-departure-gates-to-danger',
    'unique-zombie-apocalypse-murder-mystery-plot-ideas',
    '5-superhero-murder-mystery-themes-when-heroes-turn-deadly',
    'how-to-host-a-game-show-murder-mystery-party-contestants-clues-and-killers',
    'amusement-park-murder-mystery-party-planning-thrills-chills-and-deadly-spills',
    '5-space-station-murder-mystery-themes-murder-in-zero-gravity',
    'unique-fairy-tale-murder-mystery-plot-ideas',
    'reality-tv-murder-mystery-party-planning-when-the-cameras-catch-a-killer',
    'how-to-host-a-magic-show-murder-mystery-party-illusions-and-deadly-deceptions'
  ],
  'Pack 3 (15)': [
    'journalist-murder-mystery-themes-press-pass-to-murder',
    'medical-examiner-murder-mystery-themes-forensic-investigations',
    'butler-murder-mystery-themes-manor-murders-household-secrets',
    'socialite-murder-mystery-party-planning-high-society-scandal-and-secrets',
    'unique-villain-murder-mystery-plot-ideas',
    'murder-mystery-party-for-date-night-ideas-where-romance-meets-mystery',
    '5-murder-mystery-themes-for-small-groups-intimate-investigations',
    'murder-mystery-party-for-teenagers-age-appropriate-thrills-and-chills',
    'murder-mystery-themes-for-game-night-level-up-your-board-game-evening',
    'murder-mystery-party-for-birthday-celebrations-make-their-special-day-unforgettable',
    'murder-mystery-party-for-graduation-celebrations-academic-achievement-mysteries-with-educational-excellence',
    'murder-mystery-party-for-corporate-events',
    'murder-mystery-party-for-office-teams-build-bonds-through-collaborative-investigation',
    'how-to-fix-guests-breaking-character-keep-your-murder-mystery-party-immersive',
    'murder-mystery-party-for-holiday-gatherings-festive-fun-meets-family-intrigue'
  ],
  'Pack 4 (5)': [
    'creating-the-perfect-detective-character-guide-design-compelling-investigators-for-your-custom-murder-mystery-party',
    'lawyer-murder-mystery-themes-courtroom-drama-legal-intrigue',
    'bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder',
    '5-mountain-lodge-murder-mystery-themes-that-will-make-your-retreat-unforgettable',
    'cruise-ship-murder-mystery-party-guide-set-sail-for-murder-on-the-high-seas'
  ],
  'Pack 5 (4)': [
    'unique-medieval-murder-mystery-plot-ideas',
    'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue',
    '5-renaissance-murder-mystery-party-themes',
    'wild-west-murder-mystery-party-planning'
  ]
};

console.log('🔍 Verifying all 54 optimized posts...\n');

let totalVerified = 0;
let totalIssues = 0;
const issues = [];

for (const [packName, slugs] of Object.entries(allOptimizedSlugs)) {
  console.log(`\n📦 ${packName}`);

  for (const slug of slugs) {
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('slug, title, content, reading_time, updated_at')
      .eq('slug', slug)
      .eq('language', 'en')
      .single();

    if (error || !post) {
      console.log(`   ❌ ${slug}: NOT FOUND`);
      issues.push({ pack: packName, slug, issue: 'Not found in database' });
      totalIssues++;
      continue;
    }

    // Check for optimization signals
    const hasEEAT = post.content.includes('*Published: February 16, 2026') &&
                    post.content.includes('Updated: February 20, 2026') &&
                    post.content.includes('Author: Mystery Maker Party Team');

    const hasStats = post.content.includes('Market Trends & Popularity') &&
                     post.content.includes('| Statistic | Value | Source |');

    const hasSources = post.content.includes('## Sources & References');

    const hasReadingTime = post.reading_time && post.reading_time > 0;

    const updatedAt = new Date(post.updated_at);
    const recentUpdate = updatedAt >= new Date('2026-02-20');

    const allGood = hasEEAT && hasStats && hasSources && hasReadingTime && recentUpdate;

    if (allGood) {
      console.log(`   ✅ ${post.title.substring(0, 60)}...`);
      totalVerified++;
    } else {
      const missing = [];
      if (!hasEEAT) missing.push('E-E-A-T');
      if (!hasStats) missing.push('Stats');
      if (!hasSources) missing.push('Sources');
      if (!hasReadingTime) missing.push('Reading Time');
      if (!recentUpdate) missing.push('Recent Update');

      console.log(`   ⚠️  ${post.title.substring(0, 60)}... - Missing: ${missing.join(', ')}`);
      issues.push({ pack: packName, slug, issue: `Missing: ${missing.join(', ')}` });
      totalIssues++;
    }
  }
}

console.log(`\n\n📊 Verification Summary:`);
console.log(`   ✅ Verified: ${totalVerified}/54`);
console.log(`   ⚠️  Issues: ${totalIssues}/54`);

if (issues.length > 0) {
  console.log(`\n\n⚠️  Posts with Issues:\n`);
  issues.forEach(i => {
    console.log(`   ${i.pack}: ${i.slug}`);
    console.log(`      Issue: ${i.issue}\n`);
  });
} else {
  console.log(`\n\n🎉 All 54 posts fully optimized and verified!`);
}
