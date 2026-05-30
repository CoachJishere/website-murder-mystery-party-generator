// One-shot mockup generator for blog hero image — emits aspect comparisons
// and in-context (desktop + mobile) previews for a given raw 1:1 image.
//
// Usage:
//   node scripts/pinterest/make-blog-mockups.mjs <raw-image-path> [--out-dir <dir>]

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import opentype from 'opentype.js';
import { FONT_INTER, HEADLINE_FONTS } from './lib/compose.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ASPECTS = {
  square:    { label: '1:1 (1024×1024 native, no crop)',          w: 1024, h: 1024 },
  og:        { label: '1.91:1 / 1200×630 (OG / Facebook / LinkedIn)', w: 1200, h: 630 },
  three_two: { label: '3:2 / 1200×800 (less aggressive crop)',    w: 1200, h: 800 },
};

const PALETTE = {
  pageBg:    '#F4F1EC',
  cardBg:    '#FFFFFF',
  text:      '#111111',
  muted:     '#6B6B6B',
  accent:    '#C81400',
};

async function cropToAspect(srcBuffer, w, h) {
  return sharp(srcBuffer)
    .resize(w, h, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer();
}

function escXml(s) { return s.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c])); }

function measureLine(font, text, fontSize, letterSpacing = 0) {
  const scale = fontSize / font.unitsPerEm;
  let w = 0;
  for (const g of font.stringToGlyphs(text)) w += g.advanceWidth * scale + letterSpacing;
  return w - (text.length ? letterSpacing : 0);
}

function wrapToWidth(font, text, fontSize, maxW, letterSpacing = 0) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (measureLine(font, next, fontSize, letterSpacing) <= maxW) cur = next;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

async function textPath(font, text, x, baseline, fontSize, fill, letterSpacing = 0) {
  const scale = fontSize / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(text);
  const subPaths = [];
  let cursor = x;
  for (const g of glyphs) {
    subPaths.push(g.getPath(cursor, baseline, fontSize).toPathData(2));
    cursor += g.advanceWidth * scale + letterSpacing;
  }
  return `<path d="${subPaths.join(' ')}" fill="${fill}"/>`;
}

async function buildBlogMockup({ imageBuf, viewportW, viewportH, columnW, imageH, h1, body }) {
  const cardX = (viewportW - columnW) / 2;
  const cardPadX = 0;
  const imgX = cardX + cardPadX;
  const imgY = 60;
  const imgW = columnW;

  const inter = await opentype.load(FONT_INTER);
  const oswald = await opentype.load(HEADLINE_FONTS.oswald.path);

  // Resize the cropped image to fit the column width (preserve aspect).
  const srcMeta = await sharp(imageBuf).metadata();
  const scaledH = Math.round(srcMeta.height * (imgW / srcMeta.width));
  const resizedImage = await sharp(imageBuf).resize(imgW, scaledH, { fit: 'fill' }).png().toBuffer();

  // Round the image corners (Sharp doesn't do rounded directly, use SVG mask).
  const cornerR = 12;
  const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${scaledH}"><rect width="${imgW}" height="${scaledH}" rx="${cornerR}" ry="${cornerR}" fill="#fff"/></svg>`;
  const roundedImage = await sharp(resizedImage)
    .composite([{ input: Buffer.from(maskSvg), blend: 'dest-in' }])
    .png()
    .toBuffer();

  // H1 — Oswald 700, wrapped to column width.
  const h1Size = viewportW < 600 ? 30 : 44;
  const h1LineH = Math.round(h1Size * 1.1);
  const h1Lines = wrapToWidth(oswald, h1.toUpperCase(), h1Size, imgW, 0.5);
  const h1Top = imgY + scaledH + 56;
  const h1Paths = await Promise.all(
    h1Lines.map((ln, i) => textPath(oswald, ln, imgX, h1Top + i * h1LineH, h1Size, PALETTE.accent, 0.5))
  );
  const h1Y = h1Top + (h1Lines.length - 1) * h1LineH;

  // Body — Inter 18px / 16px mobile, two lines fake.
  const bodySize = viewportW < 600 ? 16 : 18;
  const bodyLineH = bodySize * 1.55;
  const bodyY = h1Y + 36;
  const bodyLines = body.split('\n');
  const bodyPaths = bodyLines.map((ln, i) =>
    textPath(inter, ln, imgX, bodyY + i * bodyLineH, bodySize, PALETTE.text)
  );
  const resolvedBodyPaths = await Promise.all(bodyPaths);

  // "Featured" caption above image — small muted label.
  const capSize = 12;
  const capY = imgY - 18;
  const capPath = await textPath(inter, 'BLOG · 1920S', imgX, capY, capSize, PALETTE.muted, 1);

  const overlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${viewportW}" height="${viewportH}">
  <rect width="${viewportW}" height="${viewportH}" fill="${PALETTE.pageBg}"/>
  <rect x="${cardX}" y="0" width="${columnW}" height="${viewportH}" fill="${PALETTE.cardBg}"/>
  ${capPath}
  ${h1Paths.join('\n  ')}
  ${resolvedBodyPaths.join('\n  ')}
</svg>`;

  return await sharp(Buffer.from(overlaySvg))
    .composite([{ input: roundedImage, top: imgY, left: imgX }])
    .png()
    .toBuffer();
}

async function main() {
  const argv = process.argv.slice(2);
  const srcPath = argv.find(a => !a.startsWith('--'));
  if (!srcPath) throw new Error('Usage: node make-blog-mockups.mjs <raw-image-path>');
  const outDir = resolve(__dirname, 'out/blog-mockups');
  await mkdir(outDir, { recursive: true });

  const raw = await readFile(resolve(srcPath));
  const stem = basename(srcPath, '.png').replace(/\.raw$/, '');

  // 1. Aspect comparison crops.
  for (const [key, cfg] of Object.entries(ASPECTS)) {
    const cropped = await cropToAspect(raw, cfg.w, cfg.h);
    const out = resolve(outDir, `${stem}-${key}-${cfg.w}x${cfg.h}.png`);
    await writeFile(out, cropped);
    console.log(`✓ ${key} (${cfg.label}) → ${out}`);
  }

  // 2. In-context mockups (using OG 1.91:1 crop as the picked default).
  const ogCrop = await cropToAspect(raw, 1200, 630);

  const desktopCol = 760;
  const desktopBuf = await buildBlogMockup({
    imageBuf: ogCrop,
    viewportW: 1200,
    viewportH: 900,
    columnW: desktopCol,
    h1: 'How to Host a 1920s Speakeasy Murder Mystery',
    body: 'Planning a Roaring Twenties dinner party and want it to feel like a real speakeasy?\nThe secret is in the details — dim lighting, jazz, cocktail coupes, and giving every',
  });
  await writeFile(resolve(outDir, `${stem}-desktop-mockup.png`), desktopBuf);
  console.log(`✓ desktop mockup`);

  const mobileBuf = await buildBlogMockup({
    imageBuf: ogCrop,
    viewportW: 390,
    viewportH: 700,
    columnW: 358, // 390 - 16*2
    h1: 'How to Host a 1920s Speakeasy Murder Mystery',
    body: 'Planning a Roaring Twenties\ndinner party and want it to\nfeel like a real speakeasy?',
  });
  await writeFile(resolve(outDir, `${stem}-mobile-mockup.png`), mobileBuf);
  console.log(`✓ mobile mockup`);
}

main().catch(err => { console.error('✗', err.message); process.exit(1); });
