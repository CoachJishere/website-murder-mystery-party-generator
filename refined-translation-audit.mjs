import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('🔍 REFINED TRANSLATION AUDIT (by Publication Date)\n');
console.log('=' .repeat(80));

// Key insight: The optimization project started Feb 16, 2026
// Core 47 posts were optimized/published around that date
// Recent translations (Feb 2026) would have similar publish dates
// Old posts (2025) are from before the optimization project

const OPTIMIZATION_START = new Date('2026-02-15');
const TODAY = new Date('2026-02-25');

console.log(`Optimization period: ${OPTIMIZATION_START.toISOString().split('T')[0]} to ${TODAY.toISOString().split('T')[0]}\n`);

// Step 1: Identify core English posts (published in optimization period)
console.log('📋 STEP 1: Identifying Core English Posts (Feb 15-25, 2026)\n');

const { data: allEnglish, error: enError } = await supabase
  .from('blog_posts')
  .select('id, title, slug, published_at, updated_at, status')
  .eq('language', 'en')
  .order('published_at', { ascending: true });

if (enError) {
  console.error('Error:', enError);
  process.exit(1);
}

const coreEnglishPosts = allEnglish.filter(post => {
  const pubDate = new Date(post.published_at);
  return pubDate >= OPTIMIZATION_START && pubDate <= TODAY && post.status === 'published';
});

const oldEnglishPosts = allEnglish.filter(post => {
  const pubDate = new Date(post.published_at);
  return pubDate < OPTIMIZATION_START;
});

console.log(`Total English posts: ${allEnglish.length}`);
console.log(`Core posts (Feb 15-25, 2026): ${coreEnglishPosts.length} ✅`);
console.log(`Old posts (before Feb 15): ${oldEnglishPosts.length}`);
console.log(`Draft posts: ${allEnglish.filter(p => p.status === 'draft').length}`);

if (coreEnglishPosts.length !== 47) {
  console.log(`\n⚠️  Note: Found ${coreEnglishPosts.length} posts in optimization period, expected 47`);
}

// Step 2: Check each language - posts published in Feb 2026 vs before
console.log('\n\n📊 STEP 2: Analyzing Each Language by Publication Date\n');
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

const results = {};

for (const lang of languages) {
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, published_at, status')
    .eq('language', lang.code)
    .order('published_at', { ascending: false });

  if (error) {
    console.error(`Error fetching ${lang.name}:`, error);
    continue;
  }

  // Categorize by date
  const recentPosts = posts.filter(p => {
    const pubDate = new Date(p.published_at);
    return pubDate >= OPTIMIZATION_START && pubDate <= TODAY;
  });

  const oldPosts = posts.filter(p => {
    const pubDate = new Date(p.published_at);
    return pubDate < OPTIMIZATION_START;
  });

  const recentPublished = recentPosts.filter(p => p.status === 'published').length;
  const oldPublished = oldPosts.filter(p => p.status === 'published').length;

  console.log(`\n${lang.name} (${lang.code}):`);
  console.log(`  Total: ${posts.length}`);
  console.log(`  ✅ Recent (Feb 15-25, 2026): ${recentPosts.length} (${recentPublished} published)`);
  console.log(`  📦 Old (before Feb 15): ${oldPosts.length} (${oldPublished} published)`);

  const status = recentPosts.length === 47 ? '✅ Perfect' :
                recentPosts.length < 47 ? `🟡 Missing ${47 - recentPosts.length}` :
                `🔴 ${recentPosts.length - 47} extra`;
  console.log(`  Status: ${status}`);

  if (oldPublished > 0) {
    console.log(`  ⚠️  ${oldPublished} OLD posts are still PUBLISHED (consider unpublishing)`);
    console.log(`  Sample old posts:`);
    oldPosts.filter(p => p.status === 'published').slice(0, 3).forEach(p => {
      const date = new Date(p.published_at).toISOString().split('T')[0];
      console.log(`    - [${date}] ${p.slug.substring(0, 60)}...`);
    });
  }

  results[lang.code] = {
    name: lang.name,
    total: posts.length,
    recent: recentPosts.length,
    recentPublished,
    old: oldPosts.length,
    oldPublished,
    oldPostIds: oldPosts.filter(p => p.status === 'published').map(p => p.id)
  };
}

