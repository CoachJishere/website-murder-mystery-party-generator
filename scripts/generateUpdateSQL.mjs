import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the optimized content
const contentPath = join(__dirname, '../temp-files/victorian-content-only.txt');
const content = readFileSync(contentPath, 'utf-8');

// Escape single quotes by doubling them for SQL
const escapedContent = content.replace(/'/g, "''");

// Generate SQL with E-string notation for proper escaping
const sql = `UPDATE blog_posts
SET
  content = E'${escapedContent}',
  reading_time = 14,
  updated_at = NOW()
WHERE id = 'f9e5ae63-d483-42e0-845e-6c5ce69c3624'
RETURNING id, slug, title, reading_time, updated_at;`;

// Save to file
const outputPath = join(__dirname, '../temp-files/update-victorian.sql');
writeFileSync(outputPath, sql, 'utf-8');

console.log('✅ Generated SQL file:', outputPath);
console.log('Content length:', content.length, 'characters');
console.log('SQL length:', sql.length, 'characters');
