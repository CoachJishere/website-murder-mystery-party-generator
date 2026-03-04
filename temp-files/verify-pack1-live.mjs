import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w'
);

const slugs = [
  'unique-ice-hotel-murder-mystery-plots-frozen-adventures-with-arctic-suspense-and-cold-blooded-crimes',
  'unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime',
  'spa-resort-murder-mystery-party-guide-relax-into-danger-and-luxury',
  'chef-murder-mystery-themes-culinary-crimes-kitchen-secrets',
  'unique-circus-murder-mystery-plot-ideas',
  'unique-space-colony-murder-mystery-plots-explore-the-final-frontier-of-crime',
  '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable',
  'haunted-hotel-murder-mystery-party-guide-check-in-to-terror-and-suspense',
  'unique-train-station-murder-mystery-plots-all-aboard-for-danger-and-intrigue',
  'unique-underwater-murder-mystery-plots-that-will-make-a-splash-at-your-party'
];

console.log('🔍 Verifying Pack 1 posts are updated and live in database...\n');

let allGood = true;

for (const slug of slugs) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('title, reading_time, updated_at, content')
    .eq('slug', slug)
    .eq('language', 'en')
    .single();

  if (error) {
    console.log('❌', slug.substring(0, 50) + '... ERROR:', error.message);
    allGood = false;
  } else {
    const hasReadingTime = data.reading_time !== null;
    const hasEEATSignals = data.content.includes('Published: February 16, 2026');
    const hasStats = data.content.includes('Market Trends & Popularity');
    const hasSources = data.content.includes('Sources & References');
    const recentlyUpdated = new Date(data.updated_at) > new Date('2026-02-19');

    const isFullyOptimized = hasReadingTime && hasEEATSignals && hasStats && hasSources && recentlyUpdated;
    const status = isFullyOptimized ? '✅' : '⚠️';

    console.log(status, data.title);
    console.log('   📖 Reading time:', data.reading_time, 'min');
    console.log('   📏 Content length:', data.content.length, 'chars');
    console.log('   📅 Updated:', data.updated_at.split('T')[0]);
    console.log('   ✓ E-E-A-T signals:', hasEEATSignals ? 'Yes' : 'No');
    console.log('   ✓ Statistics:', hasStats ? 'Yes' : 'No');
    console.log('   ✓ Sources:', hasSources ? 'Yes' : 'No');
    console.log('');

    if (!isFullyOptimized) allGood = false;
  }
}

if (allGood) {
  console.log('✅ All 10 Pack 1 posts are fully optimized and live in Supabase!');
  console.log('📡 Posts are accessible via the website immediately (database is live)');
} else {
  console.log('⚠️ Some posts may need additional optimization');
}
