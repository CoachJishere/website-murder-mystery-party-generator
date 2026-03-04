import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('🔍 FINDING AND REPUBLISHING CORE ENGLISH POSTS\n');
console.log('=' .repeat(80));

// User-provided list of initial 61 posts that went live before holidays
const corePostTitles = [
  "How to Host a Victorian Murder Mystery Party",
  "Detective Murder Mystery Themes: Professional Investigators and Sleuth Dynamics",
  "1920s Speakeasy Murder Mystery Party Guide",
  "Murder Mystery Party for Small Groups Ideas",
  "Unique Medieval Murder Mystery Plot Ideas",
  "How to Fix Boring Murder Mystery Parties",
  "5 Haunted Mansion Murder Mystery Themes",
  "How to Host a Hollywood Murder Mystery Party",
  "Villain Murder Mystery Themes: Masterminds, Desperate Killers, and Unexpected Antagonists",
  "Wild West Murder Mystery Party Planning",
  "Murder Mystery Party for Teenagers Guide",
  "Unique Pirate Murder Mystery Plot Ideas",
  "How to Fix Confusing Murder Mystery Clues",
  "5 Renaissance Murder Mystery Party Themes",
  "How to Host a Space Station Murder Mystery",
  "Innocent Bystander Murder Mystery Themes: Wrong Place, Wrong Time Scenarios",
  "Ancient Egypt Murder Mystery Party Guide",
  "Murder Mystery Party for Corporate Events",
  "Unique Circus Murder Mystery Plot Ideas",
  "How to Fix Overly Complex Murder Mysteries",
  "5 Masquerade Ball Murder Mystery Themes That Will Leave Your Guests Speechless",
  "How to Host a Zombie Apocalypse Murder Mystery That Will Have Your Guests Fighting for Survival",
  "Medical Examiner Murder Mystery Themes: Forensic Experts Solve Deadly Cases",
  "Art Gallery Murder Mystery Party Planning: Create Sophisticated Creative Crimes",
  "Murder Mystery Party for Birthday Celebrations: Make Their Special Day Unforgettable",
  "Unique Underwater Murder Mystery Plots That Will Make a Splash at Your Party",
  "How to Fix Guests Breaking Character: Keep Your Murder Mystery Party Immersive",
  "5 Spy Thriller Murder Mystery Themes That Will Have Your Guests Going Undercover",
  "How to Host a Fairy Tale Murder Mystery Party: Once Upon a Crime",
  "Lawyer Murder Mystery Themes: Courtroom Drama and Legal Intrigue",
  "Cruise Ship Murder Mystery Party Guide: Set Sail for Murder on the High Seas",
  "Murder Mystery Party for Date Night Ideas: Where Romance Meets Mystery",
  "Unique School Reunion Murder Mystery Plots That Uncover Buried Secrets",
  "How to Fix Unsatisfying Mystery Endings: Create Reveals That Actually Satisfy",
  "5 Casino Murder Mystery Party Themes: Roll the Dice on Deadly High-Stakes Drama",
  "How to Host a Steampunk Murder Mystery Party: Gear Up for Victorian Sci-Fi Crime",
  "Butler Murder Mystery Themes: Manor Murders and Household Secrets",
  "Jazz Club Murder Mystery Party Planning: Swing Into Prohibition-Era Crime",
  "Murder Mystery Party for Holiday Gatherings: Festive Fun Meets Family Intrigue",
  "Unique Archaeological Dig Murder Mystery: Unearth Ancient Secrets and Modern Murders",
  "How to Fix Guests Who Won't Participate in Your Murder Mystery Party",
  "5 Mountain Lodge Murder Mystery Themes That Will Make Your Retreat Unforgettable",
  "How to Host a Superhero Murder Mystery Party: Powers, Secret Identities, and Super Villains",
  "Journalist Murder Mystery Themes: Investigative Reporters Uncover Deadly Stories",
  "Haunted Hotel Murder Mystery Party Guide: Check In to Terror and Suspense",
  "Murder Mystery Party for Office Teams: Build Bonds Through Collaborative Investigation",
  "Unique Train Station Murder Mystery Plots: All Aboard for Danger and Intrigue",
  "How to Fix Poor Mystery Pacing Issues: Master the Art of Murder Mystery Timing",
  "5 Beach Resort Murder Mystery Themes That Will Make Your Vacation Unforgettable",
  "How to Host a Prohibition Era Murder Mystery: Bootleg Your Way to Excitement",
  "Socialite Murder Mystery Themes: High Society Scandals and Elite Intrigue",
  "Bookstore Murder Mystery Party Planning: Turn the Page on Literary Murder",
  "Murder Mystery Party for Dinner Parties: Elevate Your Evening with Culinary Intrigue",
  "Unique Space Colony Murder Mystery Plots: Explore the Final Frontier of Crime",
  "How to Fix Unrealistic Murder Mystery Plots: Create Believable Storylines That Captivate",
  "5 Vintage Circus Murder Mystery Themes: Step Into the Big Top of Intrigue",
  "How to Host a Medieval Castle Murder Mystery: Rule Your Realm with Royal Intrigue",
  "Chef Murder Mystery Themes: Culinary Crimes and Kitchen Secrets",
  "Spa Resort Murder Mystery Party Guide: Relax Into Danger and Luxury",
  "Murder Mystery Party for Game Night Groups: Transform Your Regular Game Night",
  "Unique Film Noir Murder Mystery Plots: Enter the Shadows of Urban Crime"
];

