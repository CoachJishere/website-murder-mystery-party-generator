#!/usr/bin/env node

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const HEADERS = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

async function fetchPosts(language) {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?language=eq.${language}&select=id,title,slug,theme&limit=1000`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch ${language} posts: ${res.status}`);
  return res.json();
}

function normalizeTheme(theme) {
  if (!theme) return '';
  return theme.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/**
 * Match translated posts to English posts using theme.
 * Returns the unmatched English posts (likely missing translations).
 */
function matchByTheme(englishPosts, translatedPosts) {
  const enByTheme = {};
  for (const ep of englishPosts) {
    const nt = normalizeTheme(ep.theme);
    if (!enByTheme[nt]) enByTheme[nt] = [];
    enByTheme[nt].push(ep);
  }

  const trByTheme = {};
  for (const tp of translatedPosts) {
    const nt = normalizeTheme(tp.theme);
    if (!trByTheme[nt]) trByTheme[nt] = [];
    trByTheme[nt].push(tp);
  }

  const matchedEnSlugs = new Set();
  for (const [theme, enPosts] of Object.entries(enByTheme)) {
    const trPosts = trByTheme[theme] || [];
    const toMatch = Math.min(enPosts.length, trPosts.length);
    for (let i = 0; i < toMatch; i++) {
      matchedEnSlugs.add(enPosts[i].slug);
    }
  }

  const unmatched = englishPosts.filter(ep => !matchedEnSlugs.has(ep.slug));
  return { matched: matchedEnSlugs.size, unmatched };
}

async function main() {
  console.log('=== MISSING BLOG POST TRANSLATION AUDIT ===');
  console.log(`Date: ${new Date().toISOString().split('T')[0]}\n`);

  // Fetch all languages in parallel for speed
  const allLangs = ['es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh-cn', 'sv', 'nl', 'da', 'fi'];
  
  const [englishPosts, ...langResults] = await Promise.all([
    fetchPosts('en'),
    ...allLangs.map(lang => fetchPosts(lang))
  ]);
  
  englishPosts.sort((a, b) => a.slug.localeCompare(b.slug));
  console.log(`English baseline: ${englishPosts.length} posts\n`);

  // Build per-language data
  const langData = {};
  for (let i = 0; i < allLangs.length; i++) {
    const lang = allLangs[i];
    const posts = langResults[i];
    const countGap = englishPosts.length - posts.length;
    const { matched, unmatched } = matchByTheme(englishPosts, posts);
    langData[lang] = { total: posts.length, countGap, matched, unmatched, posts };
  }

  // ── DETAILED RESULTS ──
  for (const lang of allLangs) {
    const r = langData[lang];
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`[${lang.toUpperCase()}] ${r.total} of ${englishPosts.length} posts (${((r.total / englishPosts.length) * 100).toFixed(0)}%)`);
    console.log(`  Missing (by count): ${r.countGap} | Theme-matched: ${r.matched}`);

    if (r.unmatched.length > 0) {
      // Group by theme
      const byTheme = {};
      for (const m of r.unmatched) {
        const t = m.theme || 'Unknown';
        if (!byTheme[t]) byTheme[t] = [];
        byTheme[t].push(m);
      }
      
      const themes = Object.keys(byTheme).sort();
      let idx = 0;
      const maxToShow = 60;
      
      console.log(`\n  English posts likely missing ${lang.toUpperCase()} translation (${r.unmatched.length} identified):`);
      console.log(`  (Note: count gap = ${r.countGap}, theme-identified = ${r.unmatched.length})`);
      for (const theme of themes) {
        if (idx >= maxToShow) break;
        for (const m of byTheme[theme]) {
          if (idx >= maxToShow) break;
          idx++;
          console.log(`    ${idx.toString().padStart(3)}. [${theme}] ${m.title}`);
        }
      }
      if (r.unmatched.length > maxToShow) {
        console.log(`    ... and ${r.unmatched.length - maxToShow} more`);
      }
    }
  }

  // ── SUMMARY TABLE ──
  console.log(`\n\n${'═'.repeat(70)}`);
  console.log('SUMMARY TABLE');
  console.log('═'.repeat(70));
  console.log('');
  console.log('Lang     | Total | Missing (gap) | Theme Matched | % Complete');
  console.log('---------|-------|---------------|---------------|----------');
  console.log(`en       | ${englishPosts.length.toString().padStart(5)} |             - |             - | 100%`);
  
  for (const lang of allLangs) {
    const r = langData[lang];
    const pct = ((r.total / englishPosts.length) * 100).toFixed(0);
    console.log(
      `${lang.padEnd(8)} | ${r.total.toString().padStart(5)} | ${r.countGap.toString().padStart(13)} | ${r.matched.toString().padStart(13)} | ${pct}%`
    );
  }

  // ── PRIORITY RANKING ──
  console.log('\n\nPRIORITY RANKING (fewest missing first):');
  const sorted = allLangs
    .map(lang => ({ lang, missing: langData[lang].countGap, total: langData[lang].total }))
    .sort((a, b) => a.missing - b.missing);
  
  for (const r of sorted) {
    console.log(`  ${r.lang.toUpperCase().padEnd(5)} - ${r.missing.toString().padStart(3)} missing (${r.total} of ${englishPosts.length})`);
  }

  // ── THEME COVERAGE ANALYSIS ──
  // All done in memory using already-fetched data
  console.log('\n\n' + '═'.repeat(70));
  console.log('THEMES WITH NO TRANSLATIONS IN ANY TARGET LANGUAGE');
  console.log('═'.repeat(70));
  
  // Collect all translated themes per language
  const allTranslatedThemes = new Set();
  for (const lang of allLangs) {
    for (const tp of langData[lang].posts) {
      allTranslatedThemes.add(normalizeTheme(tp.theme));
    }
  }

  // Find English themes with zero translations anywhere
  const enThemes = {};
  for (const ep of englishPosts) {
    const nt = normalizeTheme(ep.theme);
    if (!enThemes[nt]) enThemes[nt] = { theme: ep.theme, posts: [] };
    enThemes[nt].posts.push(ep);
  }

  const universallyMissing = Object.entries(enThemes)
    .filter(([nt]) => !allTranslatedThemes.has(nt))
    .sort(([, a], [, b]) => a.theme.localeCompare(b.theme));
  
  console.log(`\n${universallyMissing.length} English themes have ZERO translations in any language:\n`);
  for (const [, info] of universallyMissing) {
    console.log(`  [${info.theme}] (${info.posts.length} post${info.posts.length > 1 ? 's' : ''}):`);
    for (const p of info.posts) {
      console.log(`    - ${p.title}`);
    }
  }

  // ── THEMES PARTIALLY TRANSLATED ──
  console.log('\n\n' + '═'.repeat(70));
  console.log('THEME COVERAGE BY LANGUAGE (themes with translations in < 6 languages)');
  console.log('═'.repeat(70));
  
  // For each English theme, count how many languages have at least one post with that theme
  const themeLangCoverage = {};
  for (const [nt, info] of Object.entries(enThemes)) {
    themeLangCoverage[nt] = { theme: info.theme, enCount: info.posts.length, langs: [] };
    for (const lang of allLangs) {
      const has = langData[lang].posts.some(tp => normalizeTheme(tp.theme) === nt);
      if (has) themeLangCoverage[nt].langs.push(lang);
    }
  }

  const partiallyTranslated = Object.values(themeLangCoverage)
    .filter(tc => tc.langs.length > 0 && tc.langs.length < 6)
    .sort((a, b) => a.langs.length - b.langs.length);

  console.log(`\n${partiallyTranslated.length} themes translated in fewer than 6 languages:\n`);
  for (const tc of partiallyTranslated.slice(0, 50)) {
    console.log(`  [${tc.theme}] (${tc.enCount} EN post${tc.enCount > 1 ? 's' : ''}) => ${tc.langs.length} lang${tc.langs.length > 1 ? 's' : ''}: ${tc.langs.join(', ')}`);
  }
  if (partiallyTranslated.length > 50) {
    console.log(`  ... and ${partiallyTranslated.length - 50} more`);
  }

  console.log('\n=== END OF AUDIT ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
