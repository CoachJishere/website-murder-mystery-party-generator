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
  console.log('=== BLOG POST COUNTS BY LANGUAGE AND STATUS ===\n');
  
  // Get all posts grouped by language and status
  const allUrl = `${SUPABASE_URL}/rest/v1/blog_posts?select=id,language,status,slug,created_at&order=language.asc,status.asc,created_at.desc`;
  const allPosts = await makeRequest(allUrl);
  
  // Group by language and status
  const groups = {};
  allPosts.forEach(post => {
    const key = `${post.language}:${post.status}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(post);
  });
  
  // Display results
  const languages = ['en', 'fr', 'ko', 'es', 'de', 'it', 'pt', 'nl', 'sv', 'da', 'fi', 'ja', 'zh-cn'];
  const statuses = ['published', 'draft', 'archived'];
  
  for (const lang of languages) {
    let langTotal = 0;
    console.log(`\n${lang.toUpperCase()}:`);
    for (const status of statuses) {
      const key = `${lang}:${status}`;
      const count = groups[key] ? groups[key].length : 0;
      langTotal += count;
      if (count > 0) {
        console.log(`  ${status}: ${count}`);
      }
    }
    console.log(`  TOTAL: ${langTotal}`);
  }
  
  // Show FR and KO details
  console.log('\n\n=== FRENCH (FR) POSTS ===');
  const frPosts = allPosts.filter(p => p.language === 'fr');
  console.log(`Total: ${frPosts.length}\n`);
  frPosts.forEach((post, i) => {
    console.log(`${i + 1}. [${post.status}] ${post.slug}`);
  });
  
  console.log('\n\n=== KOREAN (KO) POSTS ===');
  const koPosts = allPosts.filter(p => p.language === 'ko');
  console.log(`Total: ${koPosts.length}\n`);
  koPosts.forEach((post, i) => {
    console.log(`${i + 1}. [${post.status}] ${post.slug}`);
  });
}

main().catch(console.error);
