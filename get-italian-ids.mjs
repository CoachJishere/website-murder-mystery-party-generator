import https from 'https';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const enSlugs = [
  '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable',
  '5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue',
  'how-to-fix-overly-complex-murder-mysteries',
  'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue',
  'how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement',
  'how-to-host-a-steampunk-murder-mystery-party-gear-up-for-victorian-sci-fi-crime',
  'unique-circus-murder-mystery-plot-ideas'
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
  console.log('Finding Italian post IDs by matching English slugs...\n');

  for (const slug of enSlugs) {
    // Get English post ID first
    const enUrl = `${SUPABASE_URL}?slug=eq.${slug}&language=eq.en&select=id,title`;
    const enResult = await makeRequest(enUrl);

    if (enResult && enResult[0]) {
      const baseId = enResult[0].id;
      console.log(`EN: ${enResult[0].title}`);
      console.log(`   Slug: ${slug}`);
      console.log(`   EN ID: ${baseId}`);

      // Try to find Italian version by looking for posts with similar title
      const itUrl = `${SUPABASE_URL}?language=eq.it&select=id,title,slug`;
      const itResults = await makeRequest(itUrl);

      // Find matching Italian post (same base slug pattern)
      const itMatch = itResults.find(post => {
        // Match by similar slug structure or title
        return post.slug && post.slug.includes(slug.split('-')[0]);
      });

      if (itMatch) {
        console.log(`   IT ID: ${itMatch.id}`);
        console.log(`   IT Title: ${itMatch.title}`);
        console.log(`   IT Slug: ${itMatch.slug}`);
      } else {
        console.log(`   IT ID: NOT FOUND`);
      }
      console.log('');
    }
  }
}

main().catch(console.error);
