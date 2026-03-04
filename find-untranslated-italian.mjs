import https from 'https';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

// The English titles we're looking for in Italian posts
const englishTitles = [
  '5 Beach Resort Murder Mystery Themes',
  '5 Vintage Circus Murder Mystery Themes',
  'How to Fix Overly Complex Murder Mysteries',
  'Medieval Castle Murder Mystery',
  'Prohibition Era Murder Mystery',
  'Steampunk Murder Mystery',
  'Unique Circus Murder Mystery Plot Ideas'
];

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(data ? JSON.parse(data) : null);
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('Searching for Italian posts with English content...\n');

  // Get ALL Italian posts
  const itUrl = `${SUPABASE_URL}?language=eq.it&select=id,title,slug,meta_description`;
  const itPosts = await makeRequest(itUrl);

  console.log(`Found ${itPosts.length} total Italian posts\n`);

  // Find posts that have English titles or English-looking slugs
  const untranslated = itPosts.filter(post => {
    // Check if title contains common English words or matches our target titles
    const hasEnglishTitle =
      post.title.includes('Beach Resort') ||
      post.title.includes('Vintage Circus') ||
      post.title.includes('How to Fix') ||
      post.title.includes('Medieval Castle') ||
      post.title.includes('Prohibition Era') ||
      post.title.includes('Steampunk') ||
      post.title.includes('Circus Murder Mystery Plot');

    return hasEnglishTitle;
  });

  console.log(`Found ${untranslated.length} Italian posts with English content:\n`);

  untranslated.forEach((post, i) => {
    console.log(`${i + 1}. ID: ${post.id}`);
    console.log(`   Title: ${post.title}`);
    console.log(`   Slug: ${post.slug}`);
    console.log(`   Meta: ${post.meta_description?.substring(0, 60)}...`);
    console.log('');
  });

  // Save to file for reference
  const fs = await import('fs');
  fs.writeFileSync(
    '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/untranslated-italian-posts.json',
    JSON.stringify(untranslated, null, 2)
  );
  console.log('Saved to untranslated-italian-posts.json');
}

main().catch(console.error);
