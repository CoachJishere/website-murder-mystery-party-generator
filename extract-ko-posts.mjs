import fs from 'fs';

const data = JSON.parse(fs.readFileSync('ko-batch-all-posts.json', 'utf8'));

data.posts.forEach((post, index) => {
  const filename = `ko-post-${index + 1}-source.json`;
  fs.writeFileSync(filename, JSON.stringify(post, null, 2));
  console.log(`Saved ${filename}: ${post.title}`);
});

console.log(`\nExtracted ${data.posts.length} posts`);
