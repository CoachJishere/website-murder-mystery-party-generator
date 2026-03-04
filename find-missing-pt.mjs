import fs from 'fs';

const auditData = JSON.parse(
  fs.readFileSync('./translation-audit-full.json', 'utf-8')
);

// Get all English post IDs and create a map
const masterPosts = auditData.master.posts;
const masterMap = new Map(masterPosts.map(p => [p.id, p]));

// Get all Portuguese posts
const ptPosts = auditData.languages.pt.posts;

console.log('Total master posts:', masterPosts.length);
console.log('Total PT posts:', ptPosts.length);
console.log('Expected missing:', auditData.languages.pt.gap);

// Now we need to find which master posts are missing in PT
// The PT posts have different IDs (they are translation IDs)
// We need to check by comparing slugs or titles

// Let's check if there's a pattern - PT slugs should contain Portuguese words
// Master slugs are in English

// Strategy: Get all PT slugs, then for each master post,
// check if a Portuguese version exists by checking if any PT post
// could be a translation of it

// First, let's see the data structure
console.log('\nSample master post:', JSON.stringify(masterPosts[0], null, 2));
console.log('\nSample PT post:', JSON.stringify(ptPosts[0], null, 2));
