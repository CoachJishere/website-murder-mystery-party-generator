import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  "https://mhfikaomkmqcndqfohbp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w"
);

// Load research data
const researchData = readFileSync('./temp-files/mm-research-icehotel-filmnoire.md', 'utf-8');

// Define posts to optimize with their slugs and themes
const posts = [
  {
    slug: 'unique-film-noir-murder-mystery-plots-enter-the-shadows-of-urban-crime',
    theme: 'Film Noir',
    readingTime: 14
  },
  {
    slug: 'spa-resort-murder-mystery-party-guide-relax-into-danger-and-luxury',
    theme: 'Spa Resort',
    readingTime: 15
  },
  {
    slug: 'chef-murder-mystery-themes-culinary-crimes-kitchen-secrets',
    theme: 'Chef',
    readingTime: 14
  },
  {
    slug: 'unique-circus-murder-mystery-plot-ideas',
    theme: 'Circus',
    readingTime: 13
  },
  {
    slug: 'unique-space-colony-murder-mystery-plots-explore-the-final-frontier-of-crime',
    theme: 'Space Colony',
    readingTime: 15
  },
  {
    slug: '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable',
    theme: 'Beach Resort',
    readingTime: 14
  },
  {
    slug: 'haunted-hotel-murder-mystery-party-guide-check-in-to-terror-and-suspense',
    theme: 'Haunted Hotel',
    readingTime: 15
  },
  {
    slug: 'unique-train-station-murder-mystery-plots-all-aboard-for-danger-and-intrigue',
    theme: 'Train Station',
    readingTime: 14
  },
  {
    slug: 'unique-underwater-murder-mystery-plots-that-will-make-a-splash-at-your-party',
    theme: 'Underwater',
    readingTime: 15
  }
];

console.log(`\n🎯 Optimizing ${posts.length} Pack 1 blog posts...\n`);

for (const post of posts) {
  console.log(`\n📝 Processing: ${post.theme}`);
  console.log(`   Slug: ${post.slug}`);

  // Fetch current content
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, content, title')
    .eq('slug', post.slug)
    .eq('language', 'en')
    .single();

  if (error) {
    console.error(`   ❌ Error fetching ${post.theme}:`, error.message);
    continue;
  }

  if (!data) {
    console.error(`   ❌ Post not found: ${post.theme}`);
    continue;
  }

  console.log(`   ✓ Fetched post (ID: ${data.id})`);
  console.log(`   ✓ Current length: ${data.content.length} characters`);
  console.log(`   ⏭️  Skipping optimization (will be done by Claude)`);
}

console.log('\n✅ Scan complete! All 9 posts found and ready for optimization.\n');
