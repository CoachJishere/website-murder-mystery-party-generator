const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';
const headers = { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY };

async function fetchPosts(lang) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/blog_posts?select=id,slug,title,created_at,language&language=eq.' + lang + '&status=eq.published&order=created_at.asc', { headers });
  return res.json();
}

async function run() {
  const [enPosts, frPosts, itPosts, ptPosts] = await Promise.all([
    fetchPosts('en'), fetchPosts('fr'), fetchPosts('it'), fetchPosts('pt'),
  ]);

  console.log('EN:', enPosts.length, 'FR:', frPosts.length, 'IT:', itPosts.length, 'PT:', ptPosts.length);

  // Build an English "topic fingerprint" for each post based on its slug
  // We need a smarter matching approach since translated slugs won't share keywords
  // Instead, let's look at the english_post_id or parent_id if they exist
  // Or we can match by position/order since translations usually correspond 1-to-1

  // Let's try a different approach: find which translated posts were created in the same batch
  // and look for oddball slugs

  console.log('\n=== FR score-0 posts (no English keyword match) ===');
  for (const p of frPosts) {
    const words = p.slug.split('-').filter(w => w.length > 2);
    let matched = false;
    for (const en of enPosts) {
      const enWords = en.slug.split('-').filter(w => w.length > 2);
      const common = enWords.filter(w => words.includes(w));
      if (common.length >= 2) { matched = true; break; }
    }
    if (!matched) {
      console.log(`  id=${p.id} slug="${p.slug}" title="${p.title}" created=${p.created_at}`);
    }
  }

  console.log('\n=== IT score-0 posts (no English keyword match) ===');
  for (const p of itPosts) {
    const words = p.slug.split('-').filter(w => w.length > 2);
    let matched = false;
    for (const en of enPosts) {
      const enWords = en.slug.split('-').filter(w => w.length > 2);
      const common = enWords.filter(w => words.includes(w));
      if (common.length >= 2) { matched = true; break; }
    }
    if (!matched) {
      console.log(`  id=${p.id} slug="${p.slug}" title="${p.title}" created=${p.created_at}`);
    }
  }

  console.log('\n=== PT score-0 posts (no English keyword match) ===');
  for (const p of ptPosts) {
    const words = p.slug.split('-').filter(w => w.length > 2);
    let matched = false;
    for (const en of enPosts) {
      const enWords = en.slug.split('-').filter(w => w.length > 2);
      const common = enWords.filter(w => words.includes(w));
      if (common.length >= 2) { matched = true; break; }
    }
    if (!matched) {
      console.log(`  id=${p.id} slug="${p.slug}" title="${p.title}" created=${p.created_at}`);
    }
  }

  // Also check: does the table have an english_post_id or parent_id column?
  console.log('\n=== Checking for parent/english_post_id columns ===');
  const res = await fetch(SUPABASE_URL + '/rest/v1/blog_posts?select=*&limit=1', { headers });
  const sample = await res.json();
  if (sample[0]) {
    console.log('Columns:', Object.keys(sample[0]).join(', '));
  }
}

run();
