import https from 'https';
import fs from 'fs';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const posts = [
  {
    id: '5bfb5637-07ec-4095-b775-da3b22981983',
    enSlug: '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable',
    name: 'Beach Resort'
  },
  {
    id: '39b59ee6-1bfe-40df-88c0-2f0254b17526',
    enSlug: '5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue',
    name: 'Vintage Circus'
  },
  {
    id: '7bbcbd71-e2d7-4623-b2c2-4bdff9ad50e7',
    enSlug: 'how-to-fix-overly-complex-murder-mysteries',
    name: 'Fix Complex'
  },
  {
    id: '79ae2724-8141-4a5b-b92b-5fd5a8931bc2',
    enSlug: 'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue',
    name: 'Medieval'
  },
  {
    id: '0741a884-52bb-4fc0-8975-9b5b95c1a07c',
    enSlug: 'how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement',
    name: 'Prohibition'
  },
  {
    id: '8174f4a9-ead0-428a-9e7e-e1beb80610fc',
    enSlug: 'how-to-host-a-steampunk-murder-mystery-party-gear-up-for-victorian-sci-fi-crime',
    name: 'Steampunk'
  },
  {
    id: '49868ec0-e076-4adf-a19e-87005be9bb83',
    enSlug: 'unique-circus-murder-mystery-plot-ideas',
    name: 'Circus Plots'
  }
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
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : null);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function fetchEnglishPost(slug) {
  const url = `${SUPABASE_URL}?slug=eq.${slug}&language=eq.en&select=*`;
  const result = await makeRequest(url);
  return result && result[0];
}

async function main() {
  console.log('Fetching English source posts for translation...\n');

  const results = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`[${i + 1}/7] Fetching: ${post.name}`);

    try {
      const enPost = await fetchEnglishPost(post.enSlug);

      if (!enPost) {
        console.log(`  ❌ Not found: ${post.enSlug}\n`);
        continue;
      }

      console.log(`  ✓ Found: ${enPost.title}`);
      console.log(`  Content: ${enPost.content.length} chars`);

      const data = {
        italianId: post.id,
        italianName: post.name,
        english: {
          title: enPost.title,
          content: enPost.content,
          meta_description: enPost.meta_description,
          slug: enPost.slug
        }
      };

      results.push(data);

      // Save individual file
      const filename = `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/to-translate-it-${i + 1}.json`;
      fs.writeFileSync(filename, JSON.stringify(data, null, 2));
      console.log(`  ✓ Saved to: to-translate-it-${i + 1}.json\n`);

    } catch (error) {
      console.error(`  ❌ Error: ${error.message}\n`);
    }
  }

  console.log(`\n✅ Fetched ${results.length}/7 English source posts`);
  console.log('\nNext: Translate each to-translate-it-X.json file to Italian');
}

main().catch(console.error);
