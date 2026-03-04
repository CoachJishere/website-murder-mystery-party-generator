import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://mhfikaomkmqcndqfohbp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w"
);

// Comprehensive search with keyword variations for missing themes
const searchTerms = {
  // Pack 3 - Character/Event Types
  'Bachelorette': ['bachelorette', 'bachelorette party', 'bridal party', 'hen party', 'bride'],
  'Wedding': ['wedding', 'bridal', 'marriage', 'matrimony', 'nuptial'],
  'Anniversary': ['anniversary', 'anniversary party', 'celebration'],
  'Birthday': ['birthday', 'birthday party', 'birthday celebration'],
  'Corporate': ['corporate', 'business', 'company', 'office', 'workplace', 'team building'],
  'Team Building': ['team building', 'corporate team', 'office team', 'team bonding'],
  'Escape Room': ['escape room', 'escape', 'puzzle'],
  'Virtual': ['virtual', 'online', 'zoom', 'remote'],
  'Interactive': ['interactive', 'immersive', 'engaging'],
  'Family Reunion': ['family', 'reunion', 'family gathering', 'family party'],

  // Pack 4 - Professions/Venues
  'Architect': ['architect', 'architecture', 'building design'],
  'Scientist': ['scientist', 'science', 'laboratory', 'lab', 'research'],
  'Teacher': ['teacher', 'school', 'education', 'classroom'],
  'Nurse': ['nurse', 'medical', 'hospital', 'healthcare'],
  'Firefighter': ['firefighter', 'fire', 'fire station', 'firehouse'],
  'Police': ['police', 'cop', 'precinct', 'law enforcement'],
  'Librarian': ['librarian', 'library'],
  'Lighthouse': ['lighthouse', 'beacon'],
  'Winery': ['winery', 'wine', 'vineyard'],
  'Brewery': ['brewery', 'beer', 'distillery', 'pub'],
  'Ski Lodge': ['ski', 'ski lodge', 'ski resort', 'mountain', 'alpine'],
  'Country Club': ['country club', 'golf', 'club'],
  'Yacht': ['yacht', 'boat', 'cruise', 'sailing', 'nautical'],
  'Castle': ['castle', 'fortress', 'manor'],

  // Pack 5 - Historical/Locations
  'Ancient Rome': ['rome', 'roman', 'ancient rome', 'caesar'],
  'Ancient Greece': ['greece', 'greek', 'ancient greece', 'athens'],
  'Viking': ['viking', 'norse', 'scandinavian'],
  'Samurai': ['samurai', 'shogun', 'feudal japan'],
  'Colonial': ['colonial', 'colony', 'colonial america'],
  'Paris': ['paris', 'french', 'france'],
  'London': ['london', 'british', 'england'],
  'Tokyo': ['tokyo', 'japan', 'japanese'],
  'New York': ['new york', 'nyc', 'manhattan'],
  'Venice': ['venice', 'venetian', 'italy'],
  'Scotland': ['scotland', 'scottish', 'highland'],
  'Ireland': ['ireland', 'irish', 'dublin'],
  'Italy': ['italy', 'italian'],
  'Japan': ['japan', 'japanese'],
  'India': ['india', 'indian', 'bollywood'],
  'Morocco': ['morocco', 'moroccan', 'marrakech']
};

console.log('🔍 Comprehensive search for 45 missing themes...\n');

const foundPosts = new Map(); // slug -> {theme, title, slug}

for (const [theme, keywords] of Object.entries(searchTerms)) {
  for (const keyword of keywords) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, slug, title')
      .eq('language', 'en')
      .ilike('title', `%${keyword}%`)
      .limit(5);

    if (error) {
      console.error(`❌ Error searching "${keyword}":`, error.message);
    } else if (data && data.length > 0) {
      for (const post of data) {
        if (!foundPosts.has(post.slug)) {
          foundPosts.set(post.slug, { theme, title: post.title, slug: post.slug });
        }
      }
    }
  }
}

// Organize by theme
const byTheme = {};
for (const [slug, info] of foundPosts) {
  if (!byTheme[info.theme]) byTheme[info.theme] = [];
  byTheme[info.theme].push({ title: info.title, slug });
}

console.log('📊 Results by Theme:\n');
let totalFound = 0;
for (const [theme, posts] of Object.entries(byTheme)) {
  console.log(`\n🎯 ${theme} (${posts.length} posts found):`);
  posts.forEach(p => {
    console.log(`   ✓ ${p.title}`);
    console.log(`     ${p.slug}`);
  });
  totalFound += posts.length;
}

console.log(`\n\n🎉 Total unique posts found: ${totalFound}`);
console.log(`📝 Themes with posts: ${Object.keys(byTheme).length}/45\n`);
