import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDQ2OTg2MCwiZXhwIjoyMDUwMDQ1ODYwfQ.av0SgchM3vhoGfiMKNRPoZlwfo1jJnok8IEtg_Yn6j0';
const supabase = createClient(supabaseUrl, supabaseKey);

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

      // Start collecting content after title
      if (contentStarted || frontmatterEnded) {
        postContent += line + '\n';
        contentStarted = true;
      }
    }
  }

  // If still no title, try to extract from content
  if (!title && postContent) {
    const h1Match = postContent.match(/^#\s+(.+)$/m);
    if (h1Match) {
      title = h1Match[1].trim();
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

async function insertPost(filePath, language, postNumber) {
  try {
    console.log(`\n[${language.toUpperCase()}] Processing post ${postNumber}...`);

    const fileContent = readFileSync(filePath, 'utf-8');
    const { title, metaDescription, content } = parseMarkdownPost(fileContent, language);

    if (!title || !content) {
      console.error(`❌ Missing title or content in ${filePath}`);
      return { success: false, reason: 'missing_data' };
    }

    const slug = generateSlug(title);
    const readingTime = calculateReadingTime(content);

    // Check if post already exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id, slug')
      .eq('slug', slug)
      .eq('language', language)
      .single();

    if (existing) {
      console.log(`⚠️  Post already exists: ${slug}`);
      return { success: false, reason: 'duplicate', slug };
    }

    // Insert new post
    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        title,
        slug,
        content,
        meta_description: metaDescription,
        reading_time: readingTime,
        language,
        status: 'published',
        author_id: '410544b2-4001-4271-9855-fec4b6a6442a'
      })
      .select();

    if (error) {
      console.error(`❌ Error inserting post: ${error.message}`);
      return { success: false, reason: 'error', error: error.message };
    }

    console.log(`✅ Inserted: ${title} (${slug})`);
    return { success: true, slug, title };
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
    return { success: false, reason: 'exception', error: err.message };
  }
}

async function insertAllPhase3() {
  const results = {
    italian: { inserted: 0, skipped: 0, errors: 0, posts: [] },
    japanese: { inserted: 0, skipped: 0, errors: 0, posts: [] },
    swedish: { inserted: 0, skipped: 0, errors: 0, posts: [] },
    dutch: { inserted: 0, skipped: 0, errors: 0, posts: [] }
  };

  console.log('========================================');
  console.log('PHASE 3 TRANSLATION INSERTION');
  console.log('========================================');

  // Italian (IT) - Posts 48-61
  console.log('\n\n📚 ITALIAN TRANSLATIONS (14 posts)');
  console.log('----------------------------------------');
  for (let i = 48; i <= 61; i++) {
    const filePath = `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/it-complete-post-${i}.md`;
    const result = await insertPost(filePath, 'it', i);

    if (result.success) {
      results.italian.inserted++;
      results.italian.posts.push(result.slug);
    } else if (result.reason === 'duplicate') {
      results.italian.skipped++;
    } else {
      results.italian.errors++;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Japanese (JA) - Posts 48-61
  console.log('\n\n🇯🇵 JAPANESE TRANSLATIONS (14 posts)');
  console.log('----------------------------------------');
  for (let i = 48; i <= 61; i++) {
    const filePath = `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/ja-complete-post-${i}.md`;
    const result = await insertPost(filePath, 'ja', i);

    if (result.success) {
      results.japanese.inserted++;
      results.japanese.posts.push(result.slug);
    } else if (result.reason === 'duplicate') {
      results.japanese.skipped++;
    } else {
      results.japanese.errors++;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Swedish (SV) - Posts 1-15
  console.log('\n\n🇸🇪 SWEDISH TRANSLATIONS (15 posts)');
  console.log('----------------------------------------');
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
    const result = await insertPost(filePath, 'sv', i + 1);

    if (result.success) {
      results.swedish.inserted++;
      results.swedish.posts.push(result.slug);
    } else if (result.reason === 'duplicate') {
      results.swedish.skipped++;
    } else {
      results.swedish.errors++;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Dutch (NL) - Posts 1-15
  console.log('\n\n🇳🇱 DUTCH TRANSLATIONS (15 posts)');
  console.log('----------------------------------------');
  for (let i = 1; i <= 15; i++) {
    const filePath = `/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main/nl-complete-post-${i}.md`;
    const result = await insertPost(filePath, 'nl', i);

    if (result.success) {
      results.dutch.inserted++;
      results.dutch.posts.push(result.slug);
    } else if (result.reason === 'duplicate') {
      results.dutch.skipped++;
    } else {
      results.dutch.errors++;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Final verification - Query database for counts
  console.log('\n\n========================================');
  console.log('VERIFICATION - DATABASE COUNTS');
  console.log('========================================');

  const languages = ['it', 'ja', 'sv', 'nl'];
  for (const lang of languages) {
    const { count, error } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .eq('language', lang)
      .eq('status', 'published');

    if (error) {
      console.error(`Error counting ${lang}:`, error.message);
    } else {
      console.log(`${lang.toUpperCase()}: ${count} published posts`);
    }
  }

  // Summary Report
  console.log('\n\n========================================');
  console.log('PHASE 3 INSERTION SUMMARY');
  console.log('========================================');

  console.log('\n📊 Italian (IT):');
  console.log(`   ✅ Inserted: ${results.italian.inserted}`);
  console.log(`   ⚠️  Skipped (duplicates): ${results.italian.skipped}`);
  console.log(`   ❌ Errors: ${results.italian.errors}`);

  console.log('\n📊 Japanese (JA):');
  console.log(`   ✅ Inserted: ${results.japanese.inserted}`);
  console.log(`   ⚠️  Skipped (duplicates): ${results.japanese.skipped}`);
  console.log(`   ❌ Errors: ${results.japanese.errors}`);

  console.log('\n📊 Swedish (SV):');
  console.log(`   ✅ Inserted: ${results.swedish.inserted}`);
  console.log(`   ⚠️  Skipped (duplicates): ${results.swedish.skipped}`);
  console.log(`   ❌ Errors: ${results.swedish.errors}`);

  console.log('\n📊 Dutch (NL):');
  console.log(`   ✅ Inserted: ${results.dutch.inserted}`);
  console.log(`   ⚠️  Skipped (duplicates): ${results.dutch.skipped}`);
  console.log(`   ❌ Errors: ${results.dutch.errors}`);

  const totalInserted = results.italian.inserted + results.japanese.inserted +
                        results.swedish.inserted + results.dutch.inserted;
  const totalSkipped = results.italian.skipped + results.japanese.skipped +
                       results.swedish.skipped + results.dutch.skipped;
  const totalErrors = results.italian.errors + results.japanese.errors +
                      results.swedish.errors + results.dutch.errors;

  console.log('\n📈 TOTAL PHASE 3:');
  console.log(`   ✅ Total Inserted: ${totalInserted}/58`);
  console.log(`   ⚠️  Total Skipped: ${totalSkipped}`);
  console.log(`   ❌ Total Errors: ${totalErrors}`);
  console.log('\n========================================\n');

  return results;
}

// Run the insertion
insertAllPhase3()
  .then(() => {
    console.log('✅ Phase 3 insertion complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
