import https from 'https';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co/rest/v1/blog_posts';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const postIds = [
  { id: '5bfb5637-07ec-4095-b775-da3b22981983', name: 'Beach Resort' },
  { id: '39b59ee6-1bfe-40df-88c0-2f0254b17526', name: 'Vintage Circus' },
  { id: '7bbcbd71-e2d7-4623-b2c2-4bdff9ad50e7', name: 'Fix Complex' },
  { id: '79ae2724-8141-4a5b-b92b-5fd5a8931bc2', name: 'Medieval Castle' },
  { id: '0741a884-52bb-4fc0-8975-9b5b95c1a07c', name: 'Prohibition Era' },
  { id: '8174f4a9-ead0-428a-9e7e-e1beb80610fc', name: 'Steampunk' },
  { id: '49868ec0-e076-4adf-a19e-87005be9bb83', name: 'Circus Plot Ideas' }
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
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function verifyPost(post, index) {
  try {
    const url = `${SUPABASE_URL}?id=eq.${post.id}&select=id,title,language,meta_description`;
    const result = await makeRequest(url);

    if (result && result[0]) {
      const data = result[0];
      const isItalian = data.title.match(/[àèéìòù]|Come|Temi|Giochi|per/);

      console.log(`[${index + 1}/7] ${post.name}`);
      console.log(`   ✓ Title: ${data.title.substring(0, 70)}...`);
      console.log(`   ✓ Language: ${data.language}`);
      console.log(`   ${isItalian ? '✅ ITALIAN CONTENT CONFIRMED' : '⚠️  WARNING: May still have English content'}`);
      console.log('');

      return isItalian;
    }
  } catch (error) {
    console.error(`   ❌ Error verifying ${post.name}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('Verifying Italian post updates...\n');

  let successCount = 0;
  for (let i = 0; i < postIds.length; i++) {
    const isItalian = await verifyPost(postIds[i], i);
    if (isItalian) successCount++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`VERIFICATION COMPLETE: ${successCount}/7 posts confirmed Italian`);
  console.log(`${'='.repeat(60)}\n`);

  if (successCount === 7) {
    console.log('✅ SUCCESS! All 7 Italian posts have been updated with Italian translations.');
  } else {
    console.log(`⚠️  WARNING: ${7 - successCount} posts may need review.`);
  }
}

main();
