#!/usr/bin/env node

import fs from 'fs/promises';

async function main() {
  const sourceData = JSON.parse(
    await fs.readFile('german-batch-2-source-posts.json', 'utf8')
  );

  console.log('Total posts to process:', sourceData.length);
  console.log('\nPost list:');

  sourceData.forEach((post, i) => {
    console.log(`\nPost ${i + 11}:`);
    console.log(`  Title: ${post.title}`);
    console.log(`  Slug: ${post.slug}`);
    console.log(`  Content length: ${post.content.length} chars`);
    console.log(`  Words (approx): ${post.content.split(/\s+/).length}`);
  });

  // Save individual posts for manual processing
  for (let i = 0; i < sourceData.length; i++) {
    const post = sourceData[i];
    const postNumber = i + 11;
    const filename = `batch-2-post-${postNumber}-source.json`;

    await fs.writeFile(
      filename,
      JSON.stringify({
        number: postNumber,
        title: post.title,
        slug: post.slug,
        content: post.content
      }, null, 2),
      'utf8'
    );
  }

  console.log('\n✅ Individual source files created for posts 11-20');
}

main().catch(console.error);
