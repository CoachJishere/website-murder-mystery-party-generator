import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mhfikaomkmqcndqfohbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8'
);

console.log('🔍 Checking Status of Your 61-Post List\n');
console.log('='.repeat(80));

const yourList = [
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

console.log(`Total posts in your list: ${yourList.length}\n`);

const statusReport = {
  published: [],
  draft: [],
  missing: []
};

for (const title of yourList) {
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, status, updated_at')
    .eq('language', 'en')
    .ilike('title', title);

  if (!posts || posts.length === 0) {
    statusReport.missing.push(title);
  } else {
    const post = posts[0];
    if (post.status === 'published') {
      const updateDate = new Date(post.updated_at);
      const isOptimized = updateDate >= new Date('2026-02-15');
      statusReport.published.push({ title: post.title, optimized: isOptimized });
    } else {
      statusReport.draft.push(post.title);
    }
  }
}

console.log('📊 STATUS BREAKDOWN:\n');
console.log(`✅ Published: ${statusReport.published.length}`);
console.log(`📝 Draft: ${statusReport.draft.length}`);
console.log(`❌ Missing: ${statusReport.missing.length}\n`);

console.log('='.repeat(80));

if (statusReport.published.length > 0) {
  const optimized = statusReport.published.filter(p => p.optimized).length;
  const notOptimized = statusReport.published.filter(p => !p.optimized).length;

  console.log(`\n✅ PUBLISHED (${statusReport.published.length} posts):`);
  console.log(`   - Optimized (updated Feb 2026): ${optimized}`);
  console.log(`   - Not optimized: ${notOptimized}\n`);
}

if (statusReport.draft.length > 0) {
  console.log(`\n📝 DRAFT (${statusReport.draft.length} posts - NOT currently live):`);
  statusReport.draft.forEach((title, i) => {
    console.log(`   ${i + 1}. ${title.substring(0, 70)}...`);
  });
}

if (statusReport.missing.length > 0) {
  console.log(`\n❌ MISSING (${statusReport.missing.length} posts - not in database):`);
  statusReport.missing.forEach((title, i) => {
    console.log(`   ${i + 1}. ${title}`);
  });
}

console.log('\n' + '='.repeat(80));
console.log('\n💡 SUMMARY:\n');
console.log(`• ${statusReport.published.length}/61 posts are LIVE on the site`);
console.log(`• ${statusReport.published.filter(p => p.optimized).length}/61 have been optimized (updated Feb 2026)`);
console.log(`• ${statusReport.draft.length}/61 exist but are in DRAFT (not live)`);
console.log(`• ${statusReport.missing.length}/61 don't exist in the database`);

if (statusReport.draft.length > 0 || statusReport.missing.length > 0) {
  console.log(`\n⚠️  Note: ${statusReport.draft.length + statusReport.missing.length} posts from your list are NOT live.`);
  console.log('These might be part of your separate optimization work or need to be created.');
}
