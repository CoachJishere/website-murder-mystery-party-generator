// Audit what's missing after the over-aggressive cleanup
const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';
const headers = { 'apikey': SERVICE_KEY, 'Authorization': 'Bearer ' + SERVICE_KEY };

async function fetchPosts(lang) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?select=id,slug,title&language=eq.${lang}&status=eq.published&order=slug.asc`, { headers });
  return res.json();
}

async function run() {
  const [enPosts, frPosts, itPosts, ptPosts] = await Promise.all([
    fetchPosts('en'), fetchPosts('fr'), fetchPosts('it'), fetchPosts('pt'),
  ]);

  console.log(`EN: ${enPosts.length}, FR: ${frPosts.length}, IT: ${itPosts.length}, PT: ${ptPosts.length}\n`);

  // List all EN post titles for reference
  console.log('=== ALL 61 ENGLISH POSTS ===');
  for (let i = 0; i < enPosts.length; i++) {
    console.log(`${i+1}. ${enPosts[i].title}`);
  }

  console.log('\n=== REMAINING FR POSTS (50) ===');
  for (const p of frPosts) {
    console.log(`  ${p.title}`);
  }

  console.log('\n=== REMAINING IT POSTS (46) ===');
  for (const p of itPosts) {
    console.log(`  ${p.title}`);
  }

  console.log('\n=== REMAINING PT POSTS (51) ===');
  for (const p of ptPosts) {
    console.log(`  ${p.title}`);
  }
}
run();
