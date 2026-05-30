// Pinterest pin generator — standalone test script.
//
// Usage:
//   node scripts/pinterest/generate-pin.mjs \
//     --prompt "A dimly lit 1920s speakeasy table set for a dinner party..." \
//     --overlay "How to Host a 1920s Speakeasy Murder Mystery" \
//     --out scripts/pinterest/out/speakeasy.png
//
// Reuse a previously generated raw image (avoids re-charging Imagen):
//   node scripts/pinterest/generate-pin.mjs \
//     --image scripts/pinterest/out/speakeasy.raw.png \
//     --overlay "How to Host..."

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import {
  HEADLINE_FONTS,
  buildOverlaySvg,
  callImagen4,
  composePin,
  extractImageFromFinishedPin,
} from './lib/compose.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith('--')) {
      args[k.slice(2)] = argv[i + 1];
      i++;
    }
  }
  if (!args.overlay) throw new Error('Missing --overlay');
  if (!args.prompt && !args.image) throw new Error('Need --prompt (call Imagen) or --image <path> (reuse PNG)');
  args.font = args.font || 'oswald';
  if (!HEADLINE_FONTS[args.font]) throw new Error(`Unknown --font ${args.font}; choose: ${Object.keys(HEADLINE_FONTS).join(', ')}`);
  args.pill = args.pill === 'true';
  args.out = args.out || resolve(__dirname, 'out/pin.png');
  return args;
}

async function main() {
  const { prompt, overlay, out, image, font, pill } = parseArgs();
  const outPath = resolve(out);

  let imageBuf;
  if (image) {
    console.log(`→ Reusing image from ${image}`);
    imageBuf = await extractImageFromFinishedPin(await readFile(resolve(image)));
  } else {
    console.log('→ Calling Imagen 4...');
    console.log('  prompt:', prompt.slice(0, 100) + (prompt.length > 100 ? '...' : ''));
    imageBuf = await callImagen4(prompt);
    console.log(`  got ${imageBuf.length} bytes`);
    const cachePath = outPath.replace(/\.png$/, '.raw.png');
    await mkdir(dirname(cachePath), { recursive: true });
    await writeFile(cachePath, imageBuf);
    console.log(`  cached raw to ${cachePath}`);
  }

  console.log(`→ Building overlay SVG (font=${font}, pill=${pill})...`);
  const overlaySvg = await buildOverlaySvg(overlay, { font, pill });

  console.log('→ Compositing...');
  const final = await composePin({ imageBuf, overlaySvg });

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, final);
  console.log(`✓ Wrote ${outPath}`);
}

main().catch((err) => {
  console.error('✗', err.message);
  process.exit(1);
});
