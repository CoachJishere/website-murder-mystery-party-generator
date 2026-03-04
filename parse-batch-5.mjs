import fs from 'fs';

// Read the file
const rawData = fs.readFileSync('/Users/jonathanmiller/.claude/projects/-Users-jonathanmiller-My-Drive--04--Projects--01--CascadeProjects-website-murder-mystery-party-generator-main/d58da083-4531-4817-af50-062812c34d4a/tool-results/toolu_01GhLYLcsPKw2qynVnb2JtK8.txt', 'utf8');

// Parse the JSON array
const parsed = JSON.parse(rawData);

// Extract the text content
const textContent = parsed[0].text;

// Find the data between the tags
const match = textContent.match(/<untrusted-data-[^>]+>(.*)<\/untrusted-data-[^>]+>/s);
if (match) {
  // Parse the escaped JSON
  const unescaped = JSON.parse(match[1]);
  
  // Save to file
  fs.writeFileSync('german-batch-5-source-posts.json', JSON.stringify(unescaped, null, 2));
  
  console.log(`✓ Extracted ${unescaped.length} posts`);
  
  unescaped.forEach((post, idx) => {
    console.log(`\nPost ${idx + 41}:`);
    console.log(`  Slug: ${post.slug}`);
    console.log(`  Title: ${post.title}`);
    console.log(`  Content: ${post.content.length} chars`);
  });
}
