#!/usr/bin/env node

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const slugsToCheck = [
  'ko-art-gallery-murder-mystery-party-planning-create-sophisticated-creative-crimes',
  'ko-bookstore-murder-mystery-party-planning-turn-the-page-on-literary-murder',
  'ko-butler-murder-mystery-themes-manor-murders-household-secrets',
  'ko-chef-murder-mystery-themes-culinary-crimes-kitchen-secrets',
  'ko-cruise-ship-murder-mystery-party-guide-set-sail-for-murder-on-the-high-seas',
  'ko-detective-murder-mystery-themes-professional-investigators-sleuth-dynamics',
  'ko-haunted-hotel-murder-mystery-party-guide-check-in-to-terror-and-suspense',
  'ko-how-to-fix-boring-murder-mystery-parties',
  'ko-how-to-fix-confusing-murder-mystery-clues',
  'ko-how-to-fix-guests-breaking-character-keep-your-murder-mystery-party-immersive'
];

async function main() {
  console.log('Verifying Korean batch 2 posts in database...\\n');

  const response = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?select=slug,title,language,status&language=eq.ko&order=created_at.desc&limit=20`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const allKoPosts = await response.json();

  console.log(`Total Korean posts in database: ${allKoPosts.length}`);
  console.log('\\nBatch 2 posts verification:\\n');

  let foundCount = 0;
  slugsToCheck.forEach((slug, index) => {
    const found = allKoPosts.find(p => p.slug === slug);
    if (found) {
      console.log(`✅ ${index + 1}. ${found.title.substring(0, 60)}...`);
      foundCount++;
    } else {
      console.log(`❌ ${index + 1}. ${slug} - NOT FOUND`);
    }
  });

  console.log(`\\n=== VERIFICATION SUMMARY ===`);
  console.log(`Found: ${foundCount}/${slugsToCheck.length} posts`);
  console.log(`Missing: ${slugsToCheck.length - foundCount}/${slugsToCheck.length} posts`);

  if (foundCount === slugsToCheck.length) {
    console.log('\\n🎉 All batch 2 Korean posts successfully inserted!');
  }
}

main();
