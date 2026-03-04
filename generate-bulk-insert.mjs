import { readFileSync, readdirSync } from 'fs';

function escapeSQL(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

const files = readdirSync('.').filter(f => f.startsWith('phase3-') && f.endsWith('.json'));

console.log(`-- Phase 3 Bulk Insert: ${files.length} posts`);
console.log(`-- Generated: ${new Date().toISOString()}\n`);

const insertStatements = [];

for (const file of files.sort()) {
  try {
    const data = JSON.parse(readFileSync(file, 'utf-8'));

    const sql = `INSERT INTO blog_posts (title, slug, content, meta_description, reading_time, language, status, author_id)
VALUES (
  '${escapeSQL(data.title)}',
  '${escapeSQL(data.slug)}',
  '${escapeSQL(data.content)}',
  '${escapeSQL(data.meta_description)}',
  ${data.reading_time},
  '${data.language}',
  '${data.status}',
  '${data.author_id}'
)
ON CONFLICT (slug, language) DO NOTHING;`;

    insertStatements.push(sql);
  } catch (err) {
    console.error(`-- Error processing ${file}: ${err.message}`);
  }
}

console.log(insertStatements.join('\n\n'));

console.log(`\n-- Total: ${insertStatements.length} INSERT statements generated`);
