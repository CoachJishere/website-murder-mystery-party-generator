#!/usr/bin/env node

import fs from 'fs/promises';

const filename = process.argv[2] || 'batch-pt-1-5.sql';

const sql = await fs.readFile(filename, 'utf-8');
console.log(sql);
