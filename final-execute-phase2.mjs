#!/usr/bin/env node

/**
 * Final Phase 2 Execution Script
 * Reads SQL batch files and executes them using psql directly
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection details (from Supabase)
const DB_HOST = 'db.mhfikaomkmqcndqfohbp.supabase.co';
const DB_PORT = '5432';
const DB_NAME = 'postgres';
const DB_USER = 'postgres';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;

if (!DB_PASSWORD) {
  console.error('❌ Database password not set. Please set SUPABASE_DB_PASSWORD or DB_PASSWORD environment variable.');
  process.exit(1);
}

const batchFiles = [
  { file: 'batch-pt-1-5.sql', desc: 'Portuguese 1-5', lang: 'pt', count: 5 },
  { file: 'batch-pt-6-10.sql', desc: 'Portuguese 6-10', lang: 'pt', count: 5 },
  { file: 'batch-ko-1-5.sql', desc: 'Korean 1-5', lang: 'ko', count: 5 },
  { file: 'batch-ko-6-9.sql', desc: 'Korean 6-9', lang: 'ko', count: 4 },
  { file: 'batch-zh-6-9.sql', desc: 'Chinese 6-9', lang: 'zh-cn', count: 4 },
  { file: 'batch-zh-10-12.sql', desc: 'Chinese 10-12', lang: 'zh-cn', count: 3 }
];

function executePsql(sqlFile) {
  return new Promise((resolve, reject) => {
    const psql = spawn('psql', [
      '-h', DB_HOST,
      '-p', DB_PORT,
      '-U', DB_USER,
      '-d', DB_NAME,
      '-f', sqlFile,
      '--set', 'ON_ERROR_STOP=on'
    ], {
      env: {
        ...process.env,
        PGPASSWORD: DB_PASSWORD
      }
    });

    let stdout = '';
    let stderr = '';

    psql.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    psql.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    psql.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`psql exited with code ${code}\n${stderr}`));
      }
    });
  });
}

async function main() {
  console.log('\n🚀 Phase 2: Direct PostgreSQL Execution via psql');
  console.log(`⏰ Started: ${new Date().toLocaleString()}`);
  console.log('='.repeat(80));

  let successCount = 0;
  const results = [];

  for (const { file, desc, lang, count } of batchFiles) {
    const filePath = join(__dirname, file);

    console.log(`\n📄 Executing: ${desc}`);
    console.log(`   File: ${file}`);
    console.log(`   Language: ${lang}`);
    console.log(`   Expected posts: ${count}`);

    try {
      const fileStats = await fs.stat(filePath);
      console.log(`   Size: ${(fileStats.size / 1024).toFixed(2)} KB`);

      const output = await executePsql(filePath);
      console.log(`✅ Successfully executed ${file}`);

      if (output) {
        console.log(`   Output: ${output.trim().substring(0, 200)}...`);
      }

      successCount++;
      results.push({ file, desc, success: true });

    } catch (error) {
      console.error(`❌ Error executing ${file}:`, error.message);
      results.push({ file, desc, success: false, error: error.message });
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 EXECUTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`   Successful: ${successCount}/${batchFiles.length}`);
  console.log(`   Failed: ${batchFiles.length - successCount}`);

  if (successCount < batchFiles.length) {
    console.log('\n❌ Failed executions:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.file}: ${r.error}`);
    });
  }

  console.log(`\n✨ Phase 2 Execution Complete`);
  console.log(`⏰ Finished: ${new Date().toLocaleString()}`);
  console.log('='.repeat(80)\n);
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
