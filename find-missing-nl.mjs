import fs from 'fs';

const audit = JSON.parse(fs.readFileSync('translation-audit-full.json', 'utf8'));

const nlData = audit.languages.nl;
console.log('Dutch stats:', JSON.stringify({
  total: nlData.totalPosts,
  missing: nlData.missingCount,
  exists: nlData.existsCount
}, null, 2));

// Get all English post IDs from master
const allEnglishPosts = audit.master.posts;

// Find missing post IDs
const nlPostIds = new Set(nlData.posts.map(p => p.id));
const missingPosts = allEnglishPosts.filter(p => !nlPostIds.has(p.id));

console.log('\nMissing Dutch posts:', missingPosts.length);

const missingData = missingPosts.map(p => ({
  postId: p.id,
  slug: p.slug,
  title: p.title
}));

fs.writeFileSync('nl-missing-posts.json', JSON.stringify(missingData, null, 2));
console.log('\nSaved to nl-missing-posts.json');
console.log(JSON.stringify(missingData, null, 2));
