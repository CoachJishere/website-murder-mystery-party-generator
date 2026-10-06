/**
 * Offline test for notify-generation-issue's "email only when something new" gate. No network. Run: node scripts/__tests__/alertDedupe.test.mjs
 * Guards the 2026-10-06 incident: a package held on purpose re-sent the same alert every 6 hours.
 */
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
const { transformSync } = await import('esbuild');
const src = readFileSync(new URL('../../supabase/functions/_shared/alert-dedupe.ts', import.meta.url), 'utf8');
const js = transformSync(src, { loader: 'ts', format: 'esm' }).code;
const { alertItems, dedupeDecision } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
let passed = 0;
const check = (n, fn) => { fn(); passed++; console.log(`  ok - ${n}`); };
const base = { structuralDefects: [], emptyCharacters: [], missingCharacters: [], skipped: [], capped: [], status: 'needs_review' };

check('a held package with no itemised defect is one stable state', () => {
  assert.deepStrictEqual(alertItems(base), ['status:needs_review']);
});
check('items are sorted and de-duplicated so order never looks like a change', () => {
  const a = alertItems({ ...base, structuralDefects: ['b', 'a', 'a'] });
  const b = alertItems({ ...base, structuralDefects: ['a', 'b'] });
  assert.deepStrictEqual(a, b);
});
check('never emailed: send', () => {
  const d = dedupeDecision(['defect:x'], null, null);
  assert.strictEqual(d.suppress, false); assert.deepStrictEqual(d.newItems, ['defect:x']);
});
check('the live case: identical state on the next cycle is suppressed and leaves the column alone', () => {
  const cur = alertItems({ ...base, structuralDefects: ['meta_text_leak.character.A', 'empty_pointform.final_statement:V'] });
  const d = dedupeDecision(cur, cur, '2026-10-06T10:40:00Z');
  assert.strictEqual(d.suppress, true); assert.strictEqual(d.persist, null);
});
check('a genuinely new defect sends, and names only the new item', () => {
  const last = ['defect:a'];
  const d = dedupeDecision(['defect:a', 'defect:b'], last, '2026-10-06T10:40:00Z');
  assert.strictEqual(d.suppress, false); assert.deepStrictEqual(d.newItems, ['defect:b']);
});
check('fixes that shrink the set are not news, but the smaller set is stored', () => {
  const d = dedupeDecision(['defect:a'], ['defect:a', 'defect:b'], '2026-10-06T10:40:00Z');
  assert.strictEqual(d.suppress, true); assert.deepStrictEqual(d.persist, ['defect:a']);
});
check('an issue that was fixed and then returns is new again', () => {
  let stored = ['defect:a', 'defect:b'];
  const shrunk = dedupeDecision(['defect:a'], stored, 'x'); stored = shrunk.persist ?? stored;
  const back = dedupeDecision(['defect:a', 'defect:b'], stored, 'x');
  assert.strictEqual(back.suppress, false); assert.deepStrictEqual(back.newItems, ['defect:b']);
});
check('legacy row (told before, no stored items) is treated as told and recorded quietly', () => {
  const d = dedupeDecision(['status:needs_review'], null, '2026-10-06T10:40:00Z');
  assert.strictEqual(d.suppress, true); assert.deepStrictEqual(d.persist, ['status:needs_review']);
});
check('an all-clear set (nothing left) is suppressed and stored as empty', () => {
  const d = dedupeDecision([], ['defect:a'], 'x');
  assert.strictEqual(d.suppress, true); assert.deepStrictEqual(d.persist, []);
});
console.log(`\n${passed} checks passed.`);
