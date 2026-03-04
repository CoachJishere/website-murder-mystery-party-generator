import { readFileSync, writeFileSync } from 'fs';

const rawData = JSON.parse(readFileSync('/Users/jonathanmiller/.claude/projects/-Users-jonathanmiller-My-Drive--04--Projects--01--CascadeProjects-website-murder-mystery-party-generator-main/d58da083-4531-4817-af50-062812c34d4a/tool-results/mcp-supabase-execute_sql-1772242382124.txt', 'utf-8'));

// Extract the actual data from the wrapped response
const text = rawData[0].text;

// Find the JSON array between the untrusted-data tags
const startMarker = '<untrusted-data-';
const endMarker = '</untrusted-data-';
const startIdx = text.indexOf(startMarker);
const endIdx = text.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  // Find the actual JSON start (after the closing >)
  const jsonStart = text.indexOf('>', startIdx) + 1;
  const jsonText = text.substring(jsonStart, endIdx).trim();

  const posts = JSON.parse(jsonText);
  writeFileSync('german-batch-3-source-posts.json', JSON.stringify(posts, null, 2));
  console.log(`Extracted ${posts.length} posts`);

  // Show titles
  posts.forEach((post, idx) => {
    console.log(`${idx + 21}: ${post.title}`);
  });
} else {
  console.error('Could not find untrusted-data markers');
}
