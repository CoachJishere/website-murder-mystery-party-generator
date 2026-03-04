// Comprehensive Blog Post Translation Audit
// Queries Supabase REST API to check translation coverage across all languages

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const EXPECTED_LANGUAGES = ['en', 'pt', 'fr', 'de', 'es', 'it', 'sv', 'nl', 'ja', 'ko', 'zh-cn', 'da', 'fi'];

const headers = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

async function fetchAllPosts(language, fields = 'slug,title,language') {
  let allPosts = [];
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/blog_posts`);
    url.searchParams.set('select', fields);
    url.searchParams.set('language', `eq.${language}`);
    url.searchParams.set('status', 'eq.published');
    url.searchParams.set('order', 'slug.asc');
    url.searchParams.set('offset', offset.toString());
    url.searchParams.set('limit', limit.toString());

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to fetch ${language} posts: ${res.status} ${res.statusText} - ${body}`);
    }
    const data = await res.json();
    allPosts = allPosts.concat(data);
    if (data.length < limit) break;
    offset += limit;
  }
  
  return allPosts;
}

async function fetchAllPostsAllLanguages() {
  const url = new URL(`${SUPABASE_URL}/rest/v1/blog_posts`);
  url.searchParams.set('select', 'language');
  url.searchParams.set('status', 'eq.published');
  url.searchParams.set('limit', '10000');

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch posts: ${res.status} ${res.statusText} - ${body}`);
  }
  const data = await res.json();
  
  const counts = {};
  for (const row of data) {
    counts[row.language] = (counts[row.language] || 0) + 1;
  }
  return { counts, total: data.length };
}

function extractBaseSlug(slug, lang) {
  const prefixes = [`${lang}-`];
  for (const prefix of prefixes) {
    if (slug.startsWith(prefix)) {
      return slug.slice(prefix.length);
    }
  }
  return slug;
}

async function main() {
  console.log('='.repeat(80));
  console.log('  BLOG POST TRANSLATION AUDIT');
  console.log('  Date: ' + new Date().toISOString().split('T')[0]);
  console.log('='.repeat(80));
  console.log();

  // Step 1: Get overall counts
  console.log('Fetching all published posts...');
  const { counts, total } = await fetchAllPostsAllLanguages();
  
  console.log(`Total published posts across all languages: ${total}`);
  console.log();

  // Step 2: Get English posts as baseline
  console.log('Fetching English posts (baseline)...');
  const englishPosts = await fetchAllPosts('en', 'slug,title');
  const enCount = englishPosts.length;
  const enSlugs = englishPosts.map(p => p.slug).sort();
  const enTitleMap = {};
  for (const p of englishPosts) {
    enTitleMap[p.slug] = p.title;
  }

  console.log(`English (baseline) posts: ${enCount}`);
  console.log();

  // Step 3: Build summary table
  console.log('-'.repeat(80));
  console.log(
    'Language'.padEnd(12) +
    'Count'.padStart(8) +
    'Missing'.padStart(10) +
    'Complete %'.padStart(14) +
    '  Status'
  );
  console.log('-'.repeat(80));

  for (const lang of EXPECTED_LANGUAGES.sort()) {
    const count = counts[lang] || 0;
    const missing = Math.max(0, enCount - count);
    const pct = enCount > 0 ? ((count / enCount) * 100).toFixed(1) : '0.0';
    let status = '';
    if (count >= enCount) status = 'COMPLETE';
    else if (count === 0) status = 'NOT STARTED';
    else if (missing <= 5) status = 'NEARLY DONE';
    else status = `GAPS (${missing} missing)`;

    console.log(
      lang.padEnd(12) +
      count.toString().padStart(8) +
      missing.toString().padStart(10) +
      (pct + '%').padStart(14) +
      '  ' + status
    );
  }

  // Check for unexpected languages
  const unexpectedLangs = Object.keys(counts).filter(l => !EXPECTED_LANGUAGES.includes(l));
  if (unexpectedLangs.length > 0) {
    console.log();
    console.log('Unexpected languages found:');
    for (const lang of unexpectedLangs) {
      console.log(`  ${lang}: ${counts[lang]} posts`);
    }
  }

  console.log('-'.repeat(80));
  console.log(
    'TOTAL'.padEnd(12) +
    total.toString().padStart(8)
  );
  console.log();

  // Step 4: For each non-English language with gaps, identify missing posts
  console.log('='.repeat(80));
  console.log('  DETAILED GAP ANALYSIS');
  console.log('='.repeat(80));

  for (const lang of EXPECTED_LANGUAGES.sort()) {
    if (lang === 'en') continue;
    const count = counts[lang] || 0;
    const missing = enCount - count;
    
    if (count >= enCount) {
      console.log(`\n[${lang.toUpperCase()}] All ${enCount} posts translated. No gaps.`);
      continue;
    }

    if (count === 0) {
      console.log(`\n[${lang.toUpperCase()}] NO POSTS FOUND. All ${enCount} English posts need translation.`);
      continue;
    }

    // Fetch this language's posts
    const langPosts = await fetchAllPosts(lang, 'slug,title');
    const langSlugs = new Set(langPosts.map(p => p.slug));
    
    // Build set of base slugs (stripping language prefix)
    const langBaseSlugs = new Set(langPosts.map(p => extractBaseSlug(p.slug, lang)));

    // Find missing English slugs
    const missingEnSlugs = [];
    for (const enSlug of enSlugs) {
      const possibleSlugs = [
        enSlug,
        `${lang}-${enSlug}`,
      ];
      
      let found = false;
      for (const candidate of possibleSlugs) {
        if (langSlugs.has(candidate)) {
          found = true;
          break;
        }
      }
      
      if (!found && langBaseSlugs.has(enSlug)) {
        found = true;
      }

      if (!found) {
        missingEnSlugs.push(enSlug);
      }
    }

    // Check for orphan posts (translations that don't match any English post)
    const matchedLangSlugs = new Set();
    for (const lSlug of langSlugs) {
      const base = extractBaseSlug(lSlug, lang);
      if (enSlugs.includes(lSlug) || enSlugs.includes(base)) {
        matchedLangSlugs.add(lSlug);
      }
    }
    const orphanSlugs = [...langSlugs].filter(s => !matchedLangSlugs.has(s));

    console.log(`\n[${lang.toUpperCase()}] ${count} of ${enCount} posts (${missing} gap by count)`);
    
    if (missingEnSlugs.length > 0) {
      console.log(`  Missing posts (${missingEnSlugs.length} not found as translations):`);
      for (const slug of missingEnSlugs) {
        console.log(`    - "${enTitleMap[slug]}"`);
        console.log(`      slug: ${slug}`);
      }
    } else if (missing > 0) {
      console.log(`  Count mismatch but all English slugs appear covered.`);
      console.log(`  This may indicate duplicate translations or different slug patterns.`);
    }

    if (orphanSlugs.length > 0) {
      console.log(`  Unmatched translated posts (${orphanSlugs.length} - may use different slug patterns):`);
      for (const slug of orphanSlugs.slice(0, 15)) {
        const title = langPosts.find(p => p.slug === slug)?.title || '(unknown)';
        console.log(`    ? ${slug}  =>  "${title}"`);
      }
      if (orphanSlugs.length > 15) {
        console.log(`    ... and ${orphanSlugs.length - 15} more`);
      }
    }
  }

  // Step 5: Summary
  console.log();
  console.log('='.repeat(80));
  console.log('  SUMMARY');
  console.log('='.repeat(80));
  
  const complete = EXPECTED_LANGUAGES.filter(l => (counts[l] || 0) >= enCount);
  const partial = EXPECTED_LANGUAGES.filter(l => (counts[l] || 0) > 0 && (counts[l] || 0) < enCount);
  const empty = EXPECTED_LANGUAGES.filter(l => (counts[l] || 0) === 0);

  console.log(`\n  Baseline (English): ${enCount} posts`);
  console.log(`  Languages with full coverage (${complete.length}): ${complete.join(', ') || 'none'}`);
  console.log(`  Languages with partial coverage (${partial.length}): ${partial.map(l => `${l}(${counts[l]})`).join(', ') || 'none'}`);
  console.log(`  Languages with no posts (${empty.length}): ${empty.join(', ') || 'none'}`);
  
  const totalTranslated = Object.entries(counts)
    .filter(([lang]) => lang !== 'en')
    .reduce((sum, [, cnt]) => sum + cnt, 0);
  const totalNeeded = (EXPECTED_LANGUAGES.length - 1) * enCount;
  const overallPct = totalNeeded > 0 ? ((totalTranslated / totalNeeded) * 100).toFixed(1) : '0.0';
  
  console.log(`\n  Total translations: ${totalTranslated} / ${totalNeeded} needed (${overallPct}% overall)`);
  console.log();
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
