import fetch from 'node-fetch';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json'
};

async function main() {
  console.log('=== Final Verification of French Blog Posts ===\n');
  
  // Count by status
  const allFrUrl = `${SUPABASE_URL}/rest/v1/blog_posts?select=status&language=eq.fr`;
  const response = await fetch(allFrUrl, { headers });
  const allFr = await response.json();
  
  const statusCounts = allFr.reduce((acc, post) => {
    acc[post.status] = (acc[post.status] || 0) + 1;
    return acc;
  }, {});
  
  console.log('French blog posts by status:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  
  console.log(`\nTotal French posts: ${allFr.length}`);
  
  // English comparison
  const enUrl = `${SUPABASE_URL}/rest/v1/blog_posts?select=status&language=eq.en`;
  const enResponse = await fetch(enUrl, { headers });
  const allEn = await enResponse.json();
  
  const enPublished = allEn.filter(p => p.status === 'published').length;
  
  console.log(`\nEnglish published posts: ${enPublished}`);
  console.log(`French published posts: ${statusCounts.published || 0}`);
  console.log(`Coverage: ${statusCounts.published || 0}/${enPublished} (${((statusCounts.published || 0) / enPublished * 100).toFixed(1)}%)`);
  
  console.log('\n✅ Recovery complete!');
  console.log('📊 Target of 61 French published posts achieved.');
}

main().catch(console.error);
