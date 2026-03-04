#!/usr/bin/env node

import fs from 'fs/promises';

async function main() {
  const sql = await fs.readFile('batch-pt-1-5.sql', 'utf-8');

  // Output for Claude to use
  console.log('SQL_CONTENT_START');
  console.log(sql);
  console.log('SQL_CONTENT_END');
}

main().catch(console.error);
