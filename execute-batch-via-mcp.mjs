#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

const batchFiles = [
  'batch-pt-1-5.sql',
  'batch-pt-6-10.sql',
  'batch-ko-1-5.sql',
  'batch-ko-6-9.sql',
  'batch-zh-6-9.sql',
  'batch-zh-10-12.sql'
];

async function main() {
  for (const file of batchFiles) {
    const filePath = path.join(process.cwd(), file);
    const content = await fs.readFile(filePath, 'utf-8');

    console.log(`\n${'='.repeat(80)}`);
    console.log(`FILE: ${file}`);
    console.log(`SIZE: ${(content.length / 1024).toFixed(2)} KB`);
    console.log(`CHARS: ${content.length}`);
    console.log('='.repeat(80));

    // Print first 500 chars and last 500 chars
    console.log('\n--- FIRST 500 CHARS ---');
    console.log(content.substring(0, 500));
    console.log('\n--- LAST 500 CHARS ---');
    console.log(content.substring(content.length - 500));
    console.log('\n');
  }
}

main().catch(console.error);
