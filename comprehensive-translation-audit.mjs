import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('🔍 COMPREHENSIVE TRANSLATION AUDIT\n');
console.log('=' .repeat(80));

// Step 1: Identify the 47 core English posts
console.log('\n📋 STEP 1: Identifying 47 Core English Posts\n');

const { data: englishPosts, error: enError } = await supabase
  .from('blog_posts')
  .select('id, title, slug, published_at, updated_at, status')
  .eq('language', 'en')
  .order('published_at', { ascending: true });

if (enError) {
  console.error('Error fetching English posts:', enError);
  process.exit(1);
}

// Filter to posts published on or around Feb 16, 2026 (the optimization date)
const coreEnglishPosts = englishPosts.filter(post => {
  const pubDate = new Date(post.published_at);
  const targetDate = new Date('2026-02-16');
  const daysDiff = Math.abs((pubDate - targetDate) / (1000 * 60 * 60 * 24));
  return daysDiff <= 5; // Within 5 days of Feb 16
});

console.log(`Total English posts in database: ${englishPosts.length}`);
console.log(`Core English posts (published ~Feb 16, 2026): ${coreEnglishPosts.length}`);

if (coreEnglishPosts.length !== 47) {
  console.log(`⚠️  WARNING: Expected 47 core posts, found ${coreEnglishPosts.length}`);
  console.log('\nLet me try alternative identification methods...\n');

  // Try by status=published and updated recently
  const recentlyUpdated = englishPosts.filter(post => {
    const updateDate = new Date(post.updated_at);
    return updateDate >= new Date('2026-02-15') && post.status === 'published';
  });

  console.log(`Posts updated since Feb 15, 2026 and published: ${recentlyUpdated.length}`);

  if (recentlyUpdated.length === 47 || Math.abs(recentlyUpdated.length - 47) < 10) {
    coreEnglishPosts.length = 0;
    coreEnglishPosts.push(...recentlyUpdated);
    console.log(`✅ Using recently updated posts as core 47`);
  }
}

console.log('\nCore English Post Slugs:');
const coreSlugPatterns = coreEnglishPosts.map(p => p.slug).sort();
coreSlugPatterns.slice(0, 10).forEach((slug, i) => console.log(`  ${i+1}. ${slug}`));
console.log(`  ... (showing first 10 of ${coreSlugPatterns.length})`);

// Step 2: For each language with >47 posts, identify core vs extra
console.log('\n\n📊 STEP 2: Identifying Core vs Extra Posts by Language\n');
console.log('=' .repeat(80));

const languagesToAudit = [
  { code: 'pt', name: 'Portuguese', total: 113 },
  { code: 'it', name: 'Italian', total: 110 },
  { code: 'ko', name: 'Korean', total: 111 },
  { code: 'nl', name: 'Dutch', total: 109 },
  { code: 'da', name: 'Danish', total: 87 },
  { code: 'sv', name: 'Swedish', total: 109 },
  { code: 'fi', name: 'Finnish', total: 83 },
  { code: 'zh-cn', name: 'Chinese', total: 48 }
];

const auditResults = {};

