import { readFileSync } from 'fs';

const filePath = '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/it-complete-post-48.md';
const content = readFileSync(filePath, 'utf-8');

// Extract title from first H1
const lines = content.split('\n');
let title = '';
for (const line of lines) {
  if (line.startsWith('# ')) {
    title = line.replace(/^#\s+/, '').trim();
    break;
  }
}

// Skip metadata lines and build content
const contentLines = [];
let skipMetadata = true;
for (const line of lines) {
  if (line.startsWith('# ')) continue; // Skip title
  if (line.trim().startsWith('*Pubblicato:')) continue; // Skip published line
  if (line.trim().startsWith('*Basato sull')) continue; // Skip based on line
  if (line.trim() === '') {
    if (!skipMetadata) contentLines.push(line);
    continue;
  }
  skipMetadata = false;
  contentLines.push(line);
}

const postContent = contentLines.join('\n').trim();

// Generate slug
const slug = title
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\w\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .trim();

// Calculate reading time
const wordCount = postContent.split(/\s+/).length;
const readingTime = Math.ceil(wordCount / 200);

// Generate meta description from first paragraph
const paragraphs = postContent.split('\n\n').filter(p =>
  p.trim() &&
  !p.startsWith('#') &&
  !p.startsWith('|') &&
  !p.startsWith('-') &&
  !p.startsWith('>')
);
const metaDescription = paragraphs[0]
  ?.replace(/\*/g, '')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .trim()
  .substring(0, 160) || '';

console.log(JSON.stringify({
  title,
  slug,
  content: postContent,
  meta_description: metaDescription,
  reading_time: readingTime,
  language: 'it',
  status: 'published',
  author_id: '410544b2-4001-4271-9855-fec4b6a6442a'
}, null, 2));
