/**
 * Homepage OG / social share image generator.
 *
 * Renders a branded 1200x630 card (brand red #C81400, cream text, Bowlby One
 * wordmark + Inter copy) with Playwright/Chromium, then optimises with sharp.
 * Output: public/images/homepage-share-image.png — the file referenced by
 * og:image / twitter:image in index.html.
 *
 * Why a designed card and not a homepage screenshot: a screenshot frames poorly
 * at 1200x630 (tiny text, nav chrome) and goes stale on every redesign; a card
 * regenerates deterministically and leads with the value prop. See the Jun 2026
 * homepage SEO work (ADR-0024) for context.
 *
 * Usage:  node scripts/generate-og-image.mjs
 * Deps:   playwright (chromium already cached), sharp.
 */

import { chromium } from 'playwright';
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BOWLBY_TTF = resolve(__dirname, 'pinterest/fonts/BowlbyOne-Regular.ttf');
const OUT_PATH = resolve(__dirname, '../public/images/homepage-share-image.png');

const W = 1200;
const H = 630;

// --- Card copy (edit here) ------------------------------------------------------
const WORDMARK = 'MYSTERY MAKER';
const HEADLINE = 'Murder mystery parties, personalized for your guests';
const SUBLINE =
  'Custom kits for any theme — characters, clues & a printable host guide, ready in minutes.';
const FOOTER = 'mysterymaker.party';

// --- Brand -----------------------------------------------------------------------
const RED = '#C81400';
const RED_DEEP = '#A01000';
const CREAM = '#F5F0E8';

function buildHtml() {
  const bowlbyB64 = readFileSync(BOWLBY_TTF).toString('base64');
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&display=swap" rel="stylesheet">
<style>
  @font-face {
    font-family: 'Bowlby One';
    src: url(data:font/ttf;base64,${bowlbyB64}) format('truetype');
    font-display: block;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; }
  .card {
    width:${W}px; height:${H}px; position:relative; overflow:hidden;
    background: radial-gradient(120% 120% at 0% 0%, ${RED} 55%, ${RED_DEEP} 100%);
    color:${CREAM}; font-family:'Inter',-apple-system,Segoe UI,Roboto,sans-serif;
    padding:72px 80px; display:flex; flex-direction:column; justify-content:center;
  }
  /* faint oversized magnifier-style ring for depth, clipped off-edge */
  .ring {
    position:absolute; right:-130px; bottom:-150px; width:520px; height:520px;
    border:36px solid rgba(245,240,232,0.07); border-radius:50%;
  }
  .wordmark {
    font-family:'Bowlby One'; font-size:34px; letter-spacing:3px;
    color:${CREAM}; opacity:0.92; margin-bottom:30px;
  }
  .headline {
    font-weight:800; font-size:60px; line-height:1.08; letter-spacing:-1px;
    max-width:1010px;
  }
  .subline {
    font-weight:500; font-size:27px; line-height:1.4; margin-top:26px;
    max-width:980px; opacity:0.94;
  }
  .footer {
    position:absolute; left:80px; bottom:46px;
    font-weight:700; font-size:23px; letter-spacing:0.3px; opacity:0.9;
  }
</style></head>
<body>
  <div class="card">
    <div class="ring"></div>
    <div class="wordmark">${WORDMARK}</div>
    <div class="headline">${HEADLINE}</div>
    <div class="subline">${SUBLINE}</div>
    <div class="footer">${FOOTER}</div>
  </div>
</body></html>`;
}

async function main() {
  // Default launch uses Playwright's managed browser (CI installs it via
  // `npx playwright install chromium`). Locally, point at an already-cached build
  // with PLAYWRIGHT_EXECUTABLE_PATH to avoid a re-download.
  const execPath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  const browser = await chromium.launch(execPath ? { executablePath: execPath } : {});
  const page = await browser.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2, // retina, downsampled below for crisp text
  });
  await page.setContent(buildHtml(), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const raw = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
  await browser.close();

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  await sharp(raw)
    .resize(W, H, { fit: 'fill' }) // 2x -> 1x downsample
    .png({ compressionLevel: 9 })
    .toFile(OUT_PATH);

  console.log(`Wrote ${OUT_PATH} (${W}x${H})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
