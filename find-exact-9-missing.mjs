import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

const { data: enPosts } = await supabase
  .from('blog_posts')
  .select('id, slug, title')
  .eq('language', 'en')
  .eq('status', 'published')
  .order('created_at', { ascending: true });

const { data: koPosts } = await supabase
  .from('blog_posts')
  .select('slug, title')
  .eq('language', 'ko')
  .eq('status', 'published');

console.log(`Total English: ${enPosts.length}`);
console.log(`Total Korean: ${koPosts.length}`);
console.log(`Need to find: ${enPosts.length - koPosts.length} missing posts\n`);

// Known missing posts based on previous check
const definitelyMissing = [
  '1920s-speakeasy-murder-mystery-party-guide',
  'unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime',
  'unique-archaeological-dig-murder-mystery-unearth-ancient-secrets-and-modern-murders',
  'how-to-host-a-superhero-murder-mystery-party-powers-secret-identities-and-super-villains',
  'unique-underwater-murder-mystery-plots-that-will-make-a-splash-at-your-party',
  'murder-mystery-party-for-dinner-parties-elevate-your-evening-with-culinary-intrigue',
  'detective-murder-mystery-themes-professional-investigators-sleuth-dynamics',
  'how-to-fix-unrealistic-murder-mystery-plots-create-believable-storylines-that-captivate'
];

// Additional candidates to check
const checkCandidates = [
  'how-to-host-a-victorian-murder-mystery-party',
  'spa-resort-murder-mystery-party-guide-relax-into-danger-and-luxury',
  'how-to-fix-poor-mystery-pacing-issues-master-the-art-of-murder-mystery-timing',
  'how-to-fix-guests-who-wont-participate-in-your-murder-mystery-party',
  'how-to-fix-unsatisfying-mystery-endings-create-reveals-that-actually-satisfy'
];

const missing = [];

// Add definitely missing posts
for (const slug of definitelyMissing) {
  const post = enPosts.find(p => p.slug === slug);
  if (post) {
    missing.push(post);
  }
}

console.log(`Found ${missing.length} definitely missing posts`);
console.log('Checking additional candidates...\n');

// Check candidates more carefully
for (const slug of checkCandidates) {
  const enPost = enPosts.find(p => p.slug === slug);
  if (!enPost) continue;

  let hasKorean = false;

  if (slug === 'how-to-host-a-victorian-murder-mystery-party') {
    // Look for EXACT Victorian party post (not steampunk which mentions Victorian era)
    hasKorean = koPosts.some(ko =>
      ko.title === '빅토리아 시대 살인 미스터리 파티 주최하는 방법' ||
      (ko.title.includes('빅토리아') && !ko.title.includes('스팀펑크') && !ko.title.includes('공상'))
    );
  } else if (slug === 'spa-resort-murder-mystery-party-guide-relax-into-danger-and-luxury') {
    // Look for Spa Resort (not Spy thriller)
    hasKorean = koPosts.some(ko =>
      ko.title.includes('스파 리조트') || (ko.title.includes('스파') && ko.title.includes('리조트'))
    );
  } else if (slug === 'how-to-fix-poor-mystery-pacing-issues-master-the-art-of-murder-mystery-timing') {
    hasKorean = koPosts.some(ko =>
      ko.title.includes('페이싱') || (ko.title.includes('속도') && ko.title.includes('고치'))
    );
  } else if (slug === 'how-to-fix-guests-who-wont-participate-in-your-murder-mystery-party') {
    hasKorean = koPosts.some(ko =>
      ko.title.includes('참여하지 않는') || (ko.title.includes('참여') && ko.title.includes('않는'))
    );
  } else if (slug === 'how-to-fix-unsatisfying-mystery-endings-create-reveals-that-actually-satisfy') {
    hasKorean = koPosts.some(ko =>
      ko.title.includes('만족스럽지 않은') && ko.title.includes('결말')
    );
  }

  console.log(`${enPost.title}`);
  console.log(`  Korean: ${hasKorean ? '✓ EXISTS' : '✗ MISSING'}\n`);

  if (!hasKorean && missing.length < 9) {
    missing.push(enPost);
  }
}

console.log(`\n=== FINAL 9 MISSING POSTS ===\n`);
missing.forEach((post, idx) => {
  console.log(`${idx + 1}. ${post.title}`);
  console.log(`   ID: ${post.id}`);
  console.log(`   Slug: ${post.slug}\n`);
});

// Save to file
fs.writeFileSync('ko-missing-posts.json', JSON.stringify({
  language: 'ko',
  missing_count: missing.length,
  missing_posts: missing
}, null, 2));

console.log(`✓ Saved ${missing.length} posts to ko-missing-posts.json`);
