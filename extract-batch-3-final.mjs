import { readFileSync, writeFileSync } from 'fs';

const rawData = JSON.parse(readFileSync('/Users/jonathanmiller/.claude/projects/-Users-jonathanmiller-My-Drive--04--Projects--01--CascadeProjects-website-murder-mystery-party-generator-main/d58da083-4531-4817-af50-062812c34d4a/tool-results/mcp-supabase-execute_sql-1772242382124.txt', 'utf-8'));

// Extract the text field
const text = rawData[0].text;

// Find start and end of JSON data (it's escaped in the text)
const startMarker = text.indexOf('[{\\');
const endMarker = text.lastIndexOf('}]');

if (startMarker !== -1 && endMarker > startMarker) {
  // Get the escaped JSON string
  const escapedJson = text.substring(startMarker, endMarker + 2);

  // Unescape it by parsing as a JSON string
  const unescapedJson = JSON.parse('"' + escapedJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"');

  try {
    const posts = JSON.parse(unescapedJson);
    writeFileSync('german-batch-3-source-posts.json', JSON.stringify(posts, null, 2));
    console.log(`✓ Extracted ${posts.length} posts`);
    console.log('');
    posts.forEach((post, idx) => {
      const num = idx + 21;
      const title = post.title.length > 65 ? post.title.substring(0, 65) + '...' : post.title;
      console.log(`Post ${num}: ${title}`);
    });
  } catch (e) {
    console.error('Error parsing JSON:', e.message);
  }
} else {
  console.error('Could not find JSON boundaries');
}
