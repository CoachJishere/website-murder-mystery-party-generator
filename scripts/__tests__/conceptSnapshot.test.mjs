/**
 * Offline unit test for concept-snapshot selection (ADR-0057). No network, no paid API.
 * Run: node scripts/__tests__/conceptSnapshot.test.mjs
 *
 * The bug this guards: `approved_concept_message_id` used to be chosen by a hardcoded
 * HEADER ALLOW-LIST while the characters were later read by a LINE PARSER. When a
 * customer asked for players-as-investigators and the model renamed its section
 * "## Suspect List", the allow-list stopped matching her revised drafts, "latest match"
 * fell back to her FIRST draft, and she paid for and received a completely different
 * mystery. Non-null value, no error, correct player count — silent.
 *
 * The fix makes selection and extraction the SAME function, so the assertions here are
 * about that property, not about any particular header wording.
 */
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const SRC = new URL('../../supabase/functions/mystery-webhook-trigger/index.ts', import.meta.url);
const src = readFileSync(SRC, 'utf8');

// --- guard: the chooser must NOT be a header allow-list again ---------------------
// This is the regression in its most general form. If someone reintroduces a
// header-name test as the selection gate, this fails regardless of which names.
const snapshotBlock = src.slice(
  src.indexOf('if (!conversation.approved_concept_message_id'),
  src.indexOf('// Extract user_id from the conversation'),
);
assert.ok(
  snapshotBlock.includes('findLatestConceptMessage'),
  'snapshot selection must go through findLatestConceptMessage (the shared parser)',
);
assert.ok(
  !/Cast of Characters|Character List/.test(snapshotBlock),
  'snapshot selection must not test header names — that is the ADR-0057 regression',
);

// --- load the real functions ------------------------------------------------------
// Exercise the SHIPPED regexes and parser rather than a copy that can drift out of
// sync. Take the pure prelude (constants + the two selection functions, stopping
// before anything that touches Deno/Supabase) and transpile it with esbuild.
const start = src.indexOf('const CHARACTER_LIST_HEADERS');
const end = src.indexOf('// Primary extraction: regex-based');
assert.ok(start > 0 && end > start, 'could not locate the pure prelude');

const { transformSync } = await import('esbuild');
const js = transformSync(
  src.slice(start, end) +
    '\nexport { extractRosterFromMessage, findLatestConceptMessage, MIN_ROSTER_SIZE };',
  { loader: 'ts', format: 'esm' },
).code;

const { extractRosterFromMessage, findLatestConceptMessage } = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok — ${name}`);
}

const roster = (names) =>
  names.map((n, i) => `${i + 1}. **${n}** - A suspect with motive and opportunity aplenty.`).join('\n\n');

// --- the live regression ----------------------------------------------------------
// Her actual three drafts: header renamed at message 2, cast renamed at message 3.
const draft1 = `# "The Case of the Stolen Golden Flamingo"\n\n## Premise\n\nAn island party.\n\n## Character List (8 players)\n\n${roster(['Riley Brennan', 'Casey Delmar', 'Jordan Hale', 'Avery Quinn', 'Taylor Frost', 'Devon Pierce', 'Skylar Vance', 'Cameron Ellis'])}`;
const draft2 = `# "The Case of the Stolen Golden Flamingo"\n\n## Premise\n\nA luau.\n\n## Suspect List (8 fictional characters — players investigate them)\n\n${roster(['Polly P', 'Captain K', 'Tiki T', 'Sunny K', 'Professor P', 'Coconut C', 'Marina S', 'Hula D'])}`;
const draft3 = `# "The Case of the Stolen Golden Flamingo"\n\n## Premise\n\nA luau, refined.\n\n## The Wronged Party\n\n**Kaimana Lei** - The host, furious.\n\n## Suspect List (8 fictional characters — players investigate them)\n\n${roster(['Polly Paradise', 'Captain Kei', 'Tiki Tina', 'Sunny Kahale', 'Professor Pineapple', 'Coconut Chris', 'Marina Splash', 'Hula Duke'])}`;

const msgs = [
  { id: 'u1', role: 'user', content: 'I want a mystery for 8', created_at: '2026-08-01T17:20:00Z' },
  { id: 'a1', role: 'assistant', content: draft1, created_at: '2026-08-01T17:21:00Z' },
  { id: 'u2', role: 'user', content: 'make it luau, players investigate', created_at: '2026-08-01T17:30:00Z' },
  { id: 'a2', role: 'assistant', content: draft2, created_at: '2026-08-01T17:31:00Z' },
  { id: 'u3', role: 'user', content: 'rename them Polly Paradise etc', created_at: '2026-08-01T17:34:00Z' },
  { id: 'a3', role: 'assistant', content: draft3, created_at: '2026-08-01T17:35:00Z' },
];

check('picks the LAST draft, not the first (the live regression)', () => {
  assert.strictEqual(findLatestConceptMessage(msgs).id, 'a3');
});

check('"## Suspect List" parses even though it is not in CHARACTER_LIST_HEADERS', () => {
  const names = extractRosterFromMessage(draft3).map((c) => c.name);
  assert.ok(names.includes('Polly Paradise'), `got: ${names.join(', ')}`);
  assert.strictEqual(names.length, 8);
});

check('the host under "## The Wronged Party" is not counted as a suspect', () => {
  assert.ok(!extractRosterFromMessage(draft3).some((c) => c.name === 'Kaimana Lei'));
});

check('a recognised header still works (no regression for the common case)', () => {
  assert.strictEqual(extractRosterFromMessage(draft1).length, 8);
});

check('out-of-order timestamps still yield the chronologically last draft', () => {
  const shuffled = [msgs[5], msgs[1], msgs[3]];
  assert.strictEqual(findLatestConceptMessage(shuffled).id, 'a3');
});

check('prose with no roster selects nothing', () => {
  assert.strictEqual(
    findLatestConceptMessage([
      { id: 'x', role: 'assistant', content: 'Great! What theme would you like?', created_at: '2026-08-01T00:00:00Z' },
    ]),
    null,
  );
});

check('a 3-name list is below MIN_ROSTER_SIZE and is not a cast', () => {
  assert.strictEqual(extractRosterFromMessage(`## Character List\n\n${roster(['A One', 'B Two', 'C Three'])}`).length, 0);
});

check('user messages are never selected even if they contain a roster', () => {
  const withUserRoster = [
    { id: 'u', role: 'user', content: `## Character List\n\n${roster(['A One', 'B Two', 'C Three', 'D Four'])}`, created_at: '2026-08-02T00:00:00Z' },
    { id: 'a', role: 'assistant', content: draft1, created_at: '2026-08-01T00:00:00Z' },
  ];
  assert.strictEqual(findLatestConceptMessage(withUserRoster).id, 'a');
});

check('is_ai flag is honoured as well as role', () => {
  assert.strictEqual(
    findLatestConceptMessage([{ id: 'legacy', is_ai: true, content: draft1, created_at: '2026-08-01T00:00:00Z' }]).id,
    'legacy',
  );
});

console.log(`\n${passed} checks passed.`);