console.log(`Looking for ${corePostTitles.length} core posts in database...\n`);

// Search for these posts by title
const foundPosts = [];
const missingTitles = [];

for (const title of corePostTitles) {
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, status, published_at, updated_at')
    .eq('language', 'en')
    .ilike('title', title);

  if (error) {
    console.error(`Error searching for "${title}":`, error);
    continue;
  }

  if (posts.length === 0) {
    missingTitles.push(title);
  } else if (posts.length === 1) {
    foundPosts.push(posts[0]);
  } else {
    console.log(`⚠️  Multiple matches for "${title}": ${posts.length} posts found`);
    foundPosts.push(posts[0]); // Take the first one
  }
}

console.log(`Found: ${foundPosts.length} posts`);
console.log(`Missing: ${missingTitles.length} posts\n`);

if (missingTitles.length > 0) {
  console.log('Missing titles:');
  missingTitles.forEach(title => console.log(`  - ${title}`));
  console.log('');
}

// Check status of found posts
const draftPosts = foundPosts.filter(p => p.status === 'draft');
const publishedPosts = foundPosts.filter(p => p.status === 'published');

console.log(`Status breakdown:`);
console.log(`  Draft: ${draftPosts.length}`);
console.log(`  Published: ${publishedPosts.length}\n`);

// Republish all draft posts
if (draftPosts.length > 0) {
  console.log(`\n📤 Republishing ${draftPosts.length} draft posts...\n`);

  const postIds = draftPosts.map(p => p.id);

  const { data: updated, error: updateError } = await supabase
    .from('blog_posts')
    .update({ status: 'published' })
    .in('id', postIds)
    .select('id, title');

  if (updateError) {
    console.error('❌ Error republishing:', updateError);
  } else {
    console.log(`✅ Successfully republished ${updated.length} posts`);
    console.log('\nSample republished posts:');
    updated.slice(0, 5).forEach(p => {
      console.log(`  - ${p.title}`);
    });
  }
}

// Final verification
console.log('\n\n📊 FINAL VERIFICATION\n');
console.log('=' .repeat(80));

const { data: allEnglish, error: verifyError } = await supabase
  .from('blog_posts')
  .select('id, status')
  .eq('language', 'en');

if (!verifyError) {
  const published = allEnglish.filter(p => p.status === 'published').length;
  const draft = allEnglish.filter(p => p.status === 'draft').length;

  console.log(`English posts:`);
  console.log(`  Published: ${published}`);
  console.log(`  Draft: ${draft}`);
  console.log(`  Total: ${allEnglish.length}`);

  if (published === corePostTitles.length) {
    console.log(`\n✅ Perfect! ${published} core English posts are now published`);
  } else {
    console.log(`\n⚠️  Note: Found ${published} published, expected ${corePostTitles.length}`);
  }
}

console.log('\n✅ Republishing complete!');
