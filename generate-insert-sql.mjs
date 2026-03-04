import { readFileSync } from 'fs';

function escapeSQL(str) {
  if (!str) return '';
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function parsePost(filePath, language) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Find title (first H1)
    let title = '';
    for (const line of lines) {
      if (line.startsWith('# ')) {
        title = line.replace(/^#\s+/, '').trim();
        break;
      }
    }

    if (!title) {
      // Try frontmatter for Dutch
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        if (lines[i].startsWith('title:')) {
          title = lines[i].replace('title:', '').trim().replace(/^["']|["']$/g, '');
          break;
        }
      }
    }

    if (!title) {
      console.error(`No title found in ${filePath}`);
      return null;
    }

    // Build content (skip title and metadata lines)
    const contentLines = [];
    let skipNext = false;
    for (const line of lines) {
      if (line.startsWith('# ') && line.includes(title)) continue;
      if (line.startsWith('---') && contentLines.length === 0) continue; // Skip frontmatter
      if (line.startsWith('title:') || line.startsWith('meta_description:') || line.startsWith('slug:')) continue;
      if (line.trim().startsWith('*Pubblicato:') || line.trim().startsWith('*Gepubliceerd:') || line.trim().startsWith('*公開日')) continue;
      if (line.trim().startsWith('*Basato sull') || line.trim().startsWith('*Gebaseerd') || line.trim().match(/^\*.*\d{4}.*\|.*\|.*\*/)) continue;

      contentLines.push(line);
    }

    const postContent = contentLines.join('\n').trim();

    if (!postContent) {
      console.error(`No content found in ${filePath}`);
      return null;
    }

    const slug = generateSlug(title);
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
      .substring(0, 160) || title.substring(0, 160);

    return {
      title,
      slug,
      content: postContent,
      metaDescription,
      readingTime,
      language
    };
  } catch (err) {
    console.error(`Error parsing ${filePath}: ${err.message}`);
    return null;
  }
}

const posts = [];

// Italian posts (48-61)
console.error('Processing Italian posts...');
for (let i = 48; i <= 61; i++) {
  const filePath = `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/it-complete-post-${i}.md`;
  const post = parsePost(filePath, 'it');
  if (post) posts.push(post);
}

// Swedish posts (1-15)
console.error('Processing Swedish posts...');
const svFiles = [
  'sv-post-1-1920s-speakeasy.md',
  'sv-post-2-masquerade-ball.md',
  'sv-post-3-detective-themes.md',
  'sv-post-4-fix-boring.md',
  'sv-post-5-fix-confusing-clues.md',
  'sv-post-6-fix-non-participating-guests.md',
  'sv-post-7-fix-complex.md',
  'sv-post-8.md',
  'sv-post-9.md',
  'sv-post-10.md',
  'sv-post-11.md',
  'sv-post-12.md',
  'sv-post-13.md',
  'sv-post-14.md',
  'sv-post-15.md'
];

for (const filename of svFiles) {
  const filePath = `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/${filename}`;
  const post = parsePost(filePath, 'sv');
  if (post) posts.push(post);
}

// Dutch posts (1-15)
console.error('Processing Dutch posts...');
for (let i = 1; i <= 15; i++) {
  const filePath = `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/nl-complete-post-${i}.md`;
  const post = parsePost(filePath, 'nl');
  if (post) posts.push(post);
}

console.error(`\nParsed ${posts.length} posts successfully`);
console.error(`IT: ${posts.filter(p => p.language === 'it').length}`);
console.error(`SV: ${posts.filter(p => p.language === 'sv').length}`);
console.error(`NL: ${posts.filter(p => p.language === 'nl').length}`);
console.error('\n');

// Generate INSERT statements
for (const post of posts) {
  const sql = `INSERT INTO blog_posts (title, slug, content, meta_description, reading_time, language, status, author_id)
VALUES ('${escapeSQL(post.title)}', '${escapeSQL(post.slug)}', '${escapeSQL(post.content)}', '${escapeSQL(post.metaDescription)}', ${post.readingTime}, '${post.language}', 'published', '410544b2-4001-4271-9855-fec4b6a6442a')
ON CONFLICT (slug, language) DO NOTHING;`;

  console.log(sql);
  console.log('');
}
