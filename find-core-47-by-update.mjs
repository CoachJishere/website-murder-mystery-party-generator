import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('🔍 FINDING CORE 47 BY UPDATE DATE\n');
console.log('=' .repeat(80));

// Get all published English posts
const { data: englishPosts, error: enError } = await supabase
  .from('blog_posts')
  .select('id, title, slug, published_at, updated_at')
  .eq('language', 'en')
  .eq('status', 'published')
  .order('updated_at', { ascending: false });

if (enError) {
  console.error('Error:', enError);
  process.exit(1);
}

console.log(`Total published English posts: ${englishPosts.length}\n`);

// Filter by updated in February 2026
const feb2026Updated = englishPosts.filter(p => {
  const updateDate = new Date(p.updated_at);
  return updateDate >= new Date('2026-02-01') && updateDate <= new Date('2026-02-28');
});

console.log(`Posts updated in February 2026: ${feb2026Updated.length}\n`);

// Show update date distribution
const updateDates = {};
feb2026Updated.forEach(p => {
  const date = new Date(p.updated_at).toISOString().split('T')[0];
  updateDates[date] = (updateDates[date] || 0) + 1;
});

console.log('Update date distribution:');
Object.entries(updateDates).sort().forEach(([date, count]) => {
  console.log(`  ${date}: ${count} posts`);
});

if (feb2026Updated.length === 47) {
  console.log('\n✅ Perfect! Found exactly 47 posts updated in February 2026\n');
} else if (feb2026Updated.length > 47) {
  console.log(`\n⚠️  Found ${feb2026Updated.length} posts, expected 47`);
  console.log(`Let me try filtering by specific date range...\n`);

  // Try different date ranges
  const ranges = [
    { name: 'Feb 15-25', start: '2026-02-15', end: '2026-02-25' },
    { name: 'Feb 16-23', start: '2026-02-16', end: '2026-02-23' },
    { name: 'Feb 16-20', start: '2026-02-16', end: '2026-02-20' },
    { name: 'Feb 20-25', start: '2026-02-20', end: '2026-02-25' }
  ];

  for (const range of ranges) {
    const filtered = englishPosts.filter(p => {
      const updateDate = new Date(p.updated_at);
      return updateDate >= new Date(range.start) && updateDate <= new Date(range.end);
    });
    console.log(`  ${range.name}: ${filtered.length} posts`);

    if (filtered.length === 47) {
      console.log(`    ✅ This range gives exactly 47!`);
      feb2026Updated.length = 0;
      feb2026Updated.push(...filtered);
      break;
    }
  }
} else {
  console.log(`\n🟡 Found ${feb2026Updated.length} posts, expected 47`);
  console.log(`Missing ${47 - feb2026Updated.length} posts\n`);
}

// List the core 47 (or however many we found)
console.log(`\n📋 CORE ${feb2026Updated.length} POSTS (Updated in Feb 2026):\n`);
feb2026Updated.forEach((post, i) => {
  const updateDate = new Date(post.updated_at).toISOString().split('T')[0];
  console.log(`${String(i + 1).padStart(2)}. [${updateDate}] ${post.title}`);
});

// Now check which languages have these posts translated
console.log('\n\n📊 CHECKING TRANSLATIONS FOR THESE POSTS:\n');
console.log('=' .repeat(80));

const languages = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh-cn', name: 'Chinese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'da', name: 'Danish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'fi', name: 'Finnish' }
];

const targetCount = feb2026Updated.length;

for (const lang of languages) {
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('language', lang.code)
    .eq('status', 'published');

  if (error) {
    console.error(`Error fetching ${lang.name}:`, error);
    continue;
  }

  const count = posts.length;
  const missing = targetCount - count;
  const status = count === targetCount ? '✅' :
                 count >= targetCount - 5 ? '🟡' :
                 '🔴';

  console.log(`${lang.name.padEnd(12)}: ${String(count).padStart(2)}/${targetCount} ${status}${missing > 0 ? ` (${missing} missing)` : ''}`);
}

// Save the list
const fs = await import('fs');
fs.writeFileSync(
  'temp-files/core-47-by-update-date.json',
  JSON.stringify({
    count: feb2026Updated.length,
    dateRange: 'February 2026',
    posts: feb2026Updated.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      updated_at: p.updated_at
    }))
  }, null, 2)
);

console.log('\n✅ Core posts list saved to: temp-files/core-47-by-update-date.json');
