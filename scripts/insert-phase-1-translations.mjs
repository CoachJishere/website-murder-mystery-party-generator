#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Supabase configuration
const SUPABASE_URL = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0MDQwMjgsImV4cCI6MjA1Mjk4MDAyOH0.aoNcqW82GaBq8_v3dpz-0e9nPdDaor1Q5YU7u_EEjhs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper function to extract title from markdown
function extractTitle(content) {
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('# ')) {
      return line.substring(2).trim();
    }
  }
  return null;
}

// Helper function to generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Helper function to extract meta description (first paragraph after title)
function extractMetaDescription(content) {
  const lines = content.split('\n');
  let foundTitle = false;
  let description = '';

  for (const line of lines) {
    if (line.startsWith('# ')) {
      foundTitle = true;
      continue;
    }

    if (foundTitle && line.trim() && !line.startsWith('*') && !line.startsWith('##')) {
      description = line.trim();
      break;
    }
  }

  // Limit to 160 characters
  if (description.length > 160) {
    description = description.substring(0, 157) + '...';
  }

  return description || 'Murder mystery party planning guide';
}

// Helper function to calculate reading time
function calculateReadingTime(content) {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return minutes;
}

// Helper function to remove metadata from content
function cleanContent(content) {
  const lines = content.split('\n');
  let cleanLines = [];
  let skipMetadata = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip first metadata line (Published/Updated)
    if (i === 0 && line.startsWith('*')) {
      continue;
    }

    // Skip second metadata line
    if (i === 1 && line.startsWith('*')) {
      continue;
    }

    // Skip reading time at the end
    if (line.includes('*Tiempo de lectura:') ||
        line.includes('*Temps de lecture:') ||
        line.includes('*Lesezeit:')) {
      continue;
    }

    cleanLines.push(line);
  }

  return cleanLines.join('\n').trim();
}

// Process single file
async function processFile(filePath, language, postNumber) {
  try {
    console.log(`\nProcessing ${language.toUpperCase()} post ${postNumber}...`);

    const content = readFileSync(filePath, 'utf-8');
    const title = extractTitle(content);

    if (!title) {
      console.error(`❌ No title found in ${filePath}`);
      return { success: false, error: 'No title found' };
    }

    const slug = generateSlug(title);
    const metaDescription = extractMetaDescription(content);
    const readingTime = calculateReadingTime(content);
    const cleanedContent = cleanContent(content);

    console.log(`  Title: ${title}`);
    console.log(`  Slug: ${slug}`);
    console.log(`  Reading time: ${readingTime} min`);

    // Check if post already exists
    const { data: existing, error: checkError } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .eq('language', language)
      .single();

    if (existing) {
      console.log(`  ⚠️  Post already exists, updating...`);

      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({
          title,
          content: cleanedContent,
          meta_description: metaDescription,
          reading_time: readingTime,
          status: 'published',
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error(`  ❌ Update error:`, updateError);
        return { success: false, error: updateError };
      }

      console.log(`  ✅ Updated successfully`);
      return { success: true, action: 'updated' };
    } else {
      // Insert new post
      const { error: insertError } = await supabase
        .from('blog_posts')
        .insert({
          title,
          slug,
          content: cleanedContent,
          meta_description: metaDescription,
          reading_time: readingTime,
          language,
          status: 'published',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error(`  ❌ Insert error:`, insertError);
        return { success: false, error: insertError };
      }

      console.log(`  ✅ Inserted successfully`);
      return { success: true, action: 'inserted' };
    }
  } catch (error) {
    console.error(`❌ Error processing file ${filePath}:`, error);
    return { success: false, error };
  }
}

// Main execution
async function main() {
  console.log('='.repeat(60));
  console.log('PHASE 1 TRANSLATION INSERTION');
  console.log('='.repeat(60));

  const results = {
    de: { inserted: 0, updated: 0, failed: 0 },
    fr: { inserted: 0, updated: 0, failed: 0 },
    es: { inserted: 0, updated: 0, failed: 0 }
  };

  // Process German posts (48-61)
  console.log('\n📚 PROCESSING GERMAN TRANSLATIONS (Posts 48-61)');
  console.log('-'.repeat(60));

  for (let i = 48; i <= 61; i++) {
    const filePath = join(projectRoot, `de-complete-post-${i}.md`);
    const result = await processFile(filePath, 'de', i);

    if (result.success) {
      if (result.action === 'inserted') results.de.inserted++;
      else if (result.action === 'updated') results.de.updated++;
    } else {
      results.de.failed++;
    }
  }

  // Process French posts (1-25)
  console.log('\n📚 PROCESSING FRENCH TRANSLATIONS (Posts 1-25)');
  console.log('-'.repeat(60));

  for (let i = 1; i <= 25; i++) {
    const filePath = join(projectRoot, `fr-complete-post-${i}.md`);
    const result = await processFile(filePath, 'fr', i);

    if (result.success) {
      if (result.action === 'inserted') results.fr.inserted++;
      else if (result.action === 'updated') results.fr.updated++;
    } else {
      results.fr.failed++;
    }
  }

  // Process Spanish posts (48-61)
  console.log('\n📚 PROCESSING SPANISH TRANSLATIONS (Posts 48-61)');
  console.log('-'.repeat(60));

  for (let i = 48; i <= 61; i++) {
    const filePath = join(projectRoot, `es-complete-post-${i}.md`);
    const result = await processFile(filePath, 'es', i);

    if (result.success) {
      if (result.action === 'inserted') results.es.inserted++;
      else if (result.action === 'updated') results.es.updated++;
    } else {
      results.es.failed++;
    }
  }

  // Verify counts
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION - Checking total post counts per language');
  console.log('='.repeat(60));

  for (const lang of ['de', 'fr', 'es']) {
    const { count, error } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .eq('language', lang)
      .eq('status', 'published');

    if (error) {
      console.error(`❌ Error checking ${lang.toUpperCase()} count:`, error);
    } else {
      console.log(`\n${lang.toUpperCase()}: ${count} total published posts`);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(60));

  console.log('\n🇩🇪 GERMAN (DE):');
  console.log(`   ✅ Inserted: ${results.de.inserted}`);
  console.log(`   🔄 Updated: ${results.de.updated}`);
  console.log(`   ❌ Failed: ${results.de.failed}`);

  console.log('\n🇫🇷 FRENCH (FR):');
  console.log(`   ✅ Inserted: ${results.fr.inserted}`);
  console.log(`   🔄 Updated: ${results.fr.updated}`);
  console.log(`   ❌ Failed: ${results.fr.failed}`);

  console.log('\n🇪🇸 SPANISH (ES):');
  console.log(`   ✅ Inserted: ${results.es.inserted}`);
  console.log(`   🔄 Updated: ${results.es.updated}`);
  console.log(`   ❌ Failed: ${results.es.failed}`);

  const totalSuccess =
    results.de.inserted + results.de.updated +
    results.fr.inserted + results.fr.updated +
    results.es.inserted + results.es.updated;

  const totalFailed = results.de.failed + results.fr.failed + results.es.failed;

  console.log('\n' + '='.repeat(60));
  console.log(`TOTAL: ${totalSuccess} successful, ${totalFailed} failed`);
  console.log('='.repeat(60));

  if (totalFailed === 0) {
    console.log('\n🎉 All Phase 1 translations inserted successfully!');
  } else {
    console.log(`\n⚠️  ${totalFailed} posts failed to insert. Please review errors above.`);
  }
}

main().catch(console.error);
