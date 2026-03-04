import fs from 'fs';

const posts = JSON.parse(fs.readFileSync('spanish-batch-1-source-posts.json', 'utf8'));

console.log('Total posts:', posts.length);
console.log('\nPost IDs and Titles:');
posts.forEach((p, i) => console.log(`${i+1}. ID: ${p.id.substring(0,8)}... | ${p.title}`));

console.log('\nSample fields for post 1:');
console.log('- Has ID:', !!posts[0].id);
console.log('- Has title:', !!posts[0].title);
console.log('- Has slug:', !!posts[0].slug);
console.log('- Has content:', !!posts[0].content);
console.log('- Has meta_description:', !!posts[0].meta_description);
console.log('- Content length:', posts[0].content.length, 'chars');
console.log('- Meta description:', posts[0].meta_description.substring(0, 100) + '...');
