// One-shot generator for the email wordmark.
//
// Renders "MYSTERY MAKER" in Bowlby One at retina resolution against a
// transparent background, in brand cream (#F5F0E8). Drops the PNG at
// public/email-assets/wordmark-cream.png so it ships with the Vercel static
// build and is served at https://www.mysterymaker.party/email-assets/...
//
// Usage:  node scripts/generate-email-wordmark.mjs

import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import opentype from 'opentype.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONT_PATH = resolve(__dirname, 'pinterest/fonts/BowlbyOne-Regular.ttf');
const OUT_PATH = resolve(__dirname, '../public/email-assets/wordmark-cream.png');

const TEXT = 'MYSTERY MAKER';
const CREAM = '#F5F0E8';

// Canvas auto-fits text width + margin. We render at retina-friendly height so
// the wordmark stays crisp when displayed at 200px wide in email clients.
const FONT_SIZE = 88;
const LETTER_SPACING = 3;
const CANVAS_H = 160;
const MARGIN_X = 16;

function measureText(font, text, fontSize, letterSpacing) {
  const glyphs = font.stringToGlyphs(text);
  const scale = fontSize / font.unitsPerEm;
  let w = 0;
  for (const g of glyphs) w += g.advanceWidth * scale + letterSpacing;
  return w - (text.length ? letterSpacing : 0);
}

function textToPath(font, text, x, baseline, fontSize, letterSpacing) {
  const scale = fontSize / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(text);
  const parts = [];
  let cursor = x;
  for (const g of glyphs) {
    parts.push(g.getPath(cursor, baseline, fontSize).toPathData(2));
    cursor += g.advanceWidth * scale + letterSpacing;
  }
  return parts.join(' ');
}

async function main() {
  const font = await opentype.load(FONT_PATH);

  const textWidth = measureText(font, TEXT, FONT_SIZE, LETTER_SPACING);
  const scale = FONT_SIZE / font.unitsPerEm;
  const capHeight = (font.tables.os2?.sCapHeight ?? font.ascender * 0.72) * scale;

  const canvasW = Math.ceil(textWidth + MARGIN_X * 2);
  const x = (canvasW - textWidth) / 2;
  const baseline = (CANVAS_H + capHeight) / 2;

  const d = textToPath(font, TEXT, x, baseline, FONT_SIZE, LETTER_SPACING);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${CANVAS_H}" viewBox="0 0 ${canvasW} ${CANVAS_H}">
  <path d="${d}" fill="${CREAM}"/>
</svg>`;

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, palette: false })
    .toFile(OUT_PATH);

  const { size } = await stat(OUT_PATH);
  console.log(`Wrote ${OUT_PATH} (${(size / 1024).toFixed(1)} KB, ${canvasW}x${CANVAS_H})`);
  if (size > 30 * 1024) console.warn(`Warning: file exceeds 30 KB budget`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
