import { readFileSync } from 'fs';

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function calculateReadingTime(content) {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

function parseMarkdownPost(content, language = 'en') {
  const lines = content.split('\n');
  let title = '';
  let metaDescription = '';
  let postContent = '';
  let inFrontmatter = false;
  let frontmatterEnded = false;
  let contentStarted = false;

  // Check if file has frontmatter
  const hasFrontmatter = lines[0]?.trim() === '---';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === '---') {
      if (!inFrontmatter && i === 0) {
        inFrontmatter = true;
        continue;
      } else if (inFrontmatter) {
        inFrontmatter = false;
        frontmatterEnded = true;
        continue;
      }
    }

    if (inFrontmatter) {
      if (line.startsWith('title:')) {
        title = line.replace('title:', '').trim().replace(/^["']|["']$/g, '');
      } else if (line.startsWith('meta_description:')) {
        metaDescription = line.replace('meta_description:', '').trim().replace(/^["']|["']$/g, '');
      } else if (line.startsWith('description:')) {
        metaDescription = line.replace('description:', '').trim().replace(/^["']|["']$/g, '');
      }
    } else if (frontmatterEnded || !hasFrontmatter) {
      // If no frontmatter, extract title from first H1
      if (!title && line.startsWith('# ')) {
        title = line.replace(/^#\s+/, '').trim();
        contentStarted = true;
        continue;
      }

      // Skip metadata lines (Published/Updated/Author)
      if (line.trim().startsWith('*公開日') ||
          line.trim().startsWith('*Gepubliceerd') ||
          line.trim().startsWith('*Pubblicato') ||
          line.trim().startsWith('*Published') ||
          line.trim().match(/^\*.*\d{4}.*\|.*\|.*\*/)) {
        continue;
      }

      // Start collecting content after title or frontmatter
      if (contentStarted || frontmatterEnded) {
        postContent += line + '\n';
        contentStarted = true;
      }
    }
  }

  // If still no title, try to find it anywhere in first 20 lines
  if (!title) {
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      if (lines[i].startsWith('# ')) {
        title = lines[i].replace(/^#\s+/, '').trim();
        break;
      }
    }
  }

  // For Japanese files without H1, extract from filename pattern or use a generic approach
  if (!title && language === 'ja') {
    // Look for any prominent text that might be a title
    const nonEmptyLines = lines.filter(l => l.trim() && !l.startsWith('*') && !l.startsWith('|') && !l.startsWith('>'));
    if (nonEmptyLines.length > 0) {
      // Try to find text before "##" sections
      for (const line of nonEmptyLines) {
        if (line.startsWith('## ')) {
          break;
        }
        if (line.length > 10 && !line.startsWith('#')) {
          title = line.trim();
          break;
        }
      }
    }
  }

  // Generate meta description from first paragraph if not provided
  if (!metaDescription && postContent) {
    const paragraphs = postContent.split('\n\n').filter(p =>
      p.trim() &&
      !p.startsWith('#') &&
      !p.startsWith('|') &&
      !p.startsWith('-') &&
      !p.startsWith('>')
    );
    if (paragraphs.length > 0) {
      metaDescription = paragraphs[0]
        .replace(/\*/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .trim()
        .substring(0, 160);
    }
  }

  return {
    title: title.trim(),
    metaDescription: metaDescription.trim(),
    content: postContent.trim()
  };
}

// Read all posts and output JSON for MCP insertion
async function preparePostsForInsertion() {
  const allPosts = [];

  // Italian (IT) - Posts 48-61
  console.log('Processing Italian translations...');
  for (let i = 48; i <= 61; i++) {
    const filePath = `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/it-complete-post-${i}.md`;
    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      const { title, metaDescription, content } = parseMarkdownPost(fileContent, 'it');

      if (title && content) {
        allPosts.push({
          language: 'it',
          postNumber: i,
          title,
          slug: generateSlug(title),
          metaDescription,
          content,
          readingTime: calculateReadingTime(content)
        });
      } else {
        console.error(`IT Post ${i}: Missing title or content`);
      }
    } catch (err) {
      console.error(`IT Post ${i}: ${err.message}`);
    }
  }

  // Japanese (JA) - Posts 48-61
  console.log('Processing Japanese translations...');
  for (let i = 48; i <= 61; i++) {
    const filePath = `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/ja-complete-post-${i}.md`;
    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      const { title, metaDescription, content } = parseMarkdownPost(fileContent, 'ja');

      if (title && content) {
        allPosts.push({
          language: 'ja',
          postNumber: i,
          title,
          slug: generateSlug(title),
          metaDescription,
          content,
          readingTime: calculateReadingTime(content)
        });
      } else {
        console.error(`JA Post ${i}: Missing title or content`);
      }
    } catch (err) {
      console.error(`JA Post ${i}: ${err.message}`);
    }
  }

  // Swedish (SV) - Posts 1-15
  console.log('Processing Swedish translations...');
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

  for (let i = 0; i < svFiles.length; i++) {
    const filePath = `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/${svFiles[i]}`;
    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      const { title, metaDescription, content } = parseMarkdownPost(fileContent, 'sv');

      if (title && content) {
        allPosts.push({
          language: 'sv',
          postNumber: i + 1,
          title,
          slug: generateSlug(title),
          metaDescription,
          content,
          readingTime: calculateReadingTime(content)
        });
      } else {
        console.error(`SV Post ${i + 1}: Missing title or content`);
      }
    } catch (err) {
      console.error(`SV Post ${i + 1}: ${err.message}`);
    }
  }

  // Dutch (NL) - Posts 1-15
  console.log('Processing Dutch translations...');
  for (let i = 1; i <= 15; i++) {
    const filePath = `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/nl-complete-post-${i}.md`;
    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      const { title, metaDescription, content } = parseMarkdownPost(fileContent, 'nl');

      if (title && content) {
        allPosts.push({
          language: 'nl',
          postNumber: i,
          title,
          slug: generateSlug(title),
          metaDescription,
          content,
          readingTime: calculateReadingTime(content)
        });
      } else {
        console.error(`NL Post ${i}: Missing title or content`);
      }
    } catch (err) {
      console.error(`NL Post ${i}: ${err.message}`);
    }
  }

  console.log(`\n✅ Prepared ${allPosts.length} posts for insertion`);
  console.log(`   IT: ${allPosts.filter(p => p.language === 'it').length}`);
  console.log(`   JA: ${allPosts.filter(p => p.language === 'ja').length}`);
  console.log(`   SV: ${allPosts.filter(p => p.language === 'sv').length}`);
  console.log(`   NL: ${allPosts.filter(p => p.language === 'nl').length}`);

  return allPosts;
}

preparePostsForInsertion().then(posts => {
  console.log('\n' + JSON.stringify(posts, null, 2));
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
