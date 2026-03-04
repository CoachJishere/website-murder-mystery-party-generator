import fs from 'fs';

const audit = JSON.parse(fs.readFileSync('./translation-audit-full.json', 'utf8'));

const allMasterIds = audit.master.posts.map(p => p.id);
const zhcnIds = audit.languages['zh-cn'].posts.map(p => p.id);

// Find missing by checking if any master post ID exists in zhcn posts
// Since zhcn posts have their own IDs, we need to match by slug pattern
const zhcnSlugs = audit.languages['zh-cn'].posts.map(p => p.slug);

// For each master post, check if there's a corresponding zh-cn post
const missing = [];

for (const masterPost of audit.master.posts) {
  // Check if this masterPost.id appears in zhcn posts
  // Or if the slug has a zh-cn variant
  const hasZhcn = zhcnIds.includes(masterPost.id) ||
                  zhcnSlugs.some(slug =>
                    slug.includes(masterPost.slug) ||
                    slug.endsWith('-zh-cn') && slug.startsWith(masterPost.slug)
                  );

  if (!hasZhcn) {
    missing.push(masterPost);
  }
}

console.log(`Total master posts: ${allMasterIds.length}`);
console.log(`ZH-CN posts: ${zhcnIds.length}`);
console.log(`Missing: ${missing.length}`);

fs.writeFileSync('zh-cn-12-missing.json', JSON.stringify(missing, null, 2));
console.log('\\nSaved to zh-cn-12-missing.json');
console.log('\\nFirst 5 missing posts:');
missing.slice(0, 5).forEach(p => console.log(`- ${p.title}`));
