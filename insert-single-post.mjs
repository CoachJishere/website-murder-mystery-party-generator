#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const [lang, num, slug] = process.argv.slice(2);

if (!lang || !num || !slug) {
  console.error('Usage: node insert-single-post.mjs <lang> <num> <slug>');
  process.exit(1);
}

const filePath = path.join(__dirname, `${lang}-complete-post-${num}.md`);

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf-8');

function extractTitle(content) {
  const yamlTitleMatch = content.match(/^---\s*\ntitle:\s*"([^"]+)"/m);
  if (yamlTitleMatch) return yamlTitleMatch[1];

  const mdTitleMatch = content.match(/^#\s+(.+)$/m);
  if (mdTitleMatch) return mdTitleMatch[1].trim();

  return null;
}

function extractMetaDescription(content) {
  const yamlMetaMatch = content.match(/meta_description:\s*"([^"]+)"/);
  if (yamlMetaMatch) return yamlMetaMatch[1];

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('*') &&
        !trimmed.startsWith('-') && !trimmed.startsWith('|') && !trimmed.startsWith('>') &&
        !trimmed.startsWith('---') && !trimmed.startsWith('**') && trimmed.length > 50) {
      return trimmed.substring(0, 160);
    }
  }
  return '';
}

function calculateReadingTime(content) {
  const words = content.split(/\s+/).length;
  return Math.ceil(words / 200);
}

function escapeSQL(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

const title = extractTitle(content);
if (!title) {
  console.error('No title found');
  process.exit(1);
}

const meta_description = extractMetaDescription(content);
const reading_time = calculateReadingTime(content);

const sql = `INSERT INTO blog_posts (title, content, slug, meta_description, language, status, reading_time, published_at, created_at, updated_at)
SELECT
  '${escapeSQL(title)}',
  '${escapeSQL(content)}',
  '${slug}',
  '${escapeSQL(meta_description)}',
  '${lang}',
  'published',
  ${reading_time},
  NOW(),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM blog_posts WHERE slug = '${slug}' AND language = '${lang}'
);`;

console.log(sql);
