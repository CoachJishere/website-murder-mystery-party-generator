import https from 'https';

const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzYxNzkxMiwiZXhwIjoyMDU5MTkzOTEyfQ.DMyPlyn0d5RvluhrG8zrjzThCaJGlw9DrJ74GliDql8';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// Helper function for HTTP requests
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: method,
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
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Extract topic keywords from English slug
function extractTopicKeywords(slug) {
  // Remove common prefixes/suffixes and get core topic words
  const cleaned = slug
    .replace(/^how-to-/, '')
    .replace(/^guide-/, '')
    .replace(/-murder-mystery.*$/, '')
    .replace(/-party.*$/, '')
    .replace(/-guide.*$/, '');
  
  // Return array of significant words
  return cleaned.split('-').filter(w => w.length > 3);
}

// Check if French slug matches English topic
function matchesTopic(frSlug, enTopicKeywords) {
  const frLower = frSlug.toLowerCase();
  // Match if at least 2 topic keywords appear in French slug
  const matches = enTopicKeywords.filter(keyword => frLower.includes(keyword));
  return matches.length >= Math.min(2, enTopicKeywords.length);
}

async function main() {
  console.log('=== DUPLICATE DRAFT BLOG POST CLEANUP ===\n');
  
  // Step 1: Fetch all English posts (published)
  console.log('📥 Fetching English posts (published)...');
  const enUrl = `${SUPABASE_URL}/rest/v1/blog_posts?language=eq.en&status=eq.published&select=id,slug,title,created_at,updated_at&order=created_at.asc`;
  const englishPosts = await makeRequest(enUrl);
  console.log(`✅ Found ${englishPosts.length} English posts\n`);
  
  // Step 2: Fetch all French posts (draft)
  console.log('📥 Fetching French posts (draft)...');
  const frUrl = `${SUPABASE_URL}/rest/v1/blog_posts?language=eq.fr&status=eq.draft&select=id,slug,title,created_at,updated_at&order=created_at.asc`;
  const frenchPosts = await makeRequest(frUrl);
  console.log(`✅ Found ${frenchPosts.length} French draft posts\n`);
  
  // Step 3: Fetch all Korean posts (draft)
  console.log('📥 Fetching Korean posts (draft)...');
  const koUrl = `${SUPABASE_URL}/rest/v1/blog_posts?language=eq.ko&status=eq.draft&select=id,slug,title,created_at,updated_at&order=created_at.asc`;
  const koreanPosts = await makeRequest(koUrl);
  console.log(`✅ Found ${koreanPosts.length} Korean draft posts\n`);
  
  // ============ FRENCH ANALYSIS ============
  console.log('=== FRENCH POSTS ANALYSIS ===\n');
  
  // Create mapping of English slugs to topic keywords
  const enTopicMap = new Map();
  englishPosts.forEach(post => {
    enTopicMap.set(post.slug, {
      id: post.id,
      keywords: extractTopicKeywords(post.slug),
      slug: post.slug
    });
  });
  
  // Map French posts to English originals
  const frToEnMap = new Map(); // enSlug -> array of FR posts
  const unmatchedFr = [];
  
  frenchPosts.forEach(frPost => {
    let matched = false;
    for (const [enSlug, enData] of enTopicMap.entries()) {
      if (matchesTopic(frPost.slug, enData.keywords)) {
        if (!frToEnMap.has(enSlug)) {
          frToEnMap.set(enSlug, []);
        }
        frToEnMap.get(enSlug).push(frPost);
        matched = true;
        break;
      }
    }
    if (!matched) {
      unmatchedFr.push(frPost);
    }
  });
  
  // Find duplicates (multiple FR posts for same EN post)
  const frDuplicates = [];
  const frToDelete = [];
  
  for (const [enSlug, frPosts] of frToEnMap.entries()) {
    if (frPosts.length > 1) {
      // Sort by created_at descending (newest first)
      frPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const keep = frPosts[0];
      const deletes = frPosts.slice(1);
      
      frDuplicates.push({
        enSlug,
        keep,
        delete: deletes
      });
      
      frToDelete.push(...deletes);
    }
  }
  
  console.log(`📊 French mapping results:`);
  console.log(`  - Matched to EN posts: ${frToEnMap.size} topics`);
  console.log(`  - Duplicates found: ${frDuplicates.length} topics with multiple FR posts`);
  console.log(`  - Unmatched FR posts: ${unmatchedFr.length}\n`);
  
  if (frDuplicates.length > 0) {
    console.log('🔍 French Duplicates:');
    frDuplicates.forEach(({ enSlug, keep, delete: dels }) => {
      console.log(`  EN: ${enSlug}`);
      console.log(`    ✅ KEEP: ${keep.slug} (ID: ${keep.id}, created: ${keep.created_at})`);
      dels.forEach(d => {
        console.log(`    ❌ DELETE: ${d.slug} (ID: ${d.id}, created: ${d.created_at})`);
      });
    });
    console.log();
  }
  
  if (unmatchedFr.length > 0) {
    console.log('🔍 Unmatched French posts (will keep - might be valid):');
    unmatchedFr.forEach(post => {
      console.log(`  ⚠️  ${post.slug} (ID: ${post.id})`);
    });
    console.log();
  }
  
  // ============ KOREAN ANALYSIS ============
  console.log('=== KOREAN POSTS ANALYSIS ===\n');
  
  // Create set of valid English slugs
  const validEnSlugs = new Set(englishPosts.map(p => p.slug));
  
  // Map Korean posts
  const koByEnSlug = new Map(); // enSlug -> array of KO posts
  const unmatchedKo = [];
  
  koreanPosts.forEach(koPost => {
    if (koPost.slug.startsWith('ko-')) {
      const enSlug = koPost.slug.substring(3); // Remove 'ko-' prefix
      
      if (validEnSlugs.has(enSlug)) {
        if (!koByEnSlug.has(enSlug)) {
          koByEnSlug.set(enSlug, []);
        }
        koByEnSlug.get(enSlug).push(koPost);
      } else {
        unmatchedKo.push(koPost);
      }
    } else {
      unmatchedKo.push(koPost);
    }
  });
  
  // Find duplicates
  const koDuplicates = [];
  const koToDelete = [];
  
  for (const [enSlug, koPosts] of koByEnSlug.entries()) {
    if (koPosts.length > 1) {
      // Sort by created_at descending (newest first)
      koPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const keep = koPosts[0];
      const deletes = koPosts.slice(1);
      
      koDuplicates.push({
        enSlug,
        keep,
        delete: deletes
      });
      
      koToDelete.push(...deletes);
    }
  }
  
  // Add unmatched to delete list
  koToDelete.push(...unmatchedKo);
  
  console.log(`📊 Korean mapping results:`);
  console.log(`  - Matched to EN posts: ${koByEnSlug.size} topics`);
  console.log(`  - Duplicates found: ${koDuplicates.length} topics with multiple KO posts`);
  console.log(`  - Unmatched KO posts: ${unmatchedKo.length}\n`);
  
  if (koDuplicates.length > 0) {
    console.log('🔍 Korean Duplicates:');
    koDuplicates.forEach(({ enSlug, keep, delete: dels }) => {
      console.log(`  EN: ${enSlug}`);
      console.log(`    ✅ KEEP: ${keep.slug} (ID: ${keep.id}, created: ${keep.created_at})`);
      dels.forEach(d => {
        console.log(`    ❌ DELETE: ${d.slug} (ID: ${d.id}, created: ${d.created_at})`);
      });
    });
    console.log();
  }
  
  if (unmatchedKo.length > 0) {
    console.log('🔍 Unmatched Korean posts (junk):');
    unmatchedKo.forEach(post => {
      console.log(`  ❌ DELETE: ${post.slug} (ID: ${post.id})`);
    });
    console.log();
  }
  
  // ============ DELETION SUMMARY ============
  console.log('=== DELETION SUMMARY ===\n');
  console.log(`French posts to delete: ${frToDelete.length}`);
  console.log(`Korean posts to delete: ${koToDelete.length}`);
  console.log(`Total deletions: ${frToDelete.length + koToDelete.length}\n`);
  
  // Expected final counts
  const expectedFrFinal = frenchPosts.length - frToDelete.length;
  const expectedKoFinal = koreanPosts.length - koToDelete.length;
  console.log(`Expected final counts:`);
  console.log(`  French: ${frenchPosts.length} - ${frToDelete.length} = ${expectedFrFinal} (target: 61)`);
  console.log(`  Korean: ${koreanPosts.length} - ${koToDelete.length} = ${expectedKoFinal} (target: 61)\n`);
  
  // ============ EXECUTE DELETIONS ============
  console.log('=== EXECUTING DELETIONS ===\n');
  
  let deletedCount = 0;
  const allToDelete = [...frToDelete, ...koToDelete];
  
  for (const post of allToDelete) {
    try {
      const deleteUrl = `${SUPABASE_URL}/rest/v1/blog_posts?id=eq.${post.id}`;
      await makeRequest(deleteUrl, 'DELETE');
      deletedCount++;
      console.log(`✅ Deleted: ${post.slug} (ID: ${post.id})`);
    } catch (error) {
      console.error(`❌ Failed to delete ${post.slug} (ID: ${post.id}):`, error.message);
    }
  }
  
  console.log(`\n✅ Deletion complete: ${deletedCount} posts deleted\n`);
  
  // ============ VERIFY FINAL COUNTS ============
  console.log('=== VERIFYING FINAL COUNTS ===\n');
  
  const frFinal = await makeRequest(`${SUPABASE_URL}/rest/v1/blog_posts?language=eq.fr&status=eq.draft&select=id`);
  const koFinal = await makeRequest(`${SUPABASE_URL}/rest/v1/blog_posts?language=eq.ko&status=eq.draft&select=id`);
  
  console.log(`Final draft counts:`);
  console.log(`  French: ${frFinal.length} (target: 61) ${frFinal.length === 61 ? '✅' : '❌'}`);
  console.log(`  Korean: ${koFinal.length} (target: 61) ${koFinal.length === 61 ? '✅' : '❌'}`);
  console.log(`  English: ${englishPosts.length}`);
  
  if (frFinal.length === 61 && koFinal.length === 61) {
    console.log('\n🎉 SUCCESS! All languages now have 61 posts.\n');
  } else {
    console.log('\n⚠️  WARNING: Final counts do not match target (61 posts).\n');
  }
}

main().catch(console.error);
