import fs from 'fs';

// Read source posts
const sourcePosts = JSON.parse(
  fs.readFileSync('./french-batch-3-source-posts.json', 'utf-8')
);

console.log(`Extracting ${sourcePosts.length} posts...\n`);

// Extract each post to individual file
sourcePosts.forEach((post, index) => {
  const postNumber = 21 + index;
  const filename = `./en-batch-3-post-${postNumber}.txt`;

  const content = `POST ${postNumber}
Title: ${post.title}
Slug: ${post.slug}
ID: ${post.id}

${post.content}`;

  fs.writeFileSync(filename, content, 'utf-8');
  console.log(`✅ Extracted Post ${postNumber}: ${post.title}`);
});

console.log('\n✨ All posts extracted!');
