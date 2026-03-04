import { readFileSync } from 'fs';

// Read Italian post 49
const it49 = JSON.parse(readFileSync('phase3-it-49.json', 'utf-8'));

// Escape single quotes for SQL
function esc(str) {
  return str ? str.replace(/'/g, "''") : '';
}

// Print out INSERT SQL
console.log(`
INSERT INTO blog_posts (title, slug, content, meta_description, reading_time, language, status)
SELECT 
  '${esc(it49.title)}',
  '${esc(it49.slug)}',
  '${esc(it49.content)}',
  '${esc(it49.meta_description)}',
  ${it49.reading_time},
  '${it49.language}',
  '${it49.status}'
WHERE NOT EXISTS (
  SELECT 1 FROM blog_posts WHERE slug = '${esc(it49.slug)}' AND language = '${it49.language}'
);
`);
