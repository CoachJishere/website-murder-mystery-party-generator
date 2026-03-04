import fetch from 'node-fetch';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

async function checkPosts() {
  // Check for space station post
  const response1 = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.saadan-arrangerer-du-en-rumstation-mordmysterium-fest&select=id,title,slug`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    }
  );
  const post1 = await response1.json();

  // Check for innocent bystander post
  const response2 = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.uskyldig-tilskuer-mordmysterium-temaer-forkert-sted-forkert-tid&select=id,title,slug`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    }
  );
  const post2 = await response2.json();

  // List all DA posts
  const responseAll = await fetch(
    `${SUPABASE_URL}/rest/v1/blog_posts?language=eq.da&select=id,title,slug&order=created_at.desc`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    }
  );
  const allPosts = await responseAll.json();

  console.log('Post 1 (Space Station):', post1.length > 0 ? '✅ FOUND' : '❌ NOT FOUND');
  if (post1.length > 0) {
    console.log('  ', post1[0].title);
  }

  console.log('\nPost 2 (Innocent Bystander):', post2.length > 0 ? '✅ FOUND' : '❌ NOT FOUND');
  if (post2.length > 0) {
    console.log('  ', post2[0].title);
  }

  console.log(`\n\nTotal Danish posts in database: ${allPosts.length}`);
  console.log('\nAll Danish post titles:');
  allPosts.forEach((p, i) => {
    console.log(`${i + 1}. ${p.title}`);
    console.log(`   Slug: ${p.slug}\n`);
  });
}

checkPosts().catch(console.error);
