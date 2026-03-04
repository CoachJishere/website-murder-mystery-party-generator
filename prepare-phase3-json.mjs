import { readFileSync, writeFileSync } from 'fs';

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

    // Find title
    let title = '';
    let checkingFrontmatter = false;

    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i];

      if (line.trim() === '---') {
        checkingFrontmatter = !checkingFrontmatter;
        continue;
      }

      if (checkingFrontmatter && line.startsWith('title:')) {
        title = line.replace('title:', '').trim().replace(/^["']|["']$/g, '');
        break;
      }

      if (!checkingFrontmatter && line.startsWith('# ')) {
        title = line.replace(/^#\s+/, '').trim();
        break;
      }
    }

    if (!title) {
      console.error(`No title in ${filePath}`);
      return null;
    }

    // Build content
    const contentLines = [];
    let inFrontmatter = lines[0]?.trim() === '---';
    let frontmatterDashes = 0;

    for (const line of lines) {
      // Handle frontmatter
      if (line.trim() === '---') {
        frontmatterDashes++;
        if (frontmatterDashes === 2) {
          inFrontmatter = false;
        }
        continue;
      }

      if (inFrontmatter) continue;

      // Skip title line and metadata
      if (line.startsWith('# ') && line.includes(title)) continue;
      if (line.trim().startsWith('*Pubblicato:') || line.trim().startsWith('*Gepubliceerd:')) continue;
      if (line.trim().startsWith('*Basato sull') || line.trim().startsWith('*Gebaseerd')) continue;
      if (line.trim().match(/^\*.*\d{4}.*\|.*\|.*\*/)) continue;

      contentLines.push(line);
    }

    const postContent = contentLines.join('\n').trim();

    if (!postContent) {
      console.error(`No content in ${filePath}`);
      return null;
    }

    const slug = generateSlug(title);
    const wordCount = postContent.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);

    const paragraphs = postContent.split('\n\n').filter(p =>
      p.trim() && !p.startsWith('#') && !p.startsWith('|') && !p.startsWith('-') && !p.startsWith('>')
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
      meta_description: metaDescription,
      reading_time: readingTime,
      language,
      status: 'published',
      author_id: '410544b2-4001-4271-9855-fec4b6a6442a'
    };
  } catch (err) {
    console.error(`Error parsing ${filePath}: ${err.message}`);
    return null;
  }
}

const allPosts = { italian: [], swedish: [], dutch: [] };

// Italian
console.log('Processing Italian...');
for (let i = 48; i <= 61; i++) {
  const post = parsePost(`/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/it-complete-post-${i}.md`, 'it');
  if (post) allPosts.italian.push(post);
}

// Swedish
console.log('Processing Swedish...');
const svFiles = ['sv-post-1-1920s-speakeasy.md', 'sv-post-2-masquerade-ball.md', 'sv-post-3-detective-themes.md', 'sv-post-4-fix-boring.md', 'sv-post-5-fix-confusing-clues.md', 'sv-post-6-fix-non-participating-guests.md', 'sv-post-7-fix-complex.md', 'sv-post-8.md', 'sv-post-9.md', 'sv-post-10.md', 'sv-post-11.md', 'sv-post-12.md', 'sv-post-13.md', 'sv-post-14.md', 'sv-post-15.md'];
for (const filename of svFiles) {
  const post = parsePost(`/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/${filename}`, 'sv');
  if (post) allPosts.swedish.push(post);
}

// Dutch
console.log('Processing Dutch...');
for (let i = 1; i <= 15; i++) {
  const post = parsePost(`/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/nl-complete-post-${i}.md`, 'nl');
  if (post) allPosts.dutch.push(post);
}

console.log(`\nParsed: IT=${allPosts.italian.length}, SV=${allPosts.swedish.length}, NL=${allPosts.dutch.length}`);

// Save each post as individual file
allPosts.italian.forEach((post, idx) => {
  writeFileSync(`phase3-it-${idx + 48}.json`, JSON.stringify(post, null, 2));
});

allPosts.swedish.forEach((post, idx) => {
  writeFileSync(`phase3-sv-${idx + 1}.json`, JSON.stringify(post, null, 2));
});

allPosts.dutch.forEach((post, idx) => {
  writeFileSync(`phase3-nl-${idx + 1}.json`, JSON.stringify(post, null, 2));
});

console.log('✅ JSON files created for all posts');
