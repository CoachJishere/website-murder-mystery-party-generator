#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Supabase configuration
const SUPABASE_URL = "https://mhfikaomkmqcndqfohbp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper functions
function extractTitle(content) {
  const lines = content.split('\n');
  // First try H1 (#)
  for (const line of lines) {
    if (line.startsWith('# ')) {
      return line.substring(2).trim();
    }
  }
  // If no H1, try first H2 (##)
  for (const line of lines) {
    if (line.startsWith('## ')) {
      return line.substring(3).trim();
    }
  }
  return null;
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function extractMetaDescription(content) {
  const lines = content.split('\n');
  let foundTitle = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      foundTitle = true;
      continue;
    }

    if (foundTitle && trimmed &&
        !trimmed.startsWith('*') &&
        !trimmed.startsWith('#') &&
        !trimmed.startsWith('|') &&
        !trimmed.startsWith('>') &&
        !trimmed.startsWith('-') &&
        trimmed.length > 50) {
      return trimmed.length > 160 ? trimmed.substring(0, 157) + '...' : trimmed;
    }
  }

  return 'Murder mystery party planning guide';
}

function calculateReadingTime(content) {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

function cleanContent(content) {
  const lines = content.split('\n');
  let cleanLines = [];
  let skipFirst = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip metadata lines at the beginning (after title)
    if (skipFirst < 2 && line.startsWith('*')) {
      skipFirst++;
      continue;
    }

    // Skip reading time at the end
    if (line.includes('*Tiempo de lectura:') ||
        line.includes('*Temps de lecture:') ||
        line.includes('*Lesezeit:') ||
        line.includes('*Reading time:')) {
      continue;
    }

    cleanLines.push(line);
  }

  return cleanLines.join('\n').trim();
}

async function processFile(filePath, language, postNumber) {
  try {
    console.log(`\n📄 Processing ${language.toUpperCase()} post ${postNumber}...`);

    const content = readFileSync(filePath, 'utf-8');
    const title = extractTitle(content);

    if (!title) {
      console.error(`   ❌ No title found`);
      return { success: false, error: 'No title found' };
    }

    const slug = generateSlug(title);
    const metaDescription = extractMetaDescription(content);
    const readingTime = calculateReadingTime(content);
    const cleanedContent = cleanContent(content);

    console.log(`   Title: ${title.substring(0, 60)}${title.length > 60 ? '...' : ''}`);
    console.log(`   Slug: ${slug}`);
    console.log(`   Reading time: ${readingTime} min`);

    // Check if post already exists
    const { data: existing, error: checkError } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .eq('language', language)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error(`   ❌ Error checking existing:`, checkError);
      return { success: false, error: checkError };
    }

    if (existing) {
      console.log(`   🔄 Post exists, updating...`);

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
        console.error(`   ❌ Update error:`, updateError);
        return { success: false, error: updateError };
      }

      console.log(`   ✅ Updated successfully`);
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
          post_date: '2026-02-16',
          published_at: '2026-02-16T00:00:00Z'
        });

      if (insertError) {
        console.error(`   ❌ Insert error:`, insertError);
        return { success: false, error: insertError };
      }

      console.log(`   ✅ Inserted successfully`);
      return { success: true, action: 'inserted' };
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    return { success: false, error };
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('PHASE 1 TRANSLATION INSERTION - Final Version');
  console.log('='.repeat(70));

  const results = {
    de: { inserted: 0, updated: 0, failed: 0 },
    fr: { inserted: 0, updated: 0, failed: 0 },
    es: { inserted: 0, updated: 0, failed: 0 }
  };

  // Process German posts (48-61)
  console.log('\n🇩🇪 PROCESSING GERMAN TRANSLATIONS (Posts 48-61)');
  console.log('-'.repeat(70));

  for (let i = 48; i <= 61; i++) {
    const filePath = join(projectRoot, `de-complete-post-${i}.md`);
    const result = await processFile(filePath, 'de', i);

    if (result.success) {
      if (result.action === 'inserted') results.de.inserted++;
      else if (result.action === 'updated') results.de.updated++;
    } else {
      results.de.failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Process French posts (1-25)
  console.log('\n\n🇫🇷 PROCESSING FRENCH TRANSLATIONS (Posts 1-25)');
  console.log('-'.repeat(70));

  for (let i = 1; i <= 25; i++) {
    const filePath = join(projectRoot, `fr-complete-post-${i}.md`);
    const result = await processFile(filePath, 'fr', i);

    if (result.success) {
      if (result.action === 'inserted') results.fr.inserted++;
      else if (result.action === 'updated') results.fr.updated++;
    } else {
      results.fr.failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Process Spanish posts (48-61)
  console.log('\n\n🇪🇸 PROCESSING SPANISH TRANSLATIONS (Posts 48-61)');
  console.log('-'.repeat(70));

  for (let i = 48; i <= 61; i++) {
    const filePath = join(projectRoot, `es-complete-post-${i}.md`);
    const result = await processFile(filePath, 'es', i);

    if (result.success) {
      if (result.action === 'inserted') results.es.inserted++;
      else if (result.action === 'updated') results.es.updated++;
    } else {
      results.es.failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Verification
  console.log('\n\n' + '='.repeat(70));
  console.log('VERIFICATION - Total post counts per language');
  console.log('='.repeat(70));

  for (const lang of ['de', 'fr', 'es']) {
    const { count, error } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .eq('language', lang)
      .eq('status', 'published');

    if (error) {
      console.error(`\n❌ Error checking ${lang.toUpperCase()} count:`, error);
    } else {
      const flag = lang === 'de' ? '🇩🇪' : lang === 'fr' ? '🇫🇷' : '🇪🇸';
      console.log(`\n${flag} ${lang.toUpperCase()}: ${count} total published posts`);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(70));

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

  console.log('\n' + '='.repeat(70));
  console.log(`TOTAL: ${totalSuccess} successful, ${totalFailed} failed`);
  console.log('='.repeat(70));

  if (totalFailed === 0) {
    console.log('\n🎉 All Phase 1 translations inserted successfully!\n');
  } else {
    console.log(`\n⚠️  ${totalFailed} posts failed. Please review errors above.\n`);
  }
}

main().catch(console.error);
