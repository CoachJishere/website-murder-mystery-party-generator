import fs from 'fs';

const rawContent = fs.readFileSync('/Users/jonathanmiller/.claude/projects/-Users-jonathanmiller-My-Drive--04--Projects--01--CascadeProjects-website-murder-mystery-party-generator-main/d58da083-4531-4817-af50-062812c34d4a/tool-results/toolu_01GhLYLcsPKw2qynVnb2JtK8.txt', 'utf8');

// Find the start of the JSON array within the escaped string
const startMarker = '<untrusted-data-a5567208-cc2f-4e4b-afee-a9484f093ef3>\\n';
const endMarker = '\\n</untrusted-data-a5567208-cc2f-4e4b-afee-a9484f093ef3>';

const startIdx = rawContent.indexOf(startMarker);
const endIdx = rawContent.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find data markers');
  process.exit(1);
}

// Extract the JSON string (it's escaped within the outer JSON)
const jsonStr = rawContent.substring(startIdx + startMarker.length, endIdx);

// Unescape the JSON
const unescapedJson = jsonStr
  .replace(/\\n/g, '\n')
  .replace(/\\"/g, '"')
  .replace(/\\\\/g, '\\');

// Parse it
const posts = JSON.parse(unescapedJson);

console.log(`✓ Extracted ${posts.length} posts`);

posts.forEach((post, idx) => {
  console.log(`\nPost ${idx + 41}:`);
  console.log(`  ID: ${post.id}`);
  console.log(`  Slug: ${post.slug}`);
  console.log(`  Title: ${post.title}`);
  console.log(`  Content: ${post.content.length} chars`);
});

// Save to file
fs.writeFileSync('german-batch-5-source-posts.json', JSON.stringify(posts, null, 2));
console.log('\n✓ Saved to german-batch-5-source-posts.json');
