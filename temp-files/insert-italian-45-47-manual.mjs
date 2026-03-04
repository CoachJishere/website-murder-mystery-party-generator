import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

async function insertItalianPosts() {
  console.log('Preparing to insert 3 Italian posts (45-47)...\n');

  // Since we can't use the API due to key issues, I'll note the posts that need translation
  const postsNeedingTranslation = [
    {
      englishId: '6c030a19-7884-42fa-aecb-d97ef2b0bdac',
      title: 'Unique Underwater Murder Mystery Plots That Will Make a Splash at Your Party',
      slug: 'unique-underwater-murder-mystery-plots-that-will-make-a-splash-at-your-party',
      theme: 'Underwater'
    },
    {
      englishId: 'b88413c5-7f5b-4dad-955f-aab433943b19',
      title: 'Villain Murder Mystery Themes: Masterminds, Desperate Killers, and Unexpected Antagonists',
      slug: 'villain-murder-mystery-themes-masterminds-killers-antagonists',
      theme: 'Mystery Themes'
    },
    {
      englishId: 'fb39f18e-8b9f-4332-9502-dc88fa9345e9',
      title: 'Wild West Murder Mystery Party Planning',
      slug: 'wild-west-murder-mystery-party-planning',
      theme: 'Wild West'
    }
  ];

  console.log('Posts 45-47 that need Italian translation:');
  postsNeedingTranslation.forEach((post, i) => {
    console.log(`  ${i + 45}. ${post.title}`);
    console.log(`      English slug: ${post.slug}`);
    console.log(`      Italian slug: it-${post.slug}`);
    console.log(`      Theme: ${post.theme}\n`);
  });

  console.log('\n⚠️  API KEY ISSUE DETECTED');
  console.log('The ANTHROPIC_API_KEY in .env appears to be invalid or expired.');
  console.log('To complete these translations, you need to:');
  console.log('1. Update the ANTHROPIC_API_KEY in the .env file with a valid key');
  console.log('2. Re-run this script or the translate-italian-45-47.mjs script\n');

  // Save the list for reference
  const fs = await import('fs/promises');
  await fs.writeFile(
    '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/temp-files/italian-posts-45-47-needed.json',
    JSON.stringify(postsNeedingTranslation, null, 2)
  );

  console.log('✅ Saved list of posts needing translation to italian-posts-45-47-needed.json');
}

insertItalianPosts().catch(console.error);
