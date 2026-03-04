import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

// Manual mapping of key themes to identify missing posts
const themeKeywords = {
  'victorian': ['빅토리아', 'victorian'],
  'speakeasy': ['스피크이지', '1920', 'speakeasy'],
  'medieval': ['중세', 'medieval'],
  'boring': ['지루한', 'boring'],
  'hollywood': ['할리우드', 'hollywood'],
  'zombie': ['좀비', 'zombie'],
  'archaeological': ['고고학', 'archaeological'],
  'film-noir': ['필름 누아르', 'film noir'],
  'superhero': ['슈퍼히어로', 'superhero'],
  'underwater': ['수중', 'underwater'],
  'dinner': ['저녁', 'dinner'],
  'corporate': ['기업', 'corporate'],
  'confusing-clues': ['혼란', 'confusing'],
  'unrealistic': ['비현실', 'unrealistic'],
  'unsatisfying': ['만족스럽지', 'unsatisfying'],
  'pacing': ['페이싱', 'pacing'],
  'participation': ['참여', 'participation']
};

async function identifyMissing() {
  const { data: enPosts } = await supabase
    .from('blog_posts')
    .select('id, slug, title')
    .eq('language', 'en')
    .eq('status', 'published')
    .order('created_at', { ascending: true });

  const { data: koPosts } = await supabase
    .from('blog_posts')
    .select('id, slug, title')
    .eq('language', 'ko')
    .eq('status', 'published');

  console.log(`English: ${enPosts.length} posts`);
  console.log(`Korean: ${koPosts.length} posts`);
  console.log(`Missing: ${enPosts.length - koPosts.length} posts\n`);

  // Check for specific themes that are likely missing
  const missingThemes = [
    'how-to-host-a-victorian-murder-mystery-party',
    '1920s-speakeasy-murder-mystery-party-guide',
    'unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime',
    'unique-archaeological-dig-murder-mystery-unearth-ancient-secrets-and-modern-murders',
    'how-to-host-a-superhero-murder-mystery-party-powers-secret-identities-and-super-villains',
    'unique-underwater-murder-mystery-plots-that-will-make-a-splash-at-your-party',
    'murder-mystery-party-for-dinner-parties-elevate-your-evening-with-culinary-intrigue',
    'detective-murder-mystery-themes-professional-investigators-sleuth-dynamics',
    'how-to-fix-unrealistic-murder-mystery-plots-create-believable-storylines-that-captivate'
  ];

  const missing = [];

  for (const slug of missingThemes) {
    const enPost = enPosts.find(p => p.slug === slug);
    if (enPost) {
      // Check if Korean version exists (by title pattern matching)
      const hasKorean = koPosts.some(ko => {
        const titleLower = ko.title.toLowerCase();
        if (slug.includes('victorian')) return titleLower.includes('빅토리아');
        if (slug.includes('speakeasy')) return titleLower.includes('스피크이지') || titleLower.includes('1920');
        if (slug.includes('film-noir')) return titleLower.includes('필름') || titleLower.includes('누아르');
        if (slug.includes('archaeological')) return titleLower.includes('고고학');
        if (slug.includes('superhero')) return titleLower.includes('슈퍼히어로');
        if (slug.includes('underwater')) return titleLower.includes('수중');
        if (slug.includes('dinner-parties')) return titleLower.includes('저녁') && titleLower.includes('파티');
        if (slug.includes('detective-murder')) return titleLower.includes('탐정') && !titleLower.includes('캐릭터');
        if (slug.includes('unrealistic')) return titleLower.includes('비현실');
        return false;
      });

      if (!hasKorean) {
        missing.push(enPost);
      }
    }
  }

  console.log(`\n=== IDENTIFIED MISSING POSTS (${missing.length}) ===\n`);
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

  console.log('✓ Saved to ko-missing-posts.json');

  return missing;
}

identifyMissing();
