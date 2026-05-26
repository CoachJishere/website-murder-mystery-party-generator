#!/usr/bin/env node
/**
 * Generate ready-to-paste regeneration prompts for ko + zh-cn `title` and
 * `meta_description` rot, one batch of N (slug, lang) cells per prompt file.
 *
 * Why batched (default 10): title + meta are short enough that drafting both
 * for a single cell is a 2–3 minute task, so a 10-cell batch fits comfortably
 * in one Claude Code conversation without pattern fatigue. The content-regen
 * pipeline (generate-regen-prompts.mjs) used the same batched-conversation
 * pattern successfully across 842 cells in May 2026.
 *
 * Why title+meta together per cell: they ship in the same row, share the same
 * EN intent anchor, and a single PATCH updates both atomically. Splitting them
 * would double the writes and lose the title/meta thematic alignment.
 *
 * Usage:
 *   node scripts/generate-title-regen-prompts.mjs <path-to-title-audit.csv> \
 *     [--status=draft|published] [--batch-size=10]
 *
 * Output: temp-files/title-regen-prompts/batch-NNN__<lang>__<count>cells.md
 *         + INDEX.md
 *
 * Each prompt is a fresh Claude Code conversation. Per cell, the conversation
 * fetches EN title+meta+h1, drafts target-lang title+meta, smoke-tests against
 * scripts/check-title-rot.mjs, PATCHes both columns in one row update, then
 * re-verifies from the live row.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TITLE_HEALTHY, META_HEALTHY } from './check-title-rot.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('usage: generate-title-regen-prompts.mjs <csv-path> [--status=<filter>] [--batch-size=<N>]');
  process.exit(1);
}
const statusArg = process.argv.find(a => a.startsWith('--status='));
const statusFilter = statusArg ? statusArg.split('=')[1] : null;
const batchArg = process.argv.find(a => a.startsWith('--batch-size='));
const batchSize = batchArg ? Math.max(1, parseInt(batchArg.split('=')[1], 10)) : 10;

const TODAY = new Date().toISOString().slice(0, 10);

const LANG_NAME = { ko: 'Korean', 'zh-cn': 'Simplified Chinese' };

const KO_STYLE_RULES = `**KO-specific style rules**:

* **Titles must be noun phrases** or \`~하는 법\` / \`~하는 방법\` patterns. **NEVER** end a title with declarative endings: \`니다\` / \`니까\` (with or without trailing punctuation). That includes \`합니다\`, \`입니다\`, \`됩니다\`, \`습니다\`, \`알려드립니다\`, \`보입니다\`, etc. Healthy: \`살인 미스터리 파티 호스팅 완벽 가이드\`, \`클루를 효과적으로 배치하는 법\`. Rotted: \`살인 미스터리 파티 호스팅 방법을 알려드립니다\`.
* **DROP explicit pronouns** in titles + metas: \`그들이\`, \`그것이\`, \`그것을\`, \`그들을\`, \`그들의\`, \`그것의\`. Korean handles these implicitly. Their presence is the upstream MT calque marker.
* **Metas read as natural prose**, not as a literal back-translation. The EN meta is intent; the KO meta is its native equivalent. Particles (-이/가, -은/는, -을/를) in their natural distribution. Connectives via verb endings (-고, -며, -지만) rather than \`그리고/그러나\`.
* **No \`mysterymaker.party\` literal** anywhere. The brand is \`Mystery Maker\` (English-origin word). The URL form is rot.`;

const ZH_STYLE_RULES = `**ZH-CN-specific style rules**:

* **Titles** should be concise noun phrases (\`谋杀悬疑派对完整指南\`) or question-style (\`如何举办难忘的谋杀悬疑派对？\`). Avoid literal English-syntax constructions. If the EN title is \`How to Host a Murder Mystery Party\`, the natural ZH equivalent restructures around \`如何\` or drops it for a noun phrase — not word-for-word.
* **Metas should be FULL.** The dominant rot mode here is truncation: the upstream MT pipeline cut almost every zh-cn meta to ~50 chars. Your replacement metas must reach **${META_HEALTHY.min}–${META_HEALTHY.max} hanzi** (the SEO sweet spot) and cover the same intent as the EN meta. CJK density does NOT justify shipping a 50-char stub.
* **Natural Chinese rhythm**. Short sentences are fine, but each should feel like Chinese prose, not hanzi-stamped English. If your draft parses as "[English subject] [English verb pattern] [English object]" with Chinese vocab, restructure.
* **Brand**: \`Mystery Maker\` in body/meta prose is acceptable (English-origin name). Never let \`mysterymaker.party\` (the URL form) sit in title or meta.`;

function buildBatchPrompt({ lang, cells }) {
  const langName = LANG_NAME[lang];
  const styleRules = lang === 'ko' ? KO_STYLE_RULES : ZH_STYLE_RULES;

  const cellList = cells.map((c, i) => {
    const colSummary = c.columns
      .map(col => `${col.column} (${col.length}c: ${col.reasons.replace(/"/g, "'")})`)
      .join(' + ');
    return `${i + 1}. **\`${c.slug}\`** — failing: ${colSummary}`;
  }).join('\n');

  return `You are working in /Users/jonathanmiller/CascadeProjects/website-murder-mystery-party-generator-main, a Vite + TypeScript + Supabase blog generator. Today is ${TODAY}.

**Task**: regenerate the **title** and **meta_description** of **${cells.length} ${langName} (\`${lang}\`)** blog rows so each passes the project's title-rot gate at \`scripts/check-title-rot.mjs\`. This is regeneration-in-place per cell: only \`title\` and \`meta_description\` change; \`content\`, \`slug\`, \`status\`, and all other columns stay untouched. **One PATCH per cell**, updating both columns in the same row update.

## Cells to regenerate (in order)

${cellList}

Targets per cell:
- **Title**: ${TITLE_HEALTHY.min}–${TITLE_HEALTHY.max} chars healthy (gate floor is 20). Single line. Noun phrase / question; never a full declarative sentence.
- **Meta**: ${META_HEALTHY.min}–${META_HEALTHY.max} chars healthy (gate floor is 80). Two-to-three-sentence prose paragraph that lands the click.

## Background

The content column was cleaned in May 2026 across all 842 ko + zh-cn rows. The \`title\` and \`meta_description\` columns were never audited until ${TODAY}. The same upstream MT pipeline produced them, so they exhibit the same calque/truncation patterns: most ZH-CN metas were truncated to ~50 chars, ~25% of KO titles end in declarative \`-니다\`, ~60% of ZH-CN titles fall below the SEO floor. This batch is part of the regeneration sweep.

## Loop pattern (do this for each cell in order)

Process cells **one at a time, sequentially**. Do not start cell N+1 until cell N is PATCHed and gate-verified. Each cell gets its own atomic fetch → draft → smoke-test → PATCH → re-verify cycle.

**Critical: each cell is a fresh blank slate.** No carryover of phrasing or structure from the previous cell. After finishing each cell, read the next EN title+meta as if it's your first translation of the day.

### Per-cell steps

1. **Load credentials.** The repo \`.env\` has \`VITE_SUPABASE_URL\` and \`SUPABASE_SERVICE_ROLE_KEY\`. Use those as your \`SUPABASE_URL\` / \`SUPABASE_SERVICE_KEY\`. (Read once at batch start; reuse.)

2. **Fetch the EN source** for this cell:
   \`\`\`
   GET \${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.<SLUG>&language=eq.en&select=title,meta_description,content
   \`\`\`
   You need the EN title (canonical intent for your title), the EN meta (canonical intent for your meta), and the EN content (skim the H1 + first paragraph for tone — you don't need to read all of it; the goal is to ground your title+meta in the article's actual claim).

3. **Fetch the current rotted ${lang} title + meta** for negative-example context only (do NOT translate from them):
   \`\`\`
   GET \${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.<SLUG>&language=eq.${lang}&select=title,meta_description
   \`\`\`

4. **Draft fresh ${langName} title + meta**:
   - **Title**: ${TITLE_HEALTHY.min}–${TITLE_HEALTHY.max} chars. Noun phrase or question. Matches the EN title's intent, not its surface syntax.
   - **Meta**: ${META_HEALTHY.min}–${META_HEALTHY.max} chars. 2–3 sentences of prose. Hooks the SERP reader by stating the value the article delivers. No \`mysterymaker.party\` literal. No \`Mystery Maker\` URL form.
   - Rot patterns to avoid: brand-URL literal, untranslated English runs (4+ consecutive Latin words in title, 6+ in meta — brand mentions of \`Mystery Maker\` are OK), and the language-specific patterns below.

   ${styleRules}

5. **Smoke-test BEFORE writing to DB**. Inline-import the gate and run it on your draft:
   \`\`\`js
   import { checkTitle, checkMeta } from './scripts/check-title-rot.mjs';
   const enTitle = '<the EN title you fetched>';
   const enMeta  = '<the EN meta you fetched>';
   const title = '<your ${lang} title>';
   const meta  = '<your ${lang} meta>';
   console.log(checkTitle('${lang}', title, enTitle));
   console.log(checkMeta('${lang}', meta, enMeta));
   // Both must show pass: true. If either fails, revise THIS cell until both pass.
   \`\`\`

6. **PATCH Supabase** — both columns in one row update:
   \`\`\`
   PATCH \${SUPABASE_URL}/rest/v1/blog_posts?slug=eq.<SLUG>&language=eq.${lang}
   Headers: apikey, Authorization: Bearer <key>, Content-Type: application/json, Prefer: return=minimal
   Body: JSON.stringify({ title: '<your title>', meta_description: '<your meta>' })
   \`\`\`
   Expect HTTP 204. Any other status → stop and report which cell failed.

7. **Re-verify from the live row**:
   \`\`\`
   node scripts/check-title-rot.mjs <SLUG>
   \`\`\`
   Confirm \`${lang}.title.pass === true\` and \`${lang}.meta.pass === true\`.

8. **Log one line, then move on**:
   \`\`\`
   [N/${cells.length}] <slug>  title=PASS (oldLen→newLen)  meta=PASS (oldLen→newLen)
   \`\`\`

9. **Reset mentally**, then read the next EN title+meta fresh.

## Per-cell failure handling

If a cell fails the gate after 3 revisions, SKIP it (do not PATCH), log the reason, continue to the next. Successful cells stay shipped.

## Final report (after all ${cells.length} cells)

A table:
\`\`\`
| #  | slug | title old→new | meta old→new | gate | notes |
| 1  | ...  | 42→58         | 78→145       | PASS | -     |
| 2  | ...  | ...           | ...          | SKIP | reason |
\`\`\`

Plus a count: cells regenerated, cells skipped, total elapsed.

## Discipline

- ONE PATCH per cell — both columns in the same row update. ${cells.length} cells = up to ${cells.length} PATCHes total.
- No new local files, no git commits, no other slug/lang/table changes.
- Do NOT use Python, regex, or bulk find/replace for translation. Each title+meta is thoughtful and per-cell.
- Do NOT modify \`scripts/check-title-rot.mjs\` or the audit script.
- Do NOT touch the \`content\` column — that was cleared in May 2026 and is out of scope.
- Treat each EN title+meta as canonical intent for its cell only. No cross-cell phrasing reuse.
- If you notice the same phrasing twice across cells (e.g. identical title opener), STOP and reset your voice.
`;
}

// CSV parser handling quoted fields with embedded commas + escaped quotes.
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
const allFailures = parseCsv(csvText)
  .filter(r => !statusFilter || r.status === statusFilter);

// Collapse per-column failures into per-(slug, lang) cells. If either the
// title OR meta failed, we regenerate both columns together. The cell
// inherits both column-level failure summaries so the prompt shows the
// translator exactly what tripped each column.
const cellMap = new Map();
for (const f of allFailures) {
  const key = `${f.lang}::${f.slug}`;
  if (!cellMap.has(key)) {
    cellMap.set(key, {
      lang: f.lang, slug: f.slug, status: f.status, columns: [],
    });
  }
  cellMap.get(key).columns.push({
    column: f.column,
    length: Number(f.length),
    reasons: f.reasons,
  });
}
const cells = [...cellMap.values()];
console.log(`Collapsed ${allFailures.length} column failures → ${cells.length} unique (slug, lang) cells.`);

// Sort: by lang (ZH-CN first since it has 100% meta fail rate — burst through
// it as one continuous task), then within a lang by total rot severity. Use a
// simple "title fail + meta fail" count as the severity proxy.
cells.sort((a, b) => {
  if (a.lang !== b.lang) return a.lang === 'zh-cn' ? -1 : 1;
  return b.columns.length - a.columns.length;
});

const outDir = resolve(ROOT, 'temp-files/title-regen-prompts');
if (existsSync(outDir)) rmSync(outDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const byLang = { ko: [], 'zh-cn': [] };
for (const c of cells) byLang[c.lang]?.push(c);

const indexLines = [
  `# Title + meta regeneration prompts`,
  '',
  `Generated ${new Date().toISOString()} from \`${csvPath.replace(ROOT + '/', '')}\`.`,
  '',
  `Total cells: **${cells.length}** (ko: ${byLang.ko.length}, zh-cn: ${byLang['zh-cn'].length}).`,
  `Batch size: **${batchSize}** cells per Claude Code conversation.`,
  '',
  'Each batch is single-language (KO and ZH-CN have different style rules).',
  'Within a language, cells are sorted by rot severity (both-columns-failing first).',
  '',
  '| batch | lang | cells | prompt |',
  '|-------|------|-------|--------|',
];

let batchNum = 0;
for (const lang of ['zh-cn', 'ko']) {
  const langCells = byLang[lang];
  if (!langCells.length) continue;
  for (let i = 0; i < langCells.length; i += batchSize) {
    batchNum++;
    const chunk = langCells.slice(i, i + batchSize);
    const fileName = `batch-${String(batchNum).padStart(3, '0')}__${lang}__${chunk.length}cells.md`;
    writeFileSync(resolve(outDir, fileName), buildBatchPrompt({ lang, cells: chunk }));
    indexLines.push(`| ${batchNum} | ${lang} | ${chunk.length} | [${fileName}](./${fileName}) |`);
  }
}

writeFileSync(resolve(outDir, 'INDEX.md'), indexLines.join('\n') + '\n');
console.log(`Wrote ${batchNum} batched prompts + INDEX.md to ${outDir.replace(ROOT + '/', '')}/`);