// Step 3: Summary Table
console.log('\n\n📈 STEP 3: Summary Table\n');
console.log('=' .repeat(80));
console.log('\n| Language | Total | Recent (Core) | Old Posts | Status |');
console.log('|----------|-------|---------------|-----------|--------|');

for (const [code, data] of Object.entries(results)) {
  const status = data.recent === 47 ? '✅ Perfect' :
                 data.recent < 47 ? `🟡 -${47 - data.recent}` :
                 `🔴 +${data.recent - 47}`;
  const oldWarning = data.oldPublished > 0 ? `⚠️ ${data.oldPublished} old` : '-';
  console.log(`| ${data.name.padEnd(8)} | ${String(data.total).padStart(5)} | ${String(data.recent).padStart(13)} | ${oldWarning.padEnd(9)} | ${status} |`);
}

// Step 4: Action Items
console.log('\n\n💡 STEP 4: Action Items\n');
console.log('=' .repeat(80));

const languagesWithOldPosts = Object.entries(results).filter(([_, data]) => data.oldPublished > 0);
const languagesMissing = Object.entries(results).filter(([_, data]) => data.recent < 47);
const languagesExtra = Object.entries(results).filter(([_, data]) => data.recent > 47);
const languagesPerfect = Object.entries(results).filter(([_, data]) => data.recent === 47 && data.oldPublished === 0);

console.log(`\n✅ Perfect (47 recent, 0 old): ${languagesPerfect.length} languages`);
languagesPerfect.forEach(([code, data]) => {
  console.log(`   - ${data.name}`);
});

if (languagesWithOldPosts.length > 0) {
  console.log(`\n🔴 CRITICAL: ${languagesWithOldPosts.length} languages have OLD published posts that should be unpublished:\n`);
  for (const [code, data] of languagesWithOldPosts) {
    console.log(`${data.name} (${code}):`);
    console.log(`  - ${data.oldPublished} old posts currently PUBLISHED`);
    console.log(`  - These posts are from BEFORE the Feb 2026 optimization project`);
    console.log(`  - Recommendation: UNPUBLISH all ${data.oldPublished} old posts`);
    console.log(`  - Command to unpublish:\n`);
    console.log(`    UPDATE blog_posts SET status = 'draft'`);
    console.log(`    WHERE language = '${code}' AND published_at < '2026-02-15';`);
    console.log(``);
  }
}

if (languagesMissing.length > 0) {
  console.log(`\n🟡 Missing translations: ${languagesMissing.length} languages\n`);
  for (const [code, data] of languagesMissing) {
    console.log(`${data.name} (${code}): ${data.recent}/47 complete (${47 - data.recent} missing)`);
  }
}

if (languagesExtra.length > 0) {
  console.log(`\n🔴 Extra recent posts: ${languagesExtra.length} languages\n`);
  for (const [code, data] of languagesExtra) {
    console.log(`${data.name} (${code}): ${data.recent}/47 (${data.recent - 47} extra)`);
  }
}

// Save report
const reportData = {
  auditDate: new Date().toISOString(),
  optimizationPeriod: {
    start: OPTIMIZATION_START.toISOString(),
    end: TODAY.toISOString()
  },
  coreEnglishPosts: coreEnglishPosts.length,
  languageResults: results
};

const fs = await import('fs');
fs.writeFileSync(
  'temp-files/refined-audit-report.json',
  JSON.stringify(reportData, null, 2)
);

console.log('\n\n📄 Report saved to: temp-files/refined-audit-report.json');
console.log('\n✅ Audit complete!');
