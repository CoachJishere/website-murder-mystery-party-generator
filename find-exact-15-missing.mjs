import fs from 'fs';

const enList = JSON.parse(fs.readFileSync('en-posts-list.json', 'utf8'));
const svList = JSON.parse(fs.readFileSync('sv-posts-list.json', 'utf8'));

// Create detailed mapping based on actual Swedish titles
const existing = {
  'cruise-ship': 'Kryssningsfartyg',
  'haunted-hotel': 'Spökhotell',
  'butler': 'Butler Mordmysterium',
  'graduation': 'Examensfiranden',
  'film-noir': 'Film Noir',
  'medieval-plot': 'Unika Medeltida',
  'detective-character': 'Detektiv-Karaktären',
  'beach-resort': 'strandresort',
  'casino': 'casino',
  'haunted-mansion': 'spökgårds',
  'mountain-lodge': 'fjällstuga',
  'renaissance': 'renässans',
  'spy-thriller': 'spionthrillers',
  'vintage-circus': 'vintagecirkus',
  'ancient-egypt': 'forntida Egyptens',
  'art-gallery': 'konstgalleri',
  'bookstore': 'bokhandels',
  'chef': 'Köksmästare',
  'fairy-tale': 'Sagotema',
  'hollywood': 'Hollywood',
  'medieval-castle': 'Medeltida Mordmysteriefest',
  'prohibition': 'Förbudstids',
  'steampunk': 'Steampunk',
  'jazz-club': 'Jazz Klubb',
  'journalist': 'Journalist',
  'lawyer': 'Advokat',
  'medical-examiner': 'Rättsläkare',
  'birthday': 'Födelsedagsfiranden',
  'corporate': 'Företagsevenemang',
  'date-night': 'Dejtkväll',
  'spa-resort': 'Spa-anläggning',
  'archaeological': 'Arkeologisk',
  'circus-plot': 'Unika Cirkus',
  'pirate': 'Pirat',
  'school-reunion': 'Skolåterträff',
  'space-colony': 'Rymdkoloni',
  'train-station': 'Tågstations',
  'underwater': 'Undervattens',
  'villain': 'Skurk',
  'wild-west': 'Vilda Västern',
  'small-groups': 'Små Grupper',
  'teenagers': 'Tonåringar',
  'holiday-gatherings': 'Högtidssammankomster',
  'socialite': 'Societetsmordmysterier',
  'breaking-character': 'bryter karaktären',
  'office-teams': 'Kontorsteam'
};

// Find missing
const missing = [];

enList.forEach(en => {
  const slug = en.slug;
  const title = en.title;
  
  // Check if this post has a Swedish translation
  let hasSwedish = false;
  
  for (const [key, svPattern] of Object.entries(existing)) {
    if (slug.includes(key)) {
      hasSwedish = svList.some(sv => sv.title.includes(svPattern));
      if (hasSwedish) break;
    }
  }
  
  if (!hasSwedish) {
    missing.push(en);
  }
});

console.log('Missing Swedish translations:', missing.length);
console.log('\nMissing posts:\n');
missing.forEach((post, i) => {
  console.log(`${i + 1}. ${post.title}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   ID: ${post.id}\n`);
});

// Save
fs.writeFileSync('sv-missing-posts-final.json', JSON.stringify(missing, null, 2));
console.log('✓ Saved to sv-missing-posts-final.json');

