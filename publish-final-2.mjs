import fetch from 'node-fetch';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

const toPublish = [
  {
    id: '7291fafd-19ee-4607-967e-3c76acb9ebd0',
    slug: '5-themes-de-soiree-meurtre-et-mystere-de-tournoi-medieval-chevalerie-competition-et-intrigues-de-chateau',
    title: '5 Thèmes de Soirée Meurtre et Mystère de Tournoi Médiéval : Chevalerie, Compétition et Intrigues de Château'
  },
  {
    id: '51dd0032-bf06-4615-a85d-0e0acc8d9b51',
    slug: 'scenarios-de-meurtre-et-mystere-uniques-dans-le-monde-des-reves-qui-brouillent-realite-et-cauchemar',
    title: 'Scénarios de meurtre et mystère uniques dans le monde des rêves qui brouillent réalité et cauchemar'
  }
];

async function updatePostStatus(postId) {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?id=eq.${postId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'published' })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed: ${response.statusText} - ${errorText}`);
  }
  return response.json();
}

async function getFinalCount() {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?select=id&language=eq.fr&status=eq.published`;
  const response = await fetch(url, { headers });
  return response.json();
}

async function main() {
  console.log('=== Publishing Final 2 French Posts to Reach Target ===\n');
  
  for (const post of toPublish) {
    try {
      await updatePostStatus(post.id);
      console.log(`✓ Published:`);
      console.log(`  ${post.slug}`);
      console.log(`  ${post.title}\n`);
    } catch (error) {
      console.log(`✗ Failed to publish ${post.slug}`);
      console.log(`  Error: ${error.message}\n`);
    }
  }
  
  const finalPosts = await getFinalCount();
  
  console.log('=== FINAL RESULT ===');
  console.log(`Total French published posts: ${finalPosts.length}`);
  console.log(`Target: 61`);
  
  if (finalPosts.length >= 61) {
    console.log('\n🎉 SUCCESS! Target of 61 French posts achieved!');
  } else {
    console.log(`\n⚠️  Still need ${61 - finalPosts.length} more posts`);
  }
}

main().catch(console.error);
