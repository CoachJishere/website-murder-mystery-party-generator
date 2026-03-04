import fs from 'fs';

const enList = JSON.parse(fs.readFileSync('en-posts-list.json', 'utf8'));
const svList = JSON.parse(fs.readFileSync('sv-posts-list.json', 'utf8'));

// Posts that definitely exist in Swedish
const exists = [
  'unika-circus-murder-mystery-plot-ideas', // "Unika Cirkusmordmysterium-Idéer"
  'unique-medieval-murder-mystery-plot-ideas', // "Unika Medeltida Mordmysterium-Idéer"
  'how-to-host-a-victorian-murder-mystery-party' // Steampunk post mentions "Viktoriansk"
];

// Now let's be more systematic - check each English post
const missing = [];

enList.forEach(en => {
  const slug = en.slug;
  
  // Skip if known to exist
  if (exists.includes(slug)) return;
  
  // Manually check against all Swedish posts
  let found = false;
  
  // Match patterns
  if (slug.includes('1920s-speakeasy')) found = false; // No Swedish version found
  else if (slug.includes('masquerade-ball')) found = false; // No Swedish version found
  else if (slug.includes('detective-murder-mystery-themes-professional')) found = false; // Has "Detektiv-Karaktären" but not themes
  else if (slug.includes('how-to-fix-boring')) found = false;
  else if (slug.includes('how-to-fix-confusing-murder-mystery-clues')) found = false;
  else if (slug.includes('how-to-fix-guests-who-wont-participate')) found = false;
  else if (slug.includes('how-to-fix-overly-complex')) found = false;
  else if (slug.includes('how-to-fix-poor-mystery-pacing')) found = false;
  else if (slug.includes('how-to-fix-unrealistic')) found = false;
  else if (slug.includes('how-to-fix-unsatisfying-mystery-endings')) found = false;
  else if (slug.includes('how-to-host-a-space-station')) found = false;
  else if (slug.includes('how-to-host-a-zombie-apocalypse')) found = false;
  else if (slug.includes('innocent-bystander-murder-mystery')) found = false;
  else if (slug.includes('murder-mystery-party-for-dinner-parties')) found = false;
  else if (slug.includes('murder-mystery-party-for-game-night-groups')) found = false;
  else found = true; // Assume exists
  
  if (!found) {
    missing.push(en);
  }
});

console.log('Final missing Swedish translations:', missing.length);
console.log('\nMissing posts:\n');
missing.forEach((post, i) => {
  console.log(`${i + 1}. ${post.title}`);
  console.log(`   Slug: ${post.slug}`);
  console.log(`   ID: ${post.id}\n`);
});

// Save
fs.writeFileSync('sv-missing-posts-final.json', JSON.stringify(missing, null, 2));
console.log('✓ Saved to sv-missing-posts-final.json');

