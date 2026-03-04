#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const supabaseUrl = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w';

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Helper function to extract metadata from markdown
function extractMetadata(rawContent) {
  let content = rawContent;
  let yamlMetadata = {};

  // Remove YAML frontmatter if present
  if (content.startsWith('---\n')) {
    const endOfYaml = content.indexOf('\n---\n', 4);
    if (endOfYaml !== -1) {
      const yamlContent = content.substring(4, endOfYaml);
      // Parse simple YAML
      yamlContent.split('\n').forEach(line => {
        const match = line.match(/^(\w+):\s*"?(.+?)"?$/);
        if (match) {
          yamlMetadata[match[1]] = match[2].replace(/^"|"$/g, '');
        }
      });
      content = content.substring(endOfYaml + 5).trim();
    }
  }

  const lines = content.split('\n');

  // Find the first H1 title
  let title = '';
  let titleLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('# ')) {
      title = lines[i].replace(/^#\s+/, '').trim();
      titleLineIndex = i;
      break;
    }
  }

  // If no H1 found, try to use YAML title or first non-empty line
  if (!title) {
    if (yamlMetadata.title) {
      title = yamlMetadata.title;
      // Prepend title as H1 to content
      content = `# ${title}\n\n${content}`;
    } else {
      // Find first substantial line
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && !line.startsWith('*') && !line.startsWith('**发布') && !line.startsWith('**最后')) {
          title = line.replace(/^#+\s*/, '').replace(/^\*+/, '').trim();
          break;
        }
      }
    }
  }

  // Calculate reading time (word count / 200 wpm)
  const wordCount = content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  // Extract meta description
  let metaDescription = yamlMetadata.meta_description || '';

  if (!metaDescription) {
    // Find first substantial paragraph
    const paragraphs = content.split('\n\n');
    for (const para of paragraphs) {
      const cleaned = para.replace(/^#+\s+/, '').replace(/^\*+.*?\*+\s*/, '').trim();
      if (cleaned.length >= 50 && !cleaned.startsWith('#') && !cleaned.startsWith('|')) {
        metaDescription = cleaned.substring(0, 160).trim();
        break;
      }
    }
  }

  if (!metaDescription && title) {
    metaDescription = `${title.substring(0, 140)}...`;
  }

  return {
    title: title || 'Untitled',
    content,
    slug: yamlMetadata.slug || generateSlug(title || 'untitled'),
    metaDescription,
    readingTime
  };
}

// Process a single post
async function insertPost(filePath, language) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const metadata = extractMetadata(content);

    // Check if post already exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', metadata.slug)
      .eq('language', language)
      .single();

    if (existing) {
      console.log(`⏭️  Skipped (exists): ${metadata.title.substring(0, 50)}... [${language}]`);
      return { status: 'skipped', title: metadata.title, language };
    }

    // Insert the post
    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        title: metadata.title,
        content: metadata.content,
        slug: metadata.slug,
        meta_description: metadata.metaDescription,
        language: language,
        status: 'published',
        reading_time: metadata.readingTime,
        published_at: '2026-02-16T00:00:00Z',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error(`❌ Error inserting: ${metadata.title.substring(0, 50)}... [${language}]`);
      console.error(`   Error: ${error.message}`);
      return { status: 'error', title: metadata.title, language, error: error.message };
    }

    console.log(`✅ Inserted: ${metadata.title.substring(0, 50)}... [${language}] - ${metadata.readingTime} min read`);
    return { status: 'inserted', title: metadata.title, language };

  } catch (err) {
    console.error(`❌ Failed to process ${filePath}: ${err.message}`);
    return { status: 'error', filePath, error: err.message };
  }
}

// Main execution
async function main() {
  const baseDir = '/Users/jonathanmiller/My Drive/[04] Projects/[01] CascadeProjects/website-murder-mystery-party-generator-main';

  const batches = [
    { pattern: 'pt-complete-post-', count: 11, language: 'pt', name: 'Portuguese' },
    { pattern: 'ko-complete-post-', count: 9, language: 'ko', name: 'Korean' },
    { pattern: 'zh-cn-complete-post-', count: 12, language: 'zh-cn', name: 'Chinese (Simplified)' }
  ];

  const results = {
    inserted: 0,
    skipped: 0,
    errors: 0,
    byLanguage: {}
  };

  console.log('\n🚀 Starting Phase 2 Translation Insertion\n');
  console.log('=' .repeat(70));

  for (const batch of batches) {
    console.log(`\n📚 Processing ${batch.name} Posts (${batch.count} posts)\n`);
    results.byLanguage[batch.language] = { inserted: 0, skipped: 0, errors: 0 };

    for (let i = 1; i <= batch.count; i++) {
      const filePath = path.join(baseDir, `${batch.pattern}${i}.md`);
      const result = await insertPost(filePath, batch.language);

      results[result.status]++;
      results.byLanguage[batch.language][result.status]++;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Final verification - count posts by language
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 Final Verification - Post Counts by Language\n');

  for (const batch of batches) {
    const { count, error } = await supabase
      .from('blog_posts')
      .select('id', { count: 'exact', head: true })
      .eq('language', batch.language);

    if (!error) {
      console.log(`${batch.name} (${batch.language}): ${count} posts`);
    }
  }

  // Summary report
  console.log('\n' + '='.repeat(70));
  console.log('\n📈 Insertion Summary\n');
  console.log(`Total Inserted: ${results.inserted}`);
  console.log(`Total Skipped (already existed): ${results.skipped}`);
  console.log(`Total Errors: ${results.errors}`);

  console.log('\n📊 Breakdown by Language:\n');
  for (const [lang, stats] of Object.entries(results.byLanguage)) {
    console.log(`${lang}:`);
    console.log(`  ✅ Inserted: ${stats.inserted}`);
    console.log(`  ⏭️  Skipped: ${stats.skipped}`);
    console.log(`  ❌ Errors: ${stats.errors}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n✨ Phase 2 Translation Insertion Complete!\n');
}

main().catch(console.error);
