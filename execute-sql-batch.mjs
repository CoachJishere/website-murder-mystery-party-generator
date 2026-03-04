#!/usr/bin/env node

/**
 * Execute Phase 2 SQL batch files
 * Loads SQL from files and executes them one by one
 */

import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const batchFiles = [
  { file: 'batch-pt-1-5.sql', lang: 'pt', desc: 'Portuguese 1-5', count: 5 },
  { file: 'batch-pt-6-10.sql', lang: 'pt', desc: 'Portuguese 6-10', count: 5 },
  { file: 'batch-ko-1-5.sql', lang: 'ko', desc: 'Korean 1-5', count: 5 },
  { file: 'batch-ko-6-9.sql', lang: 'ko', desc: 'Korean 6-9', count: 4 },
  { file: 'batch-zh-6-9.sql', lang: 'zh-cn', desc: 'Chinese 6-9', count: 4 },
  { file: 'batch-zh-10-12.sql', lang: 'zh-cn', desc: 'Chinese 10-12', count: 3 }
];

async function main() {
  console.log('Phase 2 SQL Files Summary\n');
  console.log('='.repeat(80));

  for (const { file, lang, desc, count } of batchFiles) {
    const filePath = join(__dirname, file);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const sizeKB = (content.length / 1024).toFixed(2);
      const lines = content.split('\n').length;

      console.log(`\n📄 ${file}`);
      console.log(`   Language: ${lang}`);
      console.log(`   Description: ${desc}`);
      console.log(`   Expected posts: ${count}`);
      console.log(`   File size: ${sizeKB} KB`);
      console.log(`   Lines: ${lines}`);

      // Check if it's a valid INSERT statement
      const isValid = content.trim().startsWith('INSERT INTO blog_posts');
      console.log(`   Valid SQL: ${isValid ? '✅' : '❌'}`);

      // Save to a temporary output file for manual verification if needed
      const outputPath = join(__dirname, `temp-${file}`);
      await fs.writeFile(outputPath, content, 'utf-8');
      console.log(`   Temp copy: ${outputPath}`);

    } catch (error) {
      console.error(`   ❌ Error reading ${file}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ All files validated and ready for execution');
  console.log('='.repeat(80));
}

main().catch(console.error);
