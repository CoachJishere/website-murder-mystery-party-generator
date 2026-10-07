/**
 * Offline unit test for pre-snapshot customer briefs (ADR-0144). No network, no paid API.
 * Run: node scripts/__tests__/preSnapshotBriefs.test.mjs
 *
 * The bug this guards: `mystery-webhook-trigger` sent the approved concept message plus
 * everything AFTER it and nothing BEFORE it. A customer who pasted a 42,225-char canon
 * ("El Ultimo Trago", 2026-10-06) and then approved a 4,103-char concept got a package
 * built from the concept alone, with none of the canon's load-bearing facts, and no
 * error anywhere. The "snapshot too thin" guard only fires under 3,000 chars.
 */
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const MOD = new URL('../../supabase/functions/_shared/conversation-briefs.ts', import.meta.url);
const TRIGGER = new URL('../../supabase/functions/mystery-webhook-trigger/index.ts', import.meta.url);

const { transformSync } = await import('esbuild');
const js = transformSync(readFileSync(MOD, 'utf8'), { loader: 'ts', format: 'esm' }).code;
const {
  selectPreSnapshotBriefs, formatPreSnapshotBrief, BRIEF_MIN_CHARS, BRIEF_MAX_TOTAL_CHARS,
  selectConceptBase, formatConceptBase, hasConceptSection, amendsEarlierConcept, CONCEPT_BASE_MIN_CHARS,
} = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok - ${name}`);
}

const msg = (id, role, len, at) => ({ id, role, content: 'x'.repeat(len), created_at: at });
const APPROVED_AT = '2026-10-06T03:30:01Z';

// El Ultimo Trago shape: short chat, one huge pasted brief, concept approved later.
const trago = [
  msg('u1', 'user', 161, '2026-10-06T03:13:06Z'),
  msg('a1', 'assistant', 2145, '2026-10-06T03:13:20Z'),
  msg('u-brief', 'user', 42225, '2026-10-06T03:19:52Z'),
  msg('a-pre', 'assistant', 8913, '2026-10-06T03:20:36Z'),
  msg('u-fix', 'user', 77, '2026-10-06T03:29:45Z'),
  msg('approved', 'assistant', 4103, APPROVED_AT),
  msg('u-after', 'user', 44, '2026-10-06T03:31:51Z'),
];

check('the live regression: a 42K pasted canon before the snapshot is selected', () => {
  const picked = selectPreSnapshotBriefs(trago, APPROVED_AT);
  assert.deepStrictEqual(picked.map((m) => m.id), ['u-brief']);
});

check('assistant messages before the snapshot are never included (the Madysn contamination guard)', () => {
  const picked = selectPreSnapshotBriefs(trago, APPROVED_AT);
  assert.ok(!picked.some((m) => m.role === 'assistant'));
  // an 8.9K assistant draft sits before the snapshot and must stay out
  assert.ok(trago.some((m) => m.id === 'a-pre' && m.content.length > BRIEF_MIN_CHARS));
});

check('short earlier user messages (iteration, not a brief) are not included', () => {
  const picked = selectPreSnapshotBriefs(trago, APPROVED_AT);
  assert.ok(!picked.some((m) => m.id === 'u1' || m.id === 'u-fix'));
});

check('Roslyn Clay shape: many short user messages and a concept at the end select nothing', () => {
  const roslyn = [
    msg('u1', 'user', 764, '2026-10-05T19:32:01Z'),
    msg('u2', 'user', 296, '2026-10-05T19:57:55Z'),
    msg('u3', 'user', 582, '2026-10-05T20:16:45Z'),
    msg('approved', 'assistant', 7134, '2026-10-05T21:51:39Z'),
  ];
  assert.deepStrictEqual(selectPreSnapshotBriefs(roslyn, '2026-10-05T21:51:39Z'), []);
});

check('a long user message AFTER the snapshot is not double-included (ADR-0059 already sends it)', () => {
  const later = [msg('approved', 'assistant', 3000, APPROVED_AT), msg('u-late', 'user', 9000, '2026-10-06T04:00:00Z')];
  assert.deepStrictEqual(selectPreSnapshotBriefs(later, APPROVED_AT), []);
});

check('threshold is inclusive at BRIEF_MIN_CHARS and exclusive just below it', () => {
  const edge = [
    msg('at', 'user', BRIEF_MIN_CHARS, '2026-10-06T01:00:00Z'),
    msg('below', 'user', BRIEF_MIN_CHARS - 1, '2026-10-06T01:01:00Z'),
  ];
  assert.deepStrictEqual(selectPreSnapshotBriefs(edge, APPROVED_AT).map((m) => m.id), ['at']);
});

check('output is chronological even when the input is shuffled', () => {
  const two = [msg('late', 'user', 5000, '2026-10-06T02:00:00Z'), msg('early', 'user', 5000, '2026-10-06T01:00:00Z')];
  assert.deepStrictEqual(selectPreSnapshotBriefs(two, APPROVED_AT).map((m) => m.id), ['early', 'late']);
});

check('over the total cap, the OLDEST briefs are dropped first and the newest survive', () => {
  const big = [
    msg('old', 'user', 30000, '2026-10-06T01:00:00Z'),
    msg('mid', 'user', 30000, '2026-10-06T02:00:00Z'),
    msg('new', 'user', 15000, '2026-10-06T03:00:00Z'),
  ];
  const picked = selectPreSnapshotBriefs(big, APPROVED_AT);
  assert.deepStrictEqual(picked.map((m) => m.id), ['mid', 'new']);
  assert.ok(picked.reduce((s, m) => s + m.content.length, 0) <= BRIEF_MAX_TOTAL_CHARS);
});

check('the El Ultimo Trago brief alone fits under the cap (nothing is dropped for the live case)', () => {
  assert.ok(42225 <= BRIEF_MAX_TOTAL_CHARS);
});

check('is_ai messages are excluded even if mislabelled role=user', () => {
  const legacy = [{ id: 'l', role: 'user', is_ai: true, content: 'x'.repeat(6000), created_at: '2026-10-06T01:00:00Z' }];
  assert.deepStrictEqual(selectPreSnapshotBriefs(legacy, APPROVED_AT), []);
});

check('null content and missing roles do not throw', () => {
  const odd = [
    { id: 'n', role: 'user', content: null, created_at: '2026-10-06T01:00:00Z' },
    { id: 'r', content: 'x'.repeat(6000), created_at: '2026-10-06T01:00:00Z' },
  ];
  assert.deepStrictEqual(selectPreSnapshotBriefs(odd, APPROVED_AT), []);
});

check('the label tells the generator the approved concept wins on conflict', () => {
  const label = formatPreSnapshotBrief('BODY');
  assert.ok(label.startsWith('User ('));
  assert.ok(label.endsWith(': BODY'));
  assert.ok(/conflicts with the approved concept below, the approved concept wins/.test(label));
});


// --- ADR-0103 Addendum 87: an approved message that is only a delta needs the full concept it amends ---
const FULL = '# MURDER AT MONTERO MANOR\n\n## Premise\nEvery year ...\n\n## Victim\n**Vivienne Blackwood** ...\n\n## Character List (11 players)\n1. **A** - x\n' + 'x'.repeat(2000);
const DELTA = "Great instinct - let's rework it:\n\nHere's the refined lineup:\n\n## Character List (11 players)\n1. **A** - x\n\nEverything else (premise, victim, murder method) stays exactly as before.";
const aMsg = (id, content, at) => ({ id, role: 'assistant', content, created_at: at });

check('Montero Manor shape: a delta approved message pulls in the earlier full concept', () => {
  const approved = aMsg('delta', DELTA, '2026-10-07T01:31:27Z');
  const msgs = [
    { id: 'u', role: 'user', content: 'short', created_at: '2026-10-07T01:02:47Z' },
    aMsg('chatter', 'sure '.repeat(400), '2026-10-07T01:12:30Z'),
    aMsg('full', FULL, '2026-10-07T01:25:37Z'),
    approved,
  ];
  assert.strictEqual(selectConceptBase(msgs, approved)?.id, 'full');
});

check('a delta that merely MENTIONS "premise, victim" in prose is still a delta (header required)', () => {
  assert.strictEqual(hasConceptSection(DELTA), false);
});

check('an approved message that carries its own Premise/Victim section is left alone (Madysn guard)', () => {
  const approved = aMsg('whole', FULL, '2026-10-07T01:31:27Z');
  const msgs = [aMsg('older', FULL, '2026-10-07T01:00:00Z'), approved];
  assert.strictEqual(selectConceptBase(msgs, approved), null);
});

check('the NEWEST earlier full concept wins, and later-than-approved messages never qualify', () => {
  const approved = aMsg('delta', DELTA, '2026-10-07T01:31:27Z');
  const msgs = [
    aMsg('old', FULL, '2026-10-07T01:00:00Z'),
    aMsg('newer', FULL, '2026-10-07T01:20:00Z'),
    aMsg('after', FULL, '2026-10-07T01:40:00Z'),
    approved,
  ];
  assert.strictEqual(selectConceptBase(msgs, approved)?.id, 'newer');
});

check('no earlier full concept, short earlier messages, and user messages yield null', () => {
  const approved = aMsg('delta', DELTA, '2026-10-07T01:31:27Z');
  const msgs = [
    aMsg('short', '## Premise\nshort', '2026-10-07T01:00:00Z'),
    { id: 'u', role: 'user', content: FULL, created_at: '2026-10-07T01:10:00Z' },
    approved,
  ];
  assert.ok('short'.length < CONCEPT_BASE_MIN_CHARS);
  assert.strictEqual(selectConceptBase(msgs, approved), null);
});

check('a headerless approved message that does NOT say it amends is a complete concept: no base (6 of 11 corpus cases)', () => {
  const approved = aMsg('complete', "Here is the plan.\n\nCharacter list (6 players)\n1. A - x\n2. B - y\n" + 'x'.repeat(2500), '2026-10-07T01:31:27Z');
  assert.strictEqual(amendsEarlierConcept(approved.content), false);
  assert.strictEqual(selectConceptBase([aMsg('full', FULL, '2026-10-07T01:00:00Z'), approved], approved), null);
});

check('the base label says the approved message wins on conflict', () => {
  const label = formatConceptBase('BODY');
  assert.ok(label.startsWith('AI ('));
  assert.ok(label.endsWith(': BODY'));
  assert.ok(/the approved message below wins/.test(label));
});

// --- wiring guard: the trigger must actually use it, and only inside the approved branch ---
const trigger = readFileSync(TRIGGER, 'utf8');

check('mystery-webhook-trigger imports and calls the shared selector', () => {
  assert.ok(trigger.includes('../_shared/conversation-briefs.ts'));
  assert.ok(trigger.includes('selectPreSnapshotBriefs('));
  assert.ok(trigger.includes('formatPreSnapshotBrief('));
});

check('briefs are placed BEFORE the approved concept in the assembled content', () => {
  const block = trigger.slice(trigger.indexOf('conversationContent = ['), trigger.indexOf('conversationContent = [') + 400);
  assert.ok(block.indexOf('preSnapshotBriefs.map') > -1);
  assert.ok(block.indexOf('preSnapshotBriefs.map') < block.indexOf('`AI: ${approvedMsg.content}`'));
});

check('the thin-snapshot full-conversation fallback is untouched (it already sends everything)', () => {
  const fallback = trigger.slice(trigger.indexOf('// Fallback: full conversation'), trigger.indexOf('// Fallback: full conversation') + 700);
  assert.ok(!fallback.includes('preSnapshotBriefs'));
});

check('trigger wires the concept base before the approved message, inside the approved branch only', () => {
  assert.ok(trigger.includes('selectConceptBase(') && trigger.includes('formatConceptBase('));
  const block = trigger.slice(trigger.indexOf('conversationContent = ['), trigger.indexOf('conversationContent = [') + 500);
  assert.ok(block.indexOf('formatConceptBase') > block.indexOf('preSnapshotBriefs.map'));
  assert.ok(block.indexOf('formatConceptBase') < block.indexOf('`AI: ${approvedMsg.content}`'));
  const fallback = trigger.slice(trigger.indexOf('// Fallback: full conversation'), trigger.indexOf('// Fallback: full conversation') + 700);
  assert.ok(!fallback.includes('conceptBase'));
});

console.log(`\n${passed} checks passed.`);
