/**
 * Offline test for the detective-style "I'm also playing" seal (ADR-0158). No network, synthetic fixtures.
 * Run: node scripts/__tests__/hostSeal.test.mjs
 * Guards: the reveal (and any CLOSING after it) is cut off in every language seen in delivered packages, an older
 * package with no reveal heading FAILS CLOSED, and the evidence cards lose their Host Only notes.
 */
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
const { transformSync } = await import('esbuild');
const load = async (rel) => {
  const src = readFileSync(new URL(rel, import.meta.url), 'utf8');
  const js = transformSync(src, { loader: 'ts', format: 'esm' }).code;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
};
const { sealDetectiveScript, readHostPlaying, writeHostPlaying } = await load('../../src/utils/hostSeal.ts');
const { playerFacingEvidence } = await load('../../src/utils/evidenceCardUtils.ts');
let passed = 0;
const check = (n, fn) => { fn(); passed++; console.log(`  ok - ${n}`); };

const script = (reveal, closing = '') => `# Title\n\n## DETECTIVE SCRIPT\n\n## OPENING STATEMENT\n\nWelcome, all.\n\n## ACCUSATIONS\n\nAccuse away.\n\n## FINAL STATEMENTS\n\nLast words.\n\n${reveal}\n\nIt was Quillon Marsh.\n${closing}`;

check('English reveal heading splits; closing sections after it are sealed too', () => {
  const s = sealDetectiveScript(script('## THE REVEAL', '\n## CLOSING STATEMENT\n\nGoodnight, Quillon.\n'));
  assert.strictEqual(s.found, true);
  assert.ok(!/Quillon/.test(s.open));
  assert.ok(/Quillon Marsh/.test(s.sealed) && /CLOSING STATEMENT/.test(s.sealed));
  assert.ok(s.open.endsWith('Last words.'));
});
check('the localized reveal headings of delivered packages all split', () => {
  for (const h of ['## LA REVELACIÓN', '## LA RIVELAZIONE', '## DE ONTHULLING', '## AVSLÖJANDET', '## LA RÉVÉLATION', '## DIE ENTHÜLLUNG', '### Voting & The Reveal', '## A REVELAÇÃO', '## AFSLØRINGEN']) {
    const s = sealDetectiveScript(script(h));
    assert.strictEqual(s.found, true, h);
    assert.ok(!/Quillon/.test(s.open), h);
  }
});
check('an older package with no reveal heading fails closed (found false)', () => {
  const old = '## DETECTIVE SCRIPT\n### OPENING STATEMENT\nHi.\n### ACCUSATIONS AND RESOLUTION\nIt was Quillon Marsh.\n### FINAL STATEMENTS\nBye.';
  const s = sealDetectiveScript(old);
  assert.strictEqual(s.found, false);
  assert.strictEqual(s.sealed, '');
});
check('a level-1 title that contains a reveal word does not trigger the split', () => {
  const s = sealDetectiveScript('# The Reveal Of Ravenscroft\n\n## OPENING STATEMENT\n\nHi.\n\n## THE REVEAL\n\nIt was Quillon.');
  assert.strictEqual(s.found, true);
  assert.ok(s.open.includes('OPENING STATEMENT') && !/Quillon/.test(s.open));
});
check('a CLOSING heading after an older-format resolution does NOT count as the reveal (fails closed)', () => {
  const s = sealDetectiveScript('## DETECTIVE SCRIPT\n### ACCUSATIONS AND RESOLUTION\nIt was Quillon.\n### FINAL STATEMENTS\nBye.\n### CLOSING STATEMENT\nGoodnight.');
  assert.strictEqual(s.found, false);
});
check('host-facing Key Points sections are dropped from the open part (they can name the culprit), other sections stay', () => {
  const s = sealDetectiveScript('## OPENING STATEMENT\n\nHi.\n\n### ROUND 3\n\n#### Script\n\nSo, who was in the study?\n\n#### Key Points\n\n- Do NOT name Quillon directly yet\n- Pace: 15 minutes\n\n### ROUND 4\n\nMore.\n\n## THE REVEAL\n\nIt was Quillon.');
  assert.strictEqual(s.found, true);
  assert.ok(!/Quillon|Key Points|Pace/.test(s.open));
  assert.ok(/So, who was in the study/.test(s.open) && /ROUND 4/.test(s.open) && /More\./.test(s.open));
});
check('Key Points as bold or bare label, "(Host Only)" suffix and localized words are dropped too', () => {
  for (const h of ['**Key Points:**', 'Key Points:', '  #### Key Points', '#### Key Points (Host Only)', '#### Puntos clave', '#### Points clés', '#### Kernpunkte', '#### Punti chiave']) {
    const s = sealDetectiveScript(`## OPENING STATEMENT\n\nHi.\n\n${h}\n\n- Do NOT name Quillon yet\n\n### ROUND 4\n\nMore.\n\n## THE REVEAL\n\nIt was Quillon.`);
    assert.ok(!/Quillon/.test(s.open), h);
    assert.ok(/More\./.test(s.open), h + ' keeps the next section');
  }
});
check('empty or missing script is not found, not a crash', () => {
  assert.strictEqual(sealDetectiveScript(null).found, false);
  assert.strictEqual(sealDetectiveScript('').found, false);
});

