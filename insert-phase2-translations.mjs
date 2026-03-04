import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzE4MTQ0OCwiZXhwIjoyMDUyNzU3NDQ4fQ.jPwCt4TQB6f9kEe_GovF6FWGdJxGiX1-WbsWx_Bz1Mo';
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to extract metadata from markdown
function extractMetadata(content) {
  const lines = content.split('\n');
  const title = lines.find(line => line.startsWith('# '))?.replace('# ', '').trim();

  // Calculate reading time (words / 200 words per minute)
  const words = content.split(/\s+/).length;
  const reading_time = Math.ceil(words / 200);

  // Extract meta description from content (first paragraph or summary)
  const firstParagraph = lines.find(line => line.trim() && !line.startsWith('#') && !line.startsWith('*') && !line.startsWith('-') && !line.startsWith('|') && !line.startsWith('>'));
  const meta_description = firstParagraph?.substring(0, 160).trim();

  return { title, reading_time, meta_description };
}

// Function to generate slug from title
function generateSlug(title, language) {
  const slugMap = {
    pt: {
      1: 'como-corrigir-convidados-quebrando-o-personagem',
      2: 'como-corrigir-problemas-de-ritmo-de-misterio',
      3: 'como-corrigir-misterios-de-assassinato-excessivamente-complexos',
      4: 'como-corrigir-temas-de-misterio-de-assassinato-mal-escolhidos',
      5: 'como-corrigir-baixa-participacao-do-convidado-em-festas-de-misterio',
      6: 'como-corrigir-quando-os-convidados-resolvem-o-misterio-muito-cedo',
      7: 'como-corrigir-problemas-de-atribuicao-de-personagem',
      8: 'como-corrigir-revelacoes-anticlimacticas-de-misterio',
      9: 'como-corrigir-desenvolvimento-fraco-de-personagem-em-festas-de-misterio',
      10: 'como-corrigir-problemas-de-fluxo-de-pistas-de-misterio',
      11: 'como-corrigir-problemas-de-equilibrio-de-dificuldade-de-misterio'
    },
    ko: {
      1: 'how-to-fix-guests-breaking-character-ko',
      2: 'how-to-fix-mystery-pacing-issues-ko',
      3: 'how-to-fix-overly-complex-murder-mysteries-ko',
      4: 'how-to-fix-poorly-chosen-murder-mystery-themes-ko',
      5: 'how-to-fix-low-guest-participation-in-mystery-parties-ko',
      6: 'how-to-fix-when-guests-solve-mystery-too-early-ko',
      7: 'how-to-fix-character-assignment-problems-ko',
      8: 'how-to-fix-anticlimactic-mystery-reveals-ko',
      9: 'how-to-fix-weak-character-development-in-mystery-parties-ko'
    },
    'zh-cn': {
      1: 'how-to-fix-guests-breaking-character-zh-cn',
      2: 'how-to-fix-mystery-pacing-issues-zh-cn',
      3: 'how-to-fix-overly-complex-murder-mysteries-zh-cn',
      4: 'how-to-fix-poorly-chosen-murder-mystery-themes-zh-cn',
      5: 'how-to-fix-low-guest-participation-in-mystery-parties-zh-cn',
      6: 'how-to-fix-when-guests-solve-mystery-too-early-zh-cn',
      7: 'how-to-fix-character-assignment-problems-zh-cn',
      8: 'how-to-fix-anticlimactic-mystery-reveals-zh-cn',
      9: 'how-to-fix-weak-character-development-in-mystery-parties-zh-cn',
      10: 'how-to-fix-mystery-clue-flow-problems-zh-cn',
      11: 'how-to-fix-mystery-difficulty-balance-issues-zh-cn',
      12: 'how-to-fix-mystery-theme-mismatch-problems-zh-cn'
    }
  };

  return slugMap[language]?.[parseInt(title.match(/post-(\d+)/)?.[1])] ||
         title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Function to process and insert a file
async function processFile(filePath, language) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { title, reading_time, meta_description } = extractMetadata(content);

    if (!title) {
      console.error(`❌ No title found in ${filePath}`);
      return null;
    }

    const fileNum = path.basename(filePath).match(/(\d+)/)?.[1];
    const slug = generateSlug(`post-${fileNum}`, language);

    // Check if post already exists
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .eq('language', language)
      .single();

    if (existing) {
      console.log(`⚠️  Post already exists: ${slug} (${language})`);
      return null;
    }

    // Insert the post
    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        title,
        content,
        slug,
        meta_description,
        language,
        status: 'published',
        reading_time,
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error(`❌ Error inserting ${slug}:`, error.message);
      return null;
    }

    console.log(`✅ Inserted: ${slug} (${language})`);
    return data[0];
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return null;
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Phase 2 Translation Insertions\n');

  const results = {
    pt: { success: 0, failed: 0, skipped: 0 },
    ko: { success: 0, failed: 0, skipped: 0 },
    'zh-cn': { success: 0, failed: 0, skipped: 0 }
  };

  // Process Portuguese files (1-11)
  console.log('📝 Processing Portuguese translations...');
  for (let i = 1; i <= 11; i++) {
    const filePath = path.join(__dirname, `pt-complete-post-${i}.md`);
    if (fs.existsSync(filePath)) {
      const result = await processFile(filePath, 'pt');
      if (result) results.pt.success++;
      else if (result === null) results.pt.skipped++;
      else results.pt.failed++;
    } else {
      console.log(`⚠️  File not found: pt-complete-post-${i}.md`);
      results.pt.failed++;
    }
  }

  // Process Korean files (1-9)
  console.log('\n📝 Processing Korean translations...');
  for (let i = 1; i <= 9; i++) {
    const filePath = path.join(__dirname, `ko-complete-post-${i}.md`);
    if (fs.existsSync(filePath)) {
      const result = await processFile(filePath, 'ko');
      if (result) results.ko.success++;
      else if (result === null) results.ko.skipped++;
      else results.ko.failed++;
    } else {
      console.log(`⚠️  File not found: ko-complete-post-${i}.md`);
      results.ko.failed++;
    }
  }

  // Process Chinese Simplified files (1-12)
  console.log('\n📝 Processing Chinese Simplified translations...');
  for (let i = 1; i <= 12; i++) {
    const filePath = path.join(__dirname, `zh-cn-complete-post-${i}.md`);
    if (fs.existsSync(filePath)) {
      const result = await processFile(filePath, 'zh-cn');
      if (result) results['zh-cn'].success++;
      else if (result === null) results['zh-cn'].skipped++;
      else results['zh-cn'].failed++;
    } else {
      console.log(`⚠️  File not found: zh-cn-complete-post-${i}.md`);
      results['zh-cn'].failed++;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 INSERTION SUMMARY');
  console.log('='.repeat(50));
  console.log(`Portuguese (PT):   ✅ ${results.pt.success} | ⚠️  ${results.pt.skipped} | ❌ ${results.pt.failed}`);
  console.log(`Korean (KO):       ✅ ${results.ko.success} | ⚠️  ${results.ko.skipped} | ❌ ${results.ko.failed}`);
  console.log(`Chinese (ZH-CN):   ✅ ${results['zh-cn'].success} | ⚠️  ${results['zh-cn'].skipped} | ❌ ${results['zh-cn'].failed}`);
  console.log('='.repeat(50));
  console.log(`Total Success: ${results.pt.success + results.ko.success + results['zh-cn'].success}`);
  console.log(`Total Skipped: ${results.pt.skipped + results.ko.skipped + results['zh-cn'].skipped}`);
  console.log(`Total Failed: ${results.pt.failed + results.ko.failed + results['zh-cn'].failed}`);

  // Verify counts in database
  console.log('\n🔍 Verifying database counts...');
  const { data: ptCount } = await supabase
    .from('blog_posts')
    .select('id', { count: 'exact', head: true })
    .eq('language', 'pt');

  const { data: koCount } = await supabase
    .from('blog_posts')
    .select('id', { count: 'exact', head: true })
    .eq('language', 'ko');

  const { data: zhCount } = await supabase
    .from('blog_posts')
    .select('id', { count: 'exact', head: true })
    .eq('language', 'zh-cn');

  console.log(`\nDatabase counts:`);
  console.log(`Portuguese: ${ptCount?.length || 0} posts`);
  console.log(`Korean: ${koCount?.length || 0} posts`);
  console.log(`Chinese Simplified: ${zhCount?.length || 0} posts`);
}

main().catch(console.error);
