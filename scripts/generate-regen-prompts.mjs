#!/usr/bin/env node
/**
 * Generate one ready-to-paste regeneration prompt per failing cell from
 * the rot-audit CSV. Each prompt is a self-contained brief for a fresh
 * Claude Code conversation that regenerates a single (slug, lang) cell
 * in-place via the Supabase REST API, smoke-tests against the rot-signal
 * gate, and re-verifies from the live row.
 *
 * Usage:
 *   node scripts/generate-regen-prompts.mjs <path-to-rot-audit.csv> [--status=published]
 *
 * Default scope: status=published (the 36 cells live on the site).
 * Pass --status=draft to generate prompts for the draft queue instead
 * (those are the ~400 cells the daily-publish gate is holding back).
 *
 * Output: temp-files/regen-prompts/<slug>__<lang>.md (one file per cell)
 * Plus: temp-files/regen-prompts/INDEX.md (checklist with priorities)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LENGTH_FLOORS } from './check-rot-signals.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('usage: generate-regen-prompts.mjs <csv-path> [--status=<filter>]');
  process.exit(1);
}
const statusArg = process.argv.find(a => a.startsWith('--status='));
const statusFilter = statusArg ? statusArg.split('=')[1] : 'published';

const TODAY = new Date().toISOString().slice(0, 10);

const LANG_NAME = { ko: 'Korean', 'zh-cn': 'Simplified Chinese' };
const LANG_TARGET = {
  ko:    { low: 9000, high: 10000, median: 8959 },
  'zh-cn': { low: 6500, high: 7500, median: 6520 },
};

// Style rules block per language — these are the exact patterns the gate
// flags, plus narrative guidance that gives the translator a clear target.
const KO_STYLE_RULES = `**KO-specific style rules** (these matter — they are exactly what the gate flags):

* H2s must be noun phrases or \`~하는 법\` / \`~하는 방법\` patterns. **NEVER** end an H2 with declarative endings: \`합니다\`, \`입니다\`, \`있습니다\`, \`됩니다\`, \`습니다\`, \`합니까\`, \`입니까\`. Healthy form examples: \`## 무엇이 잘못되는지 이해하기\`, \`## 클루를 효과적으로 배치하는 방법\`.
* **DROP explicit pronouns** in headings: \`그들이\`, \`그것이\`, \`그것을\`, \`그들을\`, \`그들의\`, \`그것의\`. Korean handles these implicitly via verb endings and context. The rotted MT pipeline transliterated English pronouns; your translation must not.
* Body prose should flow as natural Korean — particles (-이/가, -은/는, -을/를, -에서, -에) in their natural distribution. Avoid English word-order calque'd into Korean. Read each paragraph aloud mentally: if it sounds like English wearing Korean clothing, rewrite.
* Use connectives sparingly. Korean prefers verb-ending connection (-고, -며, -지만, -아서/어서) over discrete conjunctions like \`그리고/그러나\`.`;

const ZH_STYLE_RULES = `**ZH-CN-specific style rules**:

* H2s should be concise noun phrases (\`如何解决文化敏感性问题\`) or question-style (\`什么是包容性谜案体验？\`). Avoid literal English-syntax constructions translated word-for-word.
* **Length matters most here.** The dominant ZH-CN failure mode is truncation. CJK density does not justify cutting content. If a section is 300 words of English, write the Chinese equivalent — don't compress.
* Use natural Chinese sentence rhythm. Short sentences are fine but each should feel like Chinese prose, not hanzi-stamped English. Read each paragraph: if it parses as "[English subject] [English verb pattern] [English object pattern]" with Chinese vocabulary, rewrite.
* Brand mentions in body prose: \`Mystery Maker\` is acceptable since the brand is English-origin. But never let \`mysterymaker.party\` (the URL form) sit in body or heading text.`;

function buildPrompt({ slug, lang, length, reasons }) {
  const floor = LENGTH_FLOORS[lang];
  const target = LANG_TARGET[lang];
  const langName = LANG_NAME[lang];
  const styleRules = lang === 'ko' ? KO_STYLE_RULES : ZH_STYLE_RULES;
  const langLabel = `\`${lang}\``;

  return `You are working in /Users/jonathanmiller/CascadeProjects/website-murder-mystery-party-generator-main, a Vite + TypeScript + Supabase blog generator. Today is ${TODAY}.

**Task**: regenerate the **${langName} (${langLabel})** translation of one already-published blog post so it passes the project's rot-signal gate at \`scripts/check-rot-signals.mjs\`. This is regeneration-in-place: keep slug/title/meta_description/structure stable; only \`content\` changes.

**Slug**: \`${slug}\`
**Target language**: \`${lang}\`
**Current rot**: ${reasons}
**Current length**: ${length} chars
**Length floor**: ${floor} chars (must clear this)
**Length target**: ${target.low}–${target.high} chars (median of healthy ${lang} passes is ${target.median}; aim near or above)

## Background

An upstream MT pipeline produced rotted ko + zh-cn output across the blog queue. Five rot signals are encoded in \`scripts/check-rot-signals.mjs\`: length floor, brand-as-H2 (\`mysterymaker.party\` literal in a heading), URL-as-H2, untranslated English run in heading, plus ko-specific calques (sentence-final declarative H2 endings + explicit pronouns in H2s). This cell is one of 36 already-published cells that fail the gate; we are regenerating them in place.

## Steps

1. **Load credentials.** The repo \`.env\` has \`VITE_SUPABASE_URL\` and \`SUPABASE_SERVICE_ROLE_KEY\`. Use those as your \`SUPABASE_URL\` / \`SUPABASE_SERVICE_KEY\` for REST calls.

2. **Fetch the EN source** — this is your canonical scope:
   \`\`\`
   GET \${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${slug}&language=eq.en&select=content,title,meta_description
   \`\`\`
   Read it carefully. Your ${langName} translation must cover the same H2s in the same order, link to the same internal pages, convey the same information.

3. **Fetch the current rotted ${lang} content** for negative-example context only (do NOT translate from it):
   \`\`\`
   GET \${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${slug}&language=eq.${lang}&select=content
   \`\`\`

4. **Draft fresh ${langName} content** that:
   - Preserves the H1 and every H2 from the EN source, in order. Heading text translates; markdown structure stays.
   - Covers the full EN scope. Hit ${target.low}–${target.high} chars; do not truncate sections.
   - Avoids these rot patterns:
     * No \`mysterymaker.party\` literal in any H2.
     * No domain-like patterns (\`xxx.com\`/\`.party\`/etc.) in any heading.
     * No 5+ consecutive English words in any heading (brand mentions OK).

   **Link and anchor conventions** (this matters — site-wide convention differs from EN source):

   * **Cross-cell links** to other blog posts: EN source writes \`[text](/blog/<en-slug>)\`. Your translation must write \`[text](/${lang}/blog/<en-slug>)\` — prefix \`/blog/\` with \`/${lang}\` so the reader stays in ${langName}. The slug itself stays English/kebab-case. Bracketed link text translates.
   * **Same-page TOC anchors**: EN source uses kebab-case English (e.g. \`[Step 2](#whats-actually-happening-when-this-breaks)\`). Your translation must translate the anchor text to match your translated heading, kebab-case in the target language. Example: if your translated H2 is \`## 무엇이 잘못되는지\`, the corresponding TOC link becomes \`[…](#무엇이-잘못되는지)\`. Site-wide convention (both ko and zh-cn) follows this — verify by inspecting any healthy ${lang} cell.
   * **External links** (\`https://...\`): URL stays exact, only bracketed text translates.
   * **Image markdown** \`![alt](src)\`: alt text translates, src URL stays exact.
   * Anchor-to-heading consistency: every \`#xxx\` link in your content must point to an H2 whose translated text slugifies to \`xxx\` in target-language kebab-case. Mismatches produce dead TOC clicks.

   ${styleRules}

5. **Smoke-test BEFORE writing to DB.** Run this in Node:
   \`\`\`js
   import { checkLanguage } from './scripts/check-rot-signals.mjs';
   const draft = \`... your ${lang} content ...\`;
   const result = checkLanguage('${lang}', draft);
   console.log(result);
   // Must show pass: true. If not, revise until it does.
   \`\`\`

6. **UPSERT to Supabase**:
   \`\`\`
   PATCH \${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${slug}&language=eq.${lang}
   Headers: apikey, Authorization: Bearer <key>, Content-Type: application/json, Prefer: return=minimal
   Body: JSON.stringify({ content: draft })
   \`\`\`
   Expect HTTP 204. Any other status → stop and report.

7. **Re-verify from the live row**:
   \`\`\`
   node scripts/check-rot-signals.mjs ${slug}
   \`\`\`
   Confirm \`${lang}.pass = true\` and \`${lang}.length >= ${floor}\`.

## Report back (concise)

- Old length / new length / target
- Gate verdict pre-write and post-write
- The first 3 H2s of your new translation, verbatim
- Any issues encountered

## Discipline

- ONE DB write only (the PATCH). No new files, no git commits, no other slug/lang/table changes.
- Do NOT use Python, regex, or bulk find/replace. This is a single thoughtful translation by you.
- Do NOT modify \`scripts/check-rot-signals.mjs\` or the workflow YAML.
- If you can't get the gate to pass after 3 revisions, STOP and report what's blocking.
- Treat the EN source as canonical scope.
`;
}

// Parse CSV with quoted fields containing commas.
function parseCsv(text) {
  const lines = text.split('\n').filter(l => l.length);
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''));
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const row = {};
    const line = lines[i];
    const fields = [];
    let cur = '';
    let inQ = false;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '"') {
        if (inQ && line[j + 1] === '"') { cur += '"'; j++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) {
        fields.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    fields.push(cur);
    headers.forEach((h, k) => row[h] = fields[k]);
    out.push(row);
  }
  return out;
}

const csvText = readFileSync(csvPath, 'utf8');
const rows = parseCsv(csvText).filter(r => !statusFilter || r.status === statusFilter);
console.log(`Generating prompts for ${rows.length} ${statusFilter} failure cells.`);

const outDir = resolve(ROOT, 'temp-files/regen-prompts');
if (existsSync(outDir)) rmSync(outDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

// Sort: shortest-length failures first (worst rot), so the user can pick
// off highest-impact cells first if they batch in waves.
rows.sort((a, b) => Number(a.length) - Number(b.length));

const indexLines = [
  `# Regeneration prompts — ${statusFilter} rot cells`,
  '',
  `Generated ${new Date().toISOString()} from \`${csvPath.replace(ROOT + '/', '')}\`.`,
  '',
  `Total cells: **${rows.length}**.`,
  '',
  'Sorted by length ascending (worst rot first). Each row is one fresh Claude Code conversation.',
  '',
  '| # | lang | length | slug | prompt |',
  '|---|------|--------|------|--------|',
];

rows.forEach((r, i) => {
  const fileName = `${String(i + 1).padStart(3, '0')}__${r.slug}__${r.lang}.md`;
  const filePath = resolve(outDir, fileName);
  writeFileSync(filePath, buildPrompt({
    slug: r.slug, lang: r.lang, length: r.length, reasons: r.reasons,
  }));
  indexLines.push(
    `| ${i + 1} | ${r.lang} | ${r.length} | \`${r.slug}\` | [${fileName}](./${fileName}) |`
  );
});

writeFileSync(resolve(outDir, 'INDEX.md'), indexLines.join('\n') + '\n');
console.log(`Wrote ${rows.length} prompts + INDEX.md to ${outDir.replace(ROOT + '/', '')}/`);
