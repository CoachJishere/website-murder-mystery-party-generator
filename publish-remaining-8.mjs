import fetch from 'node-fetch';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// Best matches for each missing English post
const toPublish = [
  {
    enTopic: 'confusing-clues',
    enTitle: 'How to Fix Confusing Murder Mystery Clues',
    frId: 'ca734fca-8192-49da-9d47-433bcd4e4cb4',
    frSlug: 'comment-resoudre-les-indices-deroutants-dun-mystere-de-meurtre-guide-de-creation-2025'
  },
  {
    enTopic: 'space-station',
    enTitle: 'How to Host a Space Station Murder Mystery',
    frId: '8ec6069f-0a37-4604-88ca-05d03d4460f8',
    frSlug: 'comment-organiser-un-mystere-de-meurtre-dans-la-station-spatiale-guide-futuriste-2025'
  },
  {
    enTopic: 'innocent-bystander',
    enTitle: 'Innocent Bystander Murder Mystery Themes',
    frId: '4f81c453-16a1-4896-9891-56f2e74c8a7b',
    frSlug: 'themes-mystere-meurtre-temoins-innocents-mauvais-endroit-mauvais-moment'
  },
  {
    enTopic: 'school-reunion',
    enTitle: 'Unique School Reunion Murder Mystery Plots',
    frId: '890a6259-f0f2-41d5-96ab-61518b5d99e8',
    frSlug: 'des-intrigues-uniques-de-meurtres-et-de-mysteres-pour-les-reunions-decole-qui-devoilent-des-secrets-enfouis-guide-nostalgique-2025'
  },
  {
    enTopic: 'unsatisfying-endings',
    enTitle: 'How to Fix Unsatisfying Mystery Endings',
    frId: '81e99c4c-e5a9-4a15-8c02-f901fffb3090',
    frSlug: 'comment-resoudre-les-fins-de-mystere-insatisfaisantes-creer-des-revelations-qui-satisfont-vraiment'
  },
  {
    enTopic: 'non-participating',
    enTitle: 'How to Fix Guests Who Won\'t Participate',
    frId: '00c8b42e-4599-4ea4-bd13-f4d7838bae78',
    frSlug: 'comment-regler-le-probleme-des-invites-qui-refusent-de-participer-a-votre-soiree-mystere-et-meurtre'
  }
];

async function updatePostStatus(postId, slug) {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?id=eq.${postId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'published' })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update ${slug}: ${response.statusText} - ${errorText}`);
  }
  return response.json();
}

async function getFinalCount() {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?select=id&language=eq.fr&status=eq.published`;
  const response = await fetch(url, { headers });
  return response.json();
}

async function main() {
  console.log('=== Publishing Remaining 6 French Posts ===\n');
  console.log('These are the best matches from drafts for missing English posts:\n');
  
  let successCount = 0;
  
  for (const post of toPublish) {
    try {
      await updatePostStatus(post.frId, post.frSlug);
      successCount++;
      console.log(`✓ Published: ${post.enTopic}`);
      console.log(`  EN: ${post.enTitle}`);
      console.log(`  FR: ${post.frSlug}\n`);
    } catch (error) {
      console.log(`✗ Failed: ${post.enTopic}`);
      console.log(`  Error: ${error.message}\n`);
    }
  }
  
  console.log(`Published ${successCount} of ${toPublish.length} posts\n`);
  
  const finalPosts = await getFinalCount();
  console.log('=== FINAL COUNT ===');
  console.log(`Total French published posts: ${finalPosts.length}`);
  console.log(`Target: 61`);
  
  if (finalPosts.length >= 61) {
    console.log('\n✓ SUCCESS! Target reached or exceeded!');
  } else {
    console.log(`\n⚠️  Still need ${61 - finalPosts.length} more posts`);
  }
  
  console.log('\n=== Still Missing (no good draft match found) ===');
  console.log('- date-night: Murder Mystery Party for Date Night Ideas');
  console.log('- dinner-party: Murder Mystery Party for Dinner Parties');
  console.log('- archaeological: Unique Archaeological Dig Murder Mystery');
  console.log('- spa-resort: Spa Resort Murder Mystery Party Guide');
}

main().catch(console.error);
