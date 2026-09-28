/**
 * Offline unit test for the consolidated nameVariants/buildVariantRegex
 * helper (ADR-0131 item 4). No network, no paid API.
 * Run: node scripts/__tests__/nameVariants.test.mjs
 *
 * Exercises the SHIPPED _shared/nameVariants.ts directly (not a hand-copy),
 * covering every incident its own header comments document, so a future
 * edit that regresses one of them fails a test instead of shipping quietly.
 */
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

const SRC_PATH = new URL('../../supabase/functions/_shared/nameVariants.ts', import.meta.url);
const src = readFileSync(SRC_PATH, 'utf8');
const js = transformSync(src, { loader: 'ts', format: 'esm' }).code;
const { nameVariants, buildVariantRegex, escapeRegex } = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok — ${name}`);
}

check('plain name returns itself', () => {
  const v = nameVariants('Winston Cole');
  assert.ok(v.includes('Winston Cole'));
});

check('dual-gender slash name yields both full-name variants and the bare dual-first-name form (ADR-0103 Addendum 4)', () => {
  const v = nameVariants('Jules/Julia Fontaine');
  assert.ok(v.includes('Jules Fontaine'), `got: ${v.join(', ')}`);
  assert.ok(v.includes('Julia Fontaine'), `got: ${v.join(', ')}`);
  assert.ok(v.includes('Jules/Julia'), `got: ${v.join(', ')}`);
});

check('"Real Name - PlayerNickname" composite yields the bare real name (ADR-0088 incident 2026-08-22)', () => {
  const v = nameVariants('Fulgencio Villamar - MauSal');
  assert.ok(v.includes('Fulgencio Villamar'), `got: ${v.join(', ')}`);
});

check('bare-surname fallback, guarded at length >= 4', () => {
  const v = nameVariants('Dr. Finley/Fiona Cross');
  assert.ok(v.includes('Cross'), `got: ${v.join(', ')}`);
});

check('short surname (<4 chars) is not added as a bare fallback', () => {
  const v = nameVariants('Amy Fox');
  assert.ok(!v.includes('Fox'), `got: ${v.join(', ')}`);
});

check('bare-first-name fallback (incident 2026-09-27, "Mike Millingdon")', () => {
  const v = nameVariants('Mike Millingdon');
  assert.ok(v.includes('Mike'), `got: ${v.join(', ')}`);
});

check('titled dual-gender name skips the title when picking the bare-first-name variant (incident 2026-09-28, "Dr. Cameron/Camille Reeves")', () => {
  const v = nameVariants('Dr. Cameron/Camille Reeves');
  assert.ok(v.includes('Cameron'), `got: ${v.join(', ')}`);
  assert.ok(!v.includes('Dr.'), `got: ${v.join(', ')}`);
});

check('every other supported title is also skipped (Mr./Mrs./Ms./Prof.)', () => {
  assert.ok(nameVariants('Mr. Elias Thorne').includes('Elias'));
  assert.ok(nameVariants('Mrs. Coraline Voss').includes('Coraline'));
  assert.ok(nameVariants('Ms. Harriet Wren').includes('Harriet'));
  assert.ok(nameVariants('Prof. Delphine Larkspur').includes('Delphine'));
});

check('every returned variant is at least 3 characters', () => {
  const v = nameVariants('Al/Bo Fox');
  for (const variant of v) assert.ok(variant.length >= 3, `too short: "${variant}"`);
});

check('buildVariantRegex is word-boundary guarded, does not match inside an unrelated word (ADR-0098 incident 2026-08-20)', () => {
  const rx = buildVariantRegex(nameVariants('Dr. Finley/Fiona Cross'));
  assert.ok(!rx.test('across department meetings'), 'false positive: matched "Cross" inside "across"');
  rx.lastIndex = 0;
  assert.ok(rx.test('Dr. Finley/Fiona Cross confessed'), 'should still match the real full name');
});

check('buildVariantRegex still matches a bare-surname mention on its own', () => {
  const rx = buildVariantRegex(nameVariants('Dr. Finley/Fiona Cross'));
  assert.ok(rx.test('everyone remembers Cross fondly'));
});

check('escapeRegex neutralizes regex metacharacters in a name', () => {
  const escaped = escapeRegex('O\'Malley (the Elder)');
  const rx = new RegExp(escaped);
  assert.ok(rx.test("O'Malley (the Elder)"));
});

console.log(`\n${passed} checks passed.`);
