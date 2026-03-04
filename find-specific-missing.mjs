const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';
const headers = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` };

async function fetchPosts(lang) {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?language=eq.${lang}&status=eq.published&select=id,title,slug&limit=1000`;
  const res = await fetch(url, { headers });
  return res.json();
}

function normalizeSlug(slug) {
  return slug.replace(/-(ja|ko|zh-cn|zh|pt|fr|de|es|it|sv|nl|da|fi)$/, '').toLowerCase();
}

function slugWords(slug) {
  return new Set(slug.split('-').filter(w => w.length > 3));
}

async function main() {
  const enPosts = await fetchPosts('en');
  console.log(`English baseline: ${enPosts.length} published posts\n`);
  const enSlugs = enPosts.map(p => p.slug);
  const enBySlug = {};
  enPosts.forEach(p => { enBySlug[p.slug] = p.title; });

  const langs = ['ja', 'nl', 'sv', 'ko', 'da', 'fi', 'fr', 'it', 'pt'];
  for (const lang of langs) {
    const posts = await fetchPosts(lang);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${lang.toUpperCase()}: ${posts.length} posts (${posts.length >= 61 ? 'complete or extra' : 'missing ~' + (61 - posts.length)})`);
    console.log('='.repeat(60));

    if (posts.length > 61) {
      console.log(`  WARNING: ${posts.length - 61} extra posts`);
      const slugCounts = {};
      posts.forEach(p => { slugCounts[p.slug] = (slugCounts[p.slug] || 0) + 1; });
      const dupes = Object.entries(slugCounts).filter(([,c]) => c > 1);
      if (dupes.length) {
        console.log(`  Duplicate slugs:`);
        dupes.forEach(([s,c]) => console.log(`    "${s}" appears ${c} times`));
      }
      continue;
    }
    if (posts.length === 61) { console.log('  COMPLETE'); continue; }

    const matched = new Set();
    // Method 1: suffix stripping
    for (const p of posts) {
      const norm = normalizeSlug(p.slug);
      if (enBySlug[norm]) matched.add(norm);
    }
    // Method 2: word overlap
    for (const p of posts) {
      const tWords = slugWords(p.slug);
      for (const eSlug of enSlugs) {
        if (matched.has(eSlug)) continue;
        const eWords = slugWords(eSlug);
        let overlap = 0;
        for (const w of tWords) { if (eWords.has(w)) overlap++; }
        if (overlap >= 2) { matched.add(eSlug); break; }
      }
    }

    const missing = enPosts.filter(p => !matched.has(p.slug));
    console.log(`  Auto-matched: ${matched.size}/${61} English posts`);
    if (matched.size >= posts.length - 5) {
      console.log(`  MISSING translations for these English posts:`);
      missing.forEach((p, i) => console.log(`    ${i+1}. ${p.slug}`));
    } else {
      console.log(`  (Low confidence - listing first 30 unmatched)`);
      missing.slice(0, 30).forEach((p, i) => console.log(`    ${i+1}. ${p.slug}`));
      if (missing.length > 30) console.log(`    ... and ${missing.length - 30} more`);
    }
  }
}
main().catch(console.error);
