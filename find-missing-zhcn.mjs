import fs from 'fs';

const audit = JSON.parse(fs.readFileSync('./translation-audit-full.json', 'utf8'));

const allPosts = audit.master.posts.map(p => p.id);
const zhcnPosts = audit.languages['zh-cn'].posts.map(p => p.id);
const missing = allPosts.filter(id => !zhcnPosts.includes(id));
const missingDetails = audit.master.posts.filter(p => missing.includes(p.id));

console.log(`Total posts: ${allPosts.length}`);
console.log(`ZH-CN posts: ${zhcnPosts.length}`);
console.log(`Missing: ${missing.length}`);

fs.writeFileSync('zh-cn-truly-missing.json', JSON.stringify(missingDetails, null, 2));
console.log('Saved to zh-cn-truly-missing.json');
