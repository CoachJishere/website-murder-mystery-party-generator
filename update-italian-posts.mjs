import https from 'https';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const posts = [
  {
    idPrefix: '5bfb5637',
    enSlug: '5-beach-resort-murder-mystery-themes-that-will-make-your-vacation-unforgettable',
    name: 'Beach Resort'
  },
  {
    idPrefix: '39b59ee6',
    enSlug: '5-vintage-circus-murder-mystery-themes-step-into-the-big-top-of-intrigue',
    name: 'Vintage Circus'
  },
  {
    idPrefix: '7bbcbd71',
    enSlug: 'how-to-fix-overly-complex-murder-mysteries',
    name: 'Fix Complex Mysteries'
  },
  {
    idPrefix: '79ae2724',
    enSlug: 'how-to-host-a-medieval-castle-murder-mystery-rule-your-realm-with-royal-intrigue',
    name: 'Medieval Castle'
  },
  {
    idPrefix: '0741a884',
    enSlug: 'how-to-host-a-prohibition-era-murder-mystery-bootleg-your-way-to-excitement',
    name: 'Prohibition Era'
  },
  {
    idPrefix: '8174f4a9',
    enSlug: 'how-to-host-a-steampunk-murder-mystery-party-gear-up-for-victorian-sci-fi-crime',
    name: 'Steampunk'
  },
  {
    idPrefix: '49868ec0',
    enSlug: 'unique-circus-murder-mystery-plot-ideas',
    name: 'Circus Plot Ideas'
  }
];

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        ...options.headers
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
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function getFullId(idPrefix) {
  const url = `${SUPABASE_URL}?id=like.${idPrefix}*&language=eq.it&select=id`;
  const result = await makeRequest(url);
  return result[0]?.id;
}

async function getEnglishPost(slug) {
  const url = `${SUPABASE_URL}?slug=eq.${slug}&language=eq.en&select=*`;
  const result = await makeRequest(url);
  return result[0];
}

async function updateItalianPost(id, translation) {
  const url = `${SUPABASE_URL}?id=eq.${id}`;
  await makeRequest(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: translation
  });
}

// Translation function - you'll need to translate each post
async function translateToItalian(englishPost) {
  // This is a placeholder - each post needs manual translation
  // Return the Italian translation object
  return {
    title: 'TRANSLATION NEEDED',
    content: 'TRANSLATION NEEDED',
    meta_description: 'TRANSLATION NEEDED'
  };
}

async function processPost(post, index) {
  console.log(`\n[${index + 1}/7] Processing: ${post.name}`);

  try {
    // Step 1: Get full Italian post ID
    console.log(`  Getting Italian post ID for prefix: ${post.idPrefix}`);
    const italianId = await getFullId(post.idPrefix);
    if (!italianId) {
      console.error(`  ❌ Italian post not found`);
      return;
    }
    console.log(`  ✓ Found Italian ID: ${italianId}`);

    // Step 2: Fetch English source
    console.log(`  Fetching English source: ${post.enSlug}`);
    const englishPost = await getEnglishPost(post.enSlug);
    if (!englishPost) {
      console.error(`  ❌ English post not found`);
      return;
    }
    console.log(`  ✓ English post fetched (${englishPost.content.length} chars)`);

    // Step 3: Save English content for translation
    const fs = await import('fs');
    const filename = `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/it-post-${index + 1}-en.json`;
    fs.writeFileSync(filename, JSON.stringify({
      italianId,
      englishPost: {
        title: englishPost.title,
        content: englishPost.content,
        meta_description: englishPost.meta_description,
        slug: englishPost.slug
      }
    }, null, 2));
    console.log(`  ✓ English content saved to: it-post-${index + 1}-en.json`);

    return {
      italianId,
      englishPost,
      filename
    };

  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log('Starting Italian post update process...\n');
  console.log('Step 1: Fetching all English source posts\n');

  const results = [];
  for (let i = 0; i < posts.length; i++) {
    const result = await processPost(posts[i], i);
    if (result) {
      results.push(result);
    }
  }

  console.log(`\n✅ Fetched ${results.length}/7 posts`);
  console.log('\nNext steps:');
  console.log('1. Translate the content in each it-post-X-en.json file');
  console.log('2. Run the update script to apply translations');
}

main().catch(console.error);