const cards = `## EVIDENCE CARDS\n\n## EVIDENCE: ROUND 3\n\n### The Empty Jar\n\n#### DESCRIPTION\nA jar on a counter.\n\n#### SIGNIFICANCE (Host Only)\nNarrows it to Morgan and two others.\n\n## EVIDENCE: ROUND 4\n\n### The Clock\n\n#### DESCRIPTION\nA stopped clock.\n\n#### SIGNIFICANCE (Host Only)\nPoints to Morgan.`;
check('evidence cards keep rounds, titles and descriptions but lose Host Only notes', () => {
  const out = playerFacingEvidence(cards);
  assert.ok(/ROUND 3/.test(out) && /The Clock/.test(out) && /A stopped clock\./.test(out));
  assert.ok(!/Morgan/.test(out) && !/Host Only/.test(out));
});
check('older IMPLICATIONS sections and literal \\n escapes are handled', () => {
  const out = playerFacingEvidence('## EVIDENCE: ROUND 2\\n### The Ledger\\nA torn ledger.\\n### IMPLICATIONS\\nIt was Morgan.');
  assert.ok(/A torn ledger\./.test(out) && !/Morgan/.test(out));
});
check('Host Only labels in other shapes (bare line, bold, 5 hashes, localized word, CRLF) are dropped too', () => {
  const card = (label, sep = '\n') => ['## EVIDENCE: ROUND 2', '### Card', '#### DESCRIPTION', 'A jar.', label, 'Quillon did it.', '', '---', '', '## EVIDENCE: ROUND 3', '### C2', '#### DESCRIPTION', 'Fine.'].join(sep);
  for (const [name, label, sep] of [['bare', 'SIGNIFICANCE (Host Only)'], ['bold', '**SIGNIFICANCE (Host Only)**'], ['5 hashes', '##### SIGNIFICANCE (Host Only)'], ['localized word', '#### SIGNIFIKANS (Host Only)'], ['CRLF', '#### SIGNIFICANCE (Host Only)', '\r\n']]) {
    const out = playerFacingEvidence(card(label, sep));
    assert.ok(!/Quillon/.test(out), name);
    assert.ok(/A jar\./.test(out) && /ROUND 3/.test(out) && /Fine\./.test(out), name + ' keeps the rest');
  }
});
check('storage helpers never throw without a window and default to off', () => {
  assert.strictEqual(readHostPlaying('abc'), false);
  assert.doesNotThrow(() => writeHostPlaying('abc', true));
  assert.strictEqual(readHostPlaying(null), false);
});
console.log(`${passed} passed`);
