import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w';

const supabase = createClient(supabaseUrl, supabaseKey);

// Get all English posts
const { data: enPosts, error: enError } = await supabase
  .from('blog_posts')
  .select('id, slug, title, language, content')
  .eq('language', 'en')
  .eq('status', 'published')
  .order('created_at', { ascending: true });

if (enError) {
  console.error('Error fetching English posts:', enError);
  process.exit(1);
}

console.log('English posts:', enPosts.length);

// Get all Swedish posts
const { data: svPosts, error: svError } = await supabase
  .from('blog_posts')
  .select('slug, title')
  .eq('language', 'sv')
  .eq('status', 'published');

if (svError) {
  console.error('Error fetching Swedish posts:', svError);
  process.exit(1);
}

console.log('Swedish posts:', svPosts.length);

// Create keyword extraction function
function extractKeywords(slug) {
  return slug
    .replace(/-/g, ' ')
    .split(' ')
    .filter(word => 
      word.length > 3 && 
      !['how', 'host', 'that', 'will', 'have', 'your', 'the', 'for', 'and', 'with', 'into', 'this', 'make', 'guide', 'party', 'ideas', 'themes', 'plots'].includes(word)
    );
}

// Create a set of keyword combinations from Swedish titles/slugs
const svKeywordSets = svPosts.map(p => {
  const combinedText = (p.title + ' ' + p.slug).toLowerCase();
  return new Set(
    combinedText
      .replace(/[åä]/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/[^a-z0-9 ]/g, '')
      .split(' ')
      .filter(w => w.length > 3)
  );
});

// Find missing posts by keyword matching
const missing = [];
enPosts.forEach(enPost => {
  const enKeywords = extractKeywords(enPost.slug);
  
  // Check if any Swedish post has matching keywords
  const hasMatch = svKeywordSets.some(svSet => {
    const matchCount = enKeywords.filter(kw => {
      // Direct match or Swedish translation
      if (svSet.has(kw)) return true;
      
      // Common translations
      const translations = {
        'victorian': 'viktoriansk',
        'speakeasy': 'smugglar',
        'small': 'sma',
        'medieval': 'medeltida',
        'boring': 'tradiga',
        'haunted': 'spoklik',
        'mansion': 'herrgard',
        'hollywood': 'hollywood',
        'villain': 'skurk',
        'west': 'vastern',
        'teenagers': 'tonaring',
        'pirate': 'pirat',
        'confusing': 'forvirrande',
        'renaissance': 'renanssans',
        'space': 'rymd',
        'station': 'station',
        'innocent': 'oskyldig',
        'bystander': 'askadare',
        'egypt': 'egypten',
        'corporate': 'foretag',
        'circus': 'cirkus',
        'complex': 'komplexa',
        'masquerade': 'maskerad',
        'zombie': 'zombie',
        'medical': 'medicinsk',
        'examiner': 'granskare',
        'gallery': 'galleri',
        'birthday': 'fodelsedag',
        'underwater': 'undervattens',
        'breaking': 'bryter',
        'character': 'karakter',
        'thriller': 'thriller',
        'fairy': 'saga',
        'tale': 'saga',
        'lawyer': 'advokat',
        'cruise': 'kryssning',
        'ship': 'fartyg',
        'date': 'dejt',
        'night': 'kvall',
        'school': 'skol',
        'reunion': 'atertraff',
        'unsatisfying': 'otillfredstal',
        'endings': 'avslutningar',
        'casino': 'kasino',
        'steampunk': 'steampunk',
        'butler': 'butler',
        'jazz': 'jazz',
        'club': 'klubb',
        'holiday': 'helg',
        'gatherings': 'samlingar',
        'archaeological': 'arkeologisk',
        'guests': 'gaster',
        'participate': 'delta',
        'mountain': 'berg',
        'lodge': 'stuga',
        'superhero': 'superhjal',
        'journalist': 'journalist',
        'hotel': 'hotell',
        'office': 'kontor',
        'teams': 'team',
        'train': 'tag',
        'pacing': 'tempo',
        'beach': 'strand',
        'resort': 'resort',
        'prohibition': 'forbudstiden',
        'socialite': 'societetsdam',
        'bookstore': 'bokhandel',
        'dinner': 'middag',
        'colony': 'koloni',
        'unrealistic': 'orealistiska',
        'vintage': 'vintage',
        'castle': 'slott',
        'chef': 'kock',
        'noir': 'noir',
        'detective': 'detektiv'
      };
      
      const translated = translations[kw];
      if (translated && svSet.has(translated)) return true;
      
      return false;
    }).length;
    
    // Need at least 2 keyword matches for confidence
    return matchCount >= 2;
  });
  
  if (!hasMatch) {
    missing.push(enPost);
  }
});

console.log('\nMissing Swedish translations:', missing.length);
console.log('\nMissing posts:');
missing.forEach((post, i) => {
  console.log(`${i + 1}. ${post.slug}`);
});

// Save to file
const fs = await import('fs');
fs.writeFileSync('sv-missing-posts.json', JSON.stringify(missing, null, 2));
console.log('\n✓ Saved to sv-missing-posts.json');
