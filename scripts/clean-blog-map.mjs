#!/usr/bin/env node
/**
 * One-shot cleaner for blog_map.xlsx — the source-of-truth spreadsheet.
 *
 * Applies the shared brand-leak sanitizer + Last-updated date bump to
 * every text cell. Brings the xlsx in line with the cleaned DB so the
 * source and the published content stop drifting. The runtime sanitizer
 * in sync-blog-map.mjs catches rot at DB-write time even if you skip
 * this; running this script just makes the xlsx itself clean.
 *
 * Usage:
 *   node scripts/clean-blog-map.mjs           # writes blog_map.xlsx in place
 *   node scripts/clean-blog-map.mjs --dry     # report changes, no write
 *
 * Always copies the original to blog_map.xlsx.bak.<timestamp> before
 * overwriting. Restore with `mv blog_map.xlsx.bak.<ts> blog_map.xlsx`.
 *
 * Cell-value handling:
 *   - Plain strings: sanitized in place.
 *   - exceljs rich-text cells ({ richText: [...] }): each run sanitized
 *     individually so bold/italic formatting is preserved.
 *   - Other types (numbers, formulas, nulls): skipped untouched.
 */
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { copyFileSync, existsSync } from 'fs';
import { sanitizeAndBump } from './_brand-sanitizer.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const xlsxPath = join(__dirname, '..', 'blog_map.xlsx');
const dryRun = process.argv.includes('--dry');

// [titleCol, contentCol, metaCol, langCode] — must match sync-blog-map.mjs.
const LANGS = [
  [4, 5, 6, 'en'],
  [8, 9, 10, 'es'],
  [12, 13, 14, 'fr'],
  [16, 17, 18, 'de'],
  [20, 21, 22, 'it'],
  [24, 25, 26, 'da'],
  [28, 29, 30, 'fi'],
  [32, 33, 34, 'nl'],
  [36, 37, 38, 'sv'],
  [40, 41, 42, 'pt'],
  [44, 45, 46, 'ko'],
  [48, 49, 50, 'ja'],
  [52, 53, 54, 'zh-cn'],
];

function applyToCell(cell, lang, isContentCol) {
  const v = cell.value;
  if (v == null) return false;
  const langForBump = isContentCol ? lang : null;

  if (typeof v === 'string') {
    const cleaned = sanitizeAndBump(v, langForBump);
    if (cleaned === v) return false;
    if (!dryRun) cell.value = cleaned;
    return true;
  }

  if (typeof v === 'object' && Array.isArray(v.richText)) {
    let changed = false;
    const newRuns = v.richText.map(run => {
      if (typeof run.text !== 'string') return run;
      const cleaned = sanitizeAndBump(run.text, langForBump);
      if (cleaned === run.text) return run;
      changed = true;
      return { ...run, text: cleaned };
    });
    if (!changed) return false;
    if (!dryRun) cell.value = { richText: newRuns };
    return true;
  }

  return false;
}

async function main() {
  if (!existsSync(xlsxPath)) {
    console.error(`Missing ${xlsxPath}`);
    process.exit(1);
  }

  if (!dryRun) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${xlsxPath}.bak.${stamp}`;
    copyFileSync(xlsxPath, backupPath);
    console.log(`Backed up original to ${backupPath}`);
  } else {
    console.log('(dry run — no backup, no write)');
  }

  console.log(`Reading ${xlsxPath}...`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);
  const ws = workbook.getWorksheet(1);

  let cellsScanned = 0;
  let cellsChanged = 0;
  const perLang = new Map();

  for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
    const row = ws.getRow(rowNum);
    for (const [titleCol, contentCol, metaCol, lang] of LANGS) {
      for (const col of [titleCol, contentCol, metaCol]) {
        const cell = row.getCell(col);
        cellsScanned++;
        if (applyToCell(cell, lang, col === contentCol)) {
          cellsChanged++;
          perLang.set(lang, (perLang.get(lang) || 0) + 1);
        }
      }
    }
  }

  console.log(`\nCells scanned: ${cellsScanned}`);
  console.log(`Cells changed: ${cellsChanged}`);
  console.log('Per language:');
  for (const lang of LANGS.map(l => l[3])) {
    console.log(`  ${lang.padEnd(6)} ${perLang.get(lang) || 0}`);
  }

  if (dryRun) {
    console.log('\n(dry run — no file written)');
    return;
  }

  console.log(`\nWriting cleaned xlsx to ${xlsxPath}...`);
  await workbook.xlsx.writeFile(xlsxPath);
  console.log('Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