for (const lang of languagesToAudit) {
  console.log(`\n🔍 Auditing ${lang.name} (${lang.code}) - Expected: 47, Found: ${lang.total}`);
  console.log('-'.repeat(80));

  const { data: langPosts, error: langError } = await supabase
    .from('blog_posts')
    .select('id, title, slug, published_at, updated_at, status')
    .eq('language', lang.code)
    .order('published_at', { ascending: true });

  if (langError) {
    console.error(`Error fetching ${lang.name} posts:`, langError);
    continue;
  }

  // Match posts to core English slugs
  const corePosts = [];
  const extraPosts = [];

  for (const post of langPosts) {
    // Check if this slug corresponds to a core English post
    // Remove language prefix patterns and compare base slug
    const baseSlug = post.slug
      .replace(/^(how-to-host-a-|como-organizar-uma-|come-organizzare-un-|wie-man-eine-|のホスト方法|을-주최하는-방법|如何举办|hoe-je-een-|sådan-holder-du-en-|hur-man-arrangerar-en-|kuinka-isännöidä-)/, 'how-to-host-a-')
      .replace(/-murder-mystery-party.*$/, '-murder-mystery-party');

    // More flexible matching: check if any core slug contains key theme words
    const isCore = coreSlugPatterns.some(coreSlug => {
      // Extract theme from core slug
      const themeMatch = coreSlug.match(/murder-mystery-party[^\-]*-?(.+)?$/);
      if (!themeMatch) return coreSlug === post.slug;

      // Check if the translated slug contains similar theme
      const postTheme = post.slug.match(/party[^\-]*-?(.+)?$/);
      if (!postTheme) return false;

      // Simple check: do they share significant words?
      return coreSlug.includes('victorian') && post.slug.includes('victorian') ||
             coreSlug.includes('hollywood') && post.slug.includes('hollywood') ||
             coreSlug.includes('medieval') && post.slug.includes('medieval') ||
             coreSlug.includes('prohibition') && post.slug.includes('prohibition') ||
             coreSlug.includes('steampunk') && post.slug.includes('steampunk') ||
             coreSlug === baseSlug;
    });

    if (isCore) {
      corePosts.push(post);
    } else {
      extraPosts.push(post);
    }
  }

  console.log(`  ✅ Core posts (matching 47 English): ${corePosts.length}`);
  console.log(`  ⚠️  Extra posts (beyond core 47): ${extraPosts.length}`);
  console.log(`  📊 Published core: ${corePosts.filter(p => p.status === 'published').length}`);
  console.log(`  📊 Published extra: ${extraPosts.filter(p => p.status === 'published').length}`);

  if (extraPosts.length > 0) {
    console.log('\n  Extra posts to review:');
    extraPosts.slice(0, 10).forEach((post, i) => {
      console.log(`    ${i+1}. [${post.status}] ${post.slug} (published: ${new Date(post.published_at).toISOString().split('T')[0]})`);
    });
    if (extraPosts.length > 10) {
      console.log(`    ... (${extraPosts.length - 10} more extra posts)`);
    }
  }

  auditResults[lang.code] = {
    name: lang.name,
    totalFound: langPosts.length,
    corePosts: corePosts.length,
    extraPosts: extraPosts.length,
    corePublished: corePosts.filter(p => p.status === 'published').length,
    extraPublished: extraPosts.filter(p => p.status === 'published').length,
    extraList: extraPosts.map(p => ({
      id: p.id,
      slug: p.slug,
      status: p.status,
      published_at: p.published_at
    }))
  };
}

// Step 3: Summary Report
console.log('\n\n📈 STEP 3: Summary Report\n');
console.log('=' .repeat(80));
console.log('\n| Language | Total | Core (47) | Extra | Core Pub | Extra Pub | Status |');
console.log('|----------|-------|-----------|-------|----------|-----------|--------|');

for (const [code, result] of Object.entries(auditResults)) {
  const status = result.corePosts === 47 ? '✅' : result.corePosts < 47 ? '🟡 Missing' : '🔴 Over';
  console.log(`| ${result.name.padEnd(8)} | ${String(result.totalFound).padStart(5)} | ${String(result.corePosts).padStart(9)} | ${String(result.extraPosts).padStart(5)} | ${String(result.corePublished).padStart(8)} | ${String(result.extraPublished).padStart(9)} | ${status} |`);
}

console.log('\n\n💡 RECOMMENDATIONS:\n');
console.log('=' .repeat(80));

for (const [code, result] of Object.entries(auditResults)) {
  if (result.extraPosts > 0) {
    console.log(`\n${result.name} (${code}):`);
    console.log(`  • Found ${result.extraPosts} extra posts beyond the core 47`);
    console.log(`  • ${result.extraPublished} of these are currently PUBLISHED`);
    console.log(`  • Recommendation: Review these posts to determine if they are:`);
    console.log(`    - Duplicates (same content, different slug) → Delete`);
    console.log(`    - Old versions (replaced by optimized versions) → Unpublish or delete`);
    console.log(`    - Separate optimization work (unrelated to core 47) → Unpublish`);
  } else if (result.corePosts < 47) {
    console.log(`\n${result.name} (${code}):`);
    console.log(`  • Only ${result.corePosts} of 47 core posts found`);
    console.log(`  • ${47 - result.corePosts} posts missing`);
    console.log(`  • Recommendation: Complete translation of remaining posts`);
  } else {
    console.log(`\n${result.name} (${code}): ✅ Perfect (47 core posts, 0 extras)`);
  }
}

// Save detailed results to JSON
const reportData = {
  auditDate: new Date().toISOString(),
  coreEnglishPosts: coreEnglishPosts.length,
  coreSlugPatterns: coreSlugPatterns,
  languageResults: auditResults
};

const fs = await import('fs');
fs.writeFileSync(
  'temp-files/translation-audit-report.json',
  JSON.stringify(reportData, null, 2)
);

console.log('\n\n✅ Audit complete! Detailed results saved to: temp-files/translation-audit-report.json');
