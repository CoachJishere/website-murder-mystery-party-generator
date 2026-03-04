#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const supabaseUrl = 'https://mhfikaomkmqcndqfohbp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const batchFiles = [
  'batch-pt-1-5.sql',
  'batch-pt-6-10.sql',
  'batch-ko-1-5.sql',
  'batch-ko-6-9.sql',
  'batch-zh-6-9.sql',
  'batch-zh-10-12.sql'
];

async function executeBatchFile(filename) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Executing: ${filename}`);
  console.log('='.repeat(60));

  try {
    const filePath = path.join(process.cwd(), filename);
    const sqlContent = await fs.readFile(filePath, 'utf-8');

    console.log(`File size: ${(sqlContent.length / 1024).toFixed(2)} KB`);

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sqlContent
    });

    if (error) {
      // Try direct execution if rpc fails
      console.log('RPC method failed, trying direct execution...');
      const { data: directData, error: directError } = await supabase
        .from('blog_posts')
        .insert([]);  // This won't work for raw SQL

      // Try using the SQL editor approach
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ sql_query: sqlContent })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      console.log(`✅ ${filename} executed successfully (via fetch)`);
    } else {
      console.log(`✅ ${filename} executed successfully`);
      if (data) {
        console.log('Result:', JSON.stringify(data, null, 2));
      }
    }
  } catch (err) {
    console.error(`❌ Error executing ${filename}:`, err.message);
    return false;
  }

  return true;
}

async function verifyInsertions() {
  console.log('\n' + '='.repeat(60));
  console.log('VERIFYING INSERTIONS');
  console.log('='.repeat(60));

  const languages = ['pt', 'ko', 'zh-cn'];

  for (const lang of languages) {
    const { count, error } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .eq('language', lang);

    if (error) {
      console.error(`Error counting ${lang} posts:`, error.message);
    } else {
      console.log(`${lang.toUpperCase()}: ${count} posts`);
    }
  }
}

async function main() {
  console.log('Phase 2 Batch Execution Starting...\n');

  let successCount = 0;

  for (const file of batchFiles) {
    const success = await executeBatchFile(file);
    if (success) {
      successCount++;
    }
    // Wait a bit between executions
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(60));
  console.log(`EXECUTION COMPLETE: ${successCount}/${batchFiles.length} files successful`);
  console.log('='.repeat(60));

  // Verify final counts
  await verifyInsertions();
}

main().catch(console.error);
