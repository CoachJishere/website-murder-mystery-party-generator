import fs from 'fs';

const data = JSON.parse(fs.readFileSync('korean-batch1-posts.json', 'utf-8'));
const lines = data.split('\n');
const jsonStart = lines.findIndex(l => l.trim() === '[');
const jsonEnd = lines.lastIndexOf(']') + 1;
const jsonData = lines.slice(jsonStart, jsonEnd).join('\n');
const posts = JSON.parse(jsonData);

posts.forEach((post, idx) => {
  console.log(`\n=== POST ${idx + 1} ===`);
  console.log(`ID: ${post.id}`);
  console.log(`Title: ${post.title}`);
  console.log(`Slug: ${post.slug}`);
  console.log(`Content length: ${post.content?.length || 0} chars`);
  console.log(`First 200 chars: ${post.content?.substring(0, 200)}`);
});

console.log(`\n\nTotal posts: ${posts.length}`);
