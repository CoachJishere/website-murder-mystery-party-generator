#!/usr/bin/env node

/**
 * Execute Phase 2 SQL batches using node-postgres (pg) library
 */

import pg from 'pg';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connection string from environment or construct from parts
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL or SUPABASE_DB_URL environment variable required');
  console.error('   Format: postgres://postgres:[PASSWORD]@db.mhfikaomkmqcndqfohbp.supabase.co:5432/postgres');
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

async function executeSQL(client, sqlFile, desc) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📄 Executing: ${desc}`);
  console.log(`   File: ${sqlFile}`);

  try {
    const filePath = join(__dirname, sqlFile);
    const sqlContent = await fs.readFile(filePath, 'utf-8');
    const sizeKB = (sqlContent.length / 1024).toFixed(2);

    console.log(`   Size: ${sizeKB} KB`);
    console.log(`   Executing...`);

    const result = await client.query(sqlContent);

    console.log(`✅ Success!`);
    if (result.rowCount !== null) {
      console.log(`   Rows affected: ${result.rowCount}`);
    }

    return true;

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    if (error.detail) {
      console.error(`   Detail: ${error.detail}`);
    }
    return false;
  }
}

async function verifyCounts(client) {
  console.log(`\n${'='.repeat(80)}`);
  console.log('🔍 VERIFYING POST COUNTS');
  console.log('='.repeat(80));

  const languages = [
    { code: 'pt', name: 'Portuguese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh-cn', name: 'Chinese' }
  ];

  const counts = {};

  for (const { code, name } of languages) {
    try {
      const result = await client.query(
        'SELECT COUNT(*) FROM blog_posts WHERE language = $1 AND status = $2',
        [code, 'published']
      );

      const count = parseInt(result.rows[0].count, 10);
      counts[code] = count;
      console.log(`   ${name} (${code}): ${count} posts`);

    } catch (error) {
      console.error(`   ❌ Error counting ${name}:`, error.message);
      counts[code] = 0;
    }
  }

  return counts;
}

async function main() {
  console.log('\n🚀 Phase 2: SQL Execution via node-postgres');
  console.log(`⏰ Started: ${new Date().toLocaleString()}`);
  console.log('='.repeat(80));

  const client = new Client({ connectionString });

  try {
    console.log('\n🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!');

    let successCount = 0;

    for (const { file, desc, lang, count } of batchFiles) {
      const success = await executeSQL(client, file, desc);
      if (success) successCount++;

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 EXECUTION SUMMARY');
    console.log('='.repeat(80));
    console.log(`   Successful: ${successCount}/${batchFiles.length}`);
    console.log(`   Failed: ${batchFiles.length - successCount}`);

    // Verify counts
    const counts = await verifyCounts(client);

    console.log(`\n${'='.repeat(80)}`);
    console.log('✨ Phase 2 Complete');
    console.log(`⏰ Finished: ${new Date().toLocaleString()}`);
    console.log(`📈 Total new posts: ${counts.pt + counts.ko + counts['zh-cn']}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);

  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed\n');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
