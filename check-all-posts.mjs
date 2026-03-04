import https from 'https';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: headers
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body ? JSON.parse(body) : null);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('=== COMPLETE BLOG POST STATUS ===\n');
  
  const allUrl = `${SUPABASE_URL}/rest/v1/blog_posts?select=id,language,status,slug&order=language.asc,status.asc`;
  const allPosts = await makeRequest(allUrl);
  
  const byLang = {};
  allPosts.forEach(post => {
    if (!byLang[post.language]) {
      byLang[post.language] = { published: 0, draft: 0, archived: 0, total: 0 };
    }
    byLang[post.language][post.status]++;
    byLang[post.language].total++;
  });
  
  console.log('Language Counts:');
  console.log('================');
  Object.keys(byLang).sort().forEach(lang => {
    const stats = byLang[lang];
    console.log(`\n${lang.toUpperCase()}:`);
    console.log(`  Published: ${stats.published}`);
    console.log(`  Draft: ${stats.draft}`);
    console.log(`  Archived: ${stats.archived}`);
    console.log(`  TOTAL: ${stats.total}`);
  });
  
  console.log('\n\n=== SUMMARY ===');
  console.log(`Total posts in database: ${allPosts.length}`);
  console.log(`\nFrench (FR): ${byLang.fr ? byLang.fr.total : 0} total (${byLang.fr ? byLang.fr.published : 0} published, ${byLang.fr ? byLang.fr.draft : 0} draft)`);
  console.log(`Korean (KO): ${byLang.ko ? byLang.ko.total : 0} total (${byLang.ko ? byLang.ko.published : 0} published, ${byLang.ko ? byLang.ko.draft : 0} draft)`);
  console.log(`English (EN): ${byLang.en ? byLang.en.total : 0} total (${byLang.en ? byLang.en.published : 0} published, ${byLang.en ? byLang.en.draft : 0} draft)`);
}

main().catch(console.error);
