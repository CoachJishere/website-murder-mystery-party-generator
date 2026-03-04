import fs from 'fs';

// Load the audit data
const auditData = JSON.parse(fs.readFileSync('translation-audit-full.json', 'utf8'));
const enList = JSON.parse(fs.readFileSync('en-posts-list.json', 'utf8'));
const svList = JSON.parse(fs.readFileSync('sv-posts-list.json', 'utf8'));

// Create title mappings (manual for key posts)
const titleMap = {
  // Known English -> Swedish title patterns
  'Wild West': 'Vilda Västern',
  'Villain': 'Skurk',
  'Underwater': 'Undervattens',
  'Train Station': 'Tågstation',
  'Space Colony': 'Rymdkoloni',
  'School Reunion': 'Skolåterträff',
  'Pirate': 'Pirat',
  'Film Noir': 'Film Noir',
  'Circus': 'Cirkus',
  'Victorian': 'Viktoriansk',
  'Speakeasy': 'Smugglar',
  'Medieval': 'Medeltida',
  'Haunted Mansion': 'Spökhus',
  'Hollywood': 'Hollywood',
  'Teenagers': 'Tonåringar',
  'Renaissance': 'Renässans',
  'Space Station': 'Rymdstation',
  'Innocent Bystander': 'Oskyldig',
  'Ancient Egypt': 'Forntida Egypten',
  'Corporate': 'Företag',
  'Masquerade': 'Maskerad',
  'Zombie': 'Zombie',
  'Medical Examiner': 'Medicinsk Granskare',
  'Art Gallery': 'Konstgalleri',
  'Birthday': 'Födelsedag',
  'Breaking Character': 'Bryta Karaktär',
  'Spy Thriller': 'Spionthriller',
  'Fairy Tale': 'Saga',
  'Lawyer': 'Advokat',
  'Cruise Ship': 'Kryssningsfartyg',
  'Date Night': 'Dejt',
  'Unsatisfying Endings': 'Otillfredsställande Avslutningar',
  'Casino': 'Kasino',
  'Steampunk': 'Steampunk',
  'Butler': 'Butler',
  'Jazz Club': 'Jazz',
  'Holiday': 'Helg',
  'Archaeological': 'Arkeologisk',
  'Mountain Lodge': 'Bergstuga',
  'Superhero': 'Superhjälte',
  'Journalist': 'Journalist',
  'Haunted Hotel': 'Spökhotell',
  'Office Teams': 'Kontorsteam',
  'Poor Pacing': 'Dåligt Tempo',
  'Beach Resort': 'Strandresort',
  'Prohibition': 'Förbudstiden',
  'Socialite': 'Societetsdam',
  'Bookstore': 'Bokhandel',
  'Dinner Parties': 'Middagsfester',
  'Unrealistic': 'Orealistiska',
  'Vintage Circus': 'Vintage Cirkus',
  'Medieval Castle': 'Medeltida Slott',
  'Chef': 'Kock',
  'Spa Resort': 'Spa',
  'Game Night': 'Spelkväll',
  'Detective': 'Detektiv',
  'Small Groups': 'Små Grupper',
  'Boring': 'Tråkiga',
  'Confusing Clues': 'Förvirrande Ledtrådar',
  'Overly Complex': 'Alltför Komplexa',
  'Guests Who Won\'t Participate': 'Gäster Som Inte Vill Delta'
};

// Check each English post
const missing = [];

enList.forEach(enPost => {
  const enTitle = enPost.title;
  
  // Look for Swedish post with matching theme
  const hasSwedish = svList.some(svPost => {
    // Try to match key theme words
    for (const [enKey, svKey] of Object.entries(titleMap)) {
      if (enTitle.includes(enKey) && svPost.title.includes(svKey)) {
        return true;
      }
    }
    return false;
  });
  
  if (!hasSwedish) {
    missing.push(enPost);
  }
});

console.log('Missing Swedish translations:', missing.length);
console.log('\nMissing posts:');
missing.forEach((post, i) => {
  console.log(`${i + 1}. ${post.title}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   ID: ${post.id}\n`);
});

// Save
fs.writeFileSync('sv-missing-posts.json', JSON.stringify(missing, null, 2));
console.log('✓ Saved to sv-missing-posts.json');

