/**
 * Offline unit test for isRosterExtractionAnomaly (ADR-0130 Addendum 2, ADR-0103 Addendum 74).
 * No network, no paid API. Run: node scripts/__tests__/rosterAnomaly.test.mjs
 *
 * The bug this guards: the roster-extraction health alert fired on a legitimate unpaid
 * 2-person concept ("## Character List (2 players)"). The parser read it fine; MIN_ROSTER_SIZE
 * discarded it on purpose. The alert is meant to catch "header present, nothing parsed" (the
 * ADR-0130 Addendum 1 regression), so a header that itself states a cast smaller than the
 * product minimum must not count. The real regression shape must keep counting.
 */
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

const SRC_PATH = new URL('../../supabase/functions/_shared/rosterExtraction.ts', import.meta.url);
const js = transformSync(readFileSync(SRC_PATH, 'utf8'), { loader: 'ts', format: 'esm' }).code;
const { isRosterExtractionAnomaly, extractRosterFromMessage, MIN_ROSTER_SIZE } = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok — ${name}`);
}

const ai = (content) => ({ role: 'assistant', content });
const user = (content) => ({ role: 'user', content });
const list = (n) =>
  Array.from({ length: n }, (_, i) => `${i + 1}. **Name${i} Surname** – A character.`).join('\n');
const msg = (header, n) =>
  ai(`# TITLE\n\n## Premise\nText.\n\n${header}\n${list(n)}\n\n## Murder Method\nText.`);

check('the product minimum is still 4 (test premise)', () => {
  assert.strictEqual(MIN_ROSTER_SIZE, 4);
});

check('2-character cast under a "(2 players)" header is NOT an anomaly (the Trick, Treat, Dead shape)', () => {
  const m = msg('## Character List (2 players)', 2);
  assert.deepStrictEqual(extractRosterFromMessage(m.content), []); // parser discards it by design
  assert.strictEqual(isRosterExtractionAnomaly([m], []), false);
});

check('3-character cast under a "(3 players)" header is NOT an anomaly', () => {
  assert.strictEqual(isRosterExtractionAnomaly([msg('## Character List (3 players)', 3)], []), false);
});

check('header claiming 4 with nothing parsed IS an anomaly (boundary)', () => {
  assert.strictEqual(
    isRosterExtractionAnomaly([ai('## Character List (4 players)\nnothing parseable here')], []),
    true,
  );
});

check('header claiming 28 with nothing parsed IS an anomaly (the ADR-0130 regression shape)', () => {
  assert.strictEqual(
    isRosterExtractionAnomaly([ai('## Character List (28 players)\n(cut off)')], []),
    true,
  );
});

check('header with no stated count and nothing parsed IS an anomaly', () => {
  assert.strictEqual(
    isRosterExtractionAnomaly([ai('## Character List\nnothing parseable here')], []),
    true,
  );
});

check('a successful parse is never an anomaly', () => {
  assert.strictEqual(
    isRosterExtractionAnomaly([msg('## Character List (6 players)', 6)], [{ name: 'A', description: 'b' }]),
    false,
  );
});

check('no header anywhere (customer still mid-concept) is not an anomaly', () => {
  assert.strictEqual(isRosterExtractionAnomaly([ai('What setting would you like?')], []), false);
});

check('a header in a USER message is ignored', () => {
  assert.strictEqual(isRosterExtractionAnomaly([user('## Character List (28 players)')], []), false);
});

check('empty / missing messages do not throw', () => {
  assert.strictEqual(isRosterExtractionAnomaly([], []), false);
  assert.strictEqual(isRosterExtractionAnomaly(undefined, []), false);
});

check('a later small-cast message does not hide an earlier real anomaly', () => {
  assert.strictEqual(
    isRosterExtractionAnomaly(
      [ai('## Character List (12 players)\nnothing parseable'), msg('## Character List (2 players)', 2)],
      [],
    ),
    true,
  );
});

console.log(`\n${passed} passed`);
