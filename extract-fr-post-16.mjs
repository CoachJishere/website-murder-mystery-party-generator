import fs from 'fs';

const posts = JSON.parse(fs.readFileSync('fr-batch4-posts.json', 'utf8'));
const post16 = posts[0]; // First post is index 16

fs.writeFileSync(
  'fr-post-16-to-translate.json',
  JSON.stringify(post16, null, 2)
);

console.log('Post 16 saved to fr-post-16-to-translate.json');
console.log(`Title: ${post16.title}`);
console.log(`Content length: ${post16.content.length} characters`);
