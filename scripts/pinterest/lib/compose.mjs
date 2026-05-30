// Shared compositing logic for Pinterest pins.
// Used by generate-pin.mjs (CLI test) and run-generation.mjs (Supabase batch runner).

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import opentype from 'opentype.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = resolve(__dirname, '../fonts');

export const FONT_INTER = resolve(FONTS_DIR, 'Inter-Variable.ttf');

export const HEADLINE_FONTS = {
  anton: { path: resolve(FONTS_DIR, 'Anton-Regular.ttf'), size: 56, lineH: 1.15, letterSpacing: 1 },
  bowlby: { path: resolve(FONTS_DIR, 'BowlbyOne-Regular.ttf'), size: 52, lineH: 1.18, letterSpacing: 0 },
  oswald: { path: resolve(FONTS_DIR, 'Oswald-Bold.woff'), size: 64, lineH: 1.12, letterSpacing: 0.5 },
};

export const CANVAS_W = 1000;
export const CANVAS_H = 1500;
export const BAND_H = 400;
export const IMAGE_W = 1000;
export const IMAGE_H = 1100;

const BG = '#111111';
const CREAM = '#F5F0E8';
const PILL_RED = '#C81400';
const PADDING_X = 40;
const HEADLINE_TO_URL_GAP = 30;
const URL_TEXT = 'mysterymaker.party';
const URL_FONT_SIZE = 22;

function measureText(font, text, fontSize, letterSpacing = 0) {
  let w = 0;
  const glyphs = font.stringToGlyphs(text);
  const scale = fontSize / font.unitsPerEm;
  for (const g of glyphs) w += g.advanceWidth * scale + letterSpacing;
  return w - (text.length ? letterSpacing : 0);
}

function wrapTextByWidth(font, text, fontSize, maxWidth, letterSpacing) {
  const words = text.toUpperCase().split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (measureText(font, next, fontSize, letterSpacing) <= maxWidth) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function textToPathData(font, text, x, baseline, fontSize, letterSpacing = 0) {
  const scale = fontSize / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(text);
  const subPaths = [];
  let cursor = x;
  for (const g of glyphs) {
    const p = g.getPath(cursor, baseline, fontSize);
    subPaths.push(p.toPathData(2));
    cursor += g.advanceWidth * scale + letterSpacing;
  }
  return subPaths.join(' ');
}

export async function buildOverlaySvg(overlayText, { font = 'oswald', pill = false } = {}) {
  const fontCfg = HEADLINE_FONTS[font];
  if (!fontCfg) throw new Error(`Unknown font ${font}`);

  const [headlineFont, interFont] = await Promise.all([
    opentype.load(fontCfg.path),
    opentype.load(FONT_INTER),
  ]);

  const headScale = fontCfg.size / headlineFont.unitsPerEm;
  const capHeight = Math.round((headlineFont.tables.os2?.sCapHeight ?? headlineFont.ascender * 0.72) * headScale);
  const headlineLineH = Math.round(fontCfg.size * fontCfg.lineH);

  const usableW = CANVAS_W - PADDING_X * 2;
  const lines = wrapTextByWidth(headlineFont, overlayText, fontCfg.size, usableW, fontCfg.letterSpacing);
  const headlineBlockH = lines.length * headlineLineH;

  const urlWidth = measureText(interFont, URL_TEXT, URL_FONT_SIZE, 0);
  const pillPadX = 18;
  const pillPadY = 10;
  const pillW = Math.ceil(urlWidth + pillPadX * 2);
  const pillH = URL_FONT_SIZE + pillPadY * 2;
  const urlH = pill ? pillH : URL_FONT_SIZE + 6;

  const totalH = headlineBlockH + HEADLINE_TO_URL_GAP + urlH;
  const padTop = Math.round((BAND_H - totalH) / 2);
  const firstBaseline = padTop + capHeight;

  const headlinePaths = lines
    .map((ln, i) => {
      const baseline = firstBaseline + i * headlineLineH;
      const d = textToPathData(headlineFont, ln, PADDING_X, baseline, fontCfg.size, fontCfg.letterSpacing);
      return `<path d="${d}" fill="${CREAM}"/>`;
    })
    .join('\n  ');

  let urlSvg;
  if (pill) {
    const pillX = PADDING_X;
    const pillY = padTop + headlineBlockH + HEADLINE_TO_URL_GAP;
    const interCap = (interFont.tables.os2?.sCapHeight ?? interFont.ascender * 0.72) * (URL_FONT_SIZE / interFont.unitsPerEm);
    const urlBaseline = pillY + pillH / 2 + interCap / 2;
    const d = textToPathData(interFont, URL_TEXT, pillX + pillPadX, urlBaseline, URL_FONT_SIZE, 0);
    urlSvg = `<rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillH / 2}" ry="${pillH / 2}" fill="${PILL_RED}"/>
  <path d="${d}" fill="${CREAM}"/>`;
  } else {
    const urlBaseline = padTop + headlineBlockH + HEADLINE_TO_URL_GAP + URL_FONT_SIZE;
    const d = textToPathData(interFont, URL_TEXT, PADDING_X, urlBaseline, URL_FONT_SIZE, 0);
    urlSvg = `<path d="${d}" fill="${CREAM}" fill-opacity="0.75"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${BAND_H}">
  ${headlinePaths}
  ${urlSvg}
</svg>`;
}

export async function callImagen4(prompt) {
  const key = process.env.IMAGEN_API_KEY;
  if (!key) throw new Error('IMAGEN_API_KEY not set in env');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${key}`;
  const body = {
    instances: [{ prompt }],
    parameters: { sampleCount: 1, aspectRatio: '1:1' },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Imagen 4 API error ${res.status}: ${txt}`);
  }

  const json = await res.json();
  const pred = json.predictions?.[0];
  const b64 = pred?.bytesBase64Encoded || pred?.image?.imageBytes;
  if (!b64) throw new Error(`No image bytes in response: ${JSON.stringify(json).slice(0, 500)}`);
  return Buffer.from(b64, 'base64');
}

// Composite a finished 1000x1500 pin from Imagen output + overlay SVG. Returns PNG buffer.
export async function composePin({ imageBuf, overlaySvg }) {
  const resizedImage = await sharp(imageBuf)
    .resize(IMAGE_W, IMAGE_H, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer();

  return await sharp({
    create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: BG },
  })
    .composite([
      { input: resizedImage, top: BAND_H, left: 0 },
      { input: Buffer.from(overlaySvg), top: 0, left: 0 },
    ])
    .png()
    .toBuffer();
}

// Extract the 1000x1000 image area from an old finished pin (cache reuse for CLI).
export async function extractImageFromFinishedPin(buffer) {
  const meta = await sharp(buffer).metadata();
  if (meta.height === CANVAS_H && meta.width === CANVAS_W) {
    return await sharp(buffer)
      .extract({ left: 0, top: CANVAS_H - CANVAS_W, width: CANVAS_W, height: CANVAS_W })
      .png()
      .toBuffer();
  }
  return buffer;
}

// Center-crop a raw 1:1 Imagen output to 1200x630 (1.91:1) for blog hero use.
// Matches Open Graph / Facebook / LinkedIn aspect; leaves room above the fold on desktop.
export async function cropToBlogHero(rawImageBuf) {
  return await sharp(rawImageBuf)
    .resize(1200, 630, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer();
}
