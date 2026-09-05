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
    '\nexport { extractRosterFromMessage, findLatestConceptMessage, rosterDiffersMeaningfully, isPlausibleRosterCandidate, rosterOverlapFraction, MIN_ROSTER_SIZE };',
  { loader: 'ts', format: 'esm' },
).code;

const { extractRosterFromMessage, findLatestConceptMessage, rosterDiffersMeaningfully, isPlausibleRosterCandidate, rosterOverlapFraction } = await import(
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

// --- ADR-0063: "### Optional Characters" no longer terminates the roster ----------
// Customer's actual bug: 15 core characters under "## Character List (15 players)",
// then 3 more under "### Optional Characters (for 16-18 players)" — a subheading not
// on CHARACTER_LIST_HEADERS. The old code stopped at the first unrecognised ##/###
// line; the fix peeks at whether a character line follows before stopping, so ANY
// subheading wording works as long as the roster actually continues after it.
const draftWithOptional = `# Camp Mystery\n\n## Premise\n\nA camp.\n\n## Character List (15 players)\n\n${roster([
  'Blaze Kingston', 'Rocket Chen', 'Flash Martinez', 'Ace Sullivan', 'Scout Hayes',
  'Ziggy Kowalski', 'Hawk Blackwood', 'Dash Reed', 'Comet Tran', 'Phoenix Moreno',
  'Storm Winters', 'Jet Fontaine', 'Blitz Thornton', 'Maverick Cruz', 'Ridge Foster',
])}\n\n### Optional Characters (for 16-18 players)\n\n${roster(['Nitro Patel', 'Crash Yamamoto', 'Timber Wolfe'])}\n\n## Murder Method\n\nPoison in the smoothie.`;

check('roster continues past an unrecognised subheading when more character lines follow (ADR-0063)', () => {
  const names = extractRosterFromMessage(draftWithOptional).map((c) => c.name);
  assert.strictEqual(names.length, 18, `got: ${names.join(', ')}`);
  assert.ok(names.includes('Nitro Patel'));
  assert.ok(names.includes('Timber Wolfe'));
});

check('parsing still stops at a real new section (Murder Method is prose, not more characters)', () => {
  const names = extractRosterFromMessage(draftWithOptional).map((c) => c.name);
  assert.ok(!names.some((n) => n.includes('Poison')));
});

// --- ADR-0068: an inline annotation between the name and the dash no longer drops the line ---
// Customer's actual bug ("The Host Herself", ac2c3610-...): she explicitly asked for and
// approved a 12th "optional player" character. The approved snapshot's roster line for it —
// "12. **Blaire/Blair Ashford** *(OPTIONAL PLAYER)* – ..." — has an italic parenthetical
// between the bolded name and the en-dash separator. The old characterLineRegex required the
// separator immediately after the closing "**", so this one line silently failed to match
// while all 11 other (unannotated) lines matched fine — extractRosterFromMessage returned 11
// instead of 12, no error, no count mismatch signal. Verified against her exact approved text.
const draftWithAnnotatedOptional = `# Secrets at the Summit\n\n## Premise\n\nA resort weekend.\n\n## Character List (11-12 players)\n\n${roster([
  'Vivienne Ashford', 'Jordan Keating', 'Reese Holloway', 'Cameron Voss', 'Sloane Fitzgerald',
  'Harper Chen', 'Avery Blackwood', 'Riley Sutton', 'Morgan Delacroix', 'Emerson Vale', 'Quinn Marchetti',
])}\n\n12. **Blaire/Blair Ashford** *(OPTIONAL PLAYER)* – Vivienne's unpredictable older sister who wasn't officially invited but showed up late to dinner anyway; known for stirring up trouble and saying what everyone else is thinking.\n\n## Murder Method\n\nPoison in the green juice.`;

check('roster line with an inline annotation between name and dash still parses (ADR-0068)', () => {
  const names = extractRosterFromMessage(draftWithAnnotatedOptional).map((c) => c.name);
  assert.strictEqual(names.length, 12, `got: ${names.join(', ')}`);
  assert.ok(names.includes('Blaire/Blair Ashford'), `missing annotated 12th character; got: ${names.join(', ')}`);
});

// --- bracket-wrapped reserve/placeholder slots aren't real characters (2026-08-11) ---
// Customer's actual bug ("Death At The Birthday Bash", 7072e6eb-...): the AI's response
// got cut off mid-draft, and the last two roster lines were leftover placeholder text
// it invented while trying to fill "two more maybe characters" slots the customer only
// gave one real answer for: "21. **[RESERVE CHARACTER - Brian's Alternate]** - If Brian
// cannot attend, his character's secrets and motives will be redistributed among the
// other suspects." These match characterLineRegex structurally (bold name + separator +
// description) but aren't real characters — the health-check's roster-mismatch detector
// counted them as 2 extra "approved" characters that were never meant to be generated.
const draftWithReserveSlots = `# Party\n\n## Premise\n\nA party.\n\n## Character List (6 players)\n\n${roster([
  'Nick Nichols', 'Emily Divine', 'Justin Sims', 'Benton Fitzgerald',
])}\n\n5. **[RESERVE CHARACTER - Brian's Alternate]** - If Brian cannot attend, his character's secrets and motives will be redistributed among the other suspects.\n\n6. **[RESERVE CHARACTER - Jessica's Alternate]** - If Jessica cannot atten`;

check('bracket-wrapped reserve/placeholder slots are excluded from the roster (2026-08-11)', () => {
  const names = extractRosterFromMessage(draftWithReserveSlots).map((c) => c.name);
  assert.strictEqual(names.length, 4, `got: ${names.join(', ')}`);
  assert.ok(!names.some((n) => n.startsWith('[')), `a placeholder slot leaked through as a character; got: ${names.join(', ')}`);
});

// --- ADR-0069: re-capture the snapshot when a LATER message restates a meaningfully
// different roster ------------------------------------------------------------------
// The live bug ("Death At The Blackthorn Wedding", cd4ca44d-...): customer approved a
// 12-player roster, then 16 days later said "Change it to be ten players" and got a
// revised 10-player roster as her final message. `approved_concept_message_id` never
// moved, so generation kept reading the stale 12-player draft. `rosterDiffersMeaningfully`
// is the pure predicate the edge function's re-capture block gates on.
const roster12 = roster([
  'Lady Vivienne Blackthorn', 'Lord Edmund Blackthorn', 'Reverend Cassius Wren', 'Dr. Marlowe Finch',
  'Constance Sinclair', 'Rosalind Hart', 'Captain Percival Wade', 'Genevieve Ashworth',
  'Bartholomew Croft', 'Ophelia Grant', 'Winston Cole', 'Marigold Pryce',
]);
const roster10 = roster([
  'Lady Vivienne Blackthorn', 'Lord Edmund Blackthorn', 'Reverend Cassius Wren', 'Dr. Marlowe Finch',
  'Constance Sinclair', 'Rosalind Hart', 'Captain Percival Wade', 'Genevieve Ashworth',
  'Bartholomew Croft', 'Ophelia Grant',
]);

check('ADR-0069: a later message restating a different-count roster is flagged as drift', () => {
  const snapshotRoster = extractRosterFromMessage(`## Character List (12 players)\n\n${roster12}`);
  const laterRoster = extractRosterFromMessage(`## Character List (10 players)\n\n${roster10}`);
  assert.strictEqual(snapshotRoster.length, 12);
  assert.strictEqual(laterRoster.length, 10);
  assert.ok(rosterDiffersMeaningfully(snapshotRoster, laterRoster));
});

check('ADR-0069: cosmetic rewording of the SAME cast is not flagged as drift', () => {
  const snapshotRoster = extractRosterFromMessage(`## Character List (8 players)\n\n${roster(['Riley Brennan', 'Casey Delmar', 'Jordan Hale', 'Avery Quinn', 'Taylor Frost', 'Devon Pierce', 'Skylar Vance', 'Cameron Ellis'])}`);
  const laterRoster = extractRosterFromMessage(`## Suspect List (8 fictional characters)\n\n${roster(['Riley Brennan', 'Casey Delmar', 'Jordan Hale', 'Avery Quinn', 'Taylor Frost', 'Devon Pierce', 'Skylar Vance', 'Cameron Ellis'])}`);
  assert.strictEqual(snapshotRoster.length, 8);
  assert.strictEqual(laterRoster.length, 8);
  assert.ok(!rosterDiffersMeaningfully(snapshotRoster, laterRoster));
});

check('ADR-0069: end-to-end — findLatestConceptMessage + rosterDiffersMeaningfully picks up the live regression', () => {
  const blackthornMsgs = [
    { id: 'approved', role: 'assistant', content: `# Death At The Blackthorn Wedding\n\n## Character List (12 players)\n\n${roster12}`, created_at: '2026-07-22T21:59:00Z' },
    { id: 'u-later', role: 'user', content: 'Change it to be ten players', created_at: '2026-08-07T17:30:00Z' },
    { id: 'a-later', role: 'assistant', content: `# Death At The Blackthorn Wedding (Revised)\n\n## Character List (10 players)\n\n${roster10}`, created_at: '2026-08-07T17:35:00Z' },
  ];
  const currentSnapshotMsg = blackthornMsgs.find((m) => m.id === 'approved');
  const latestConceptMsg = findLatestConceptMessage(blackthornMsgs);
  assert.strictEqual(latestConceptMsg.id, 'a-later');

  const snapshotRoster = extractRosterFromMessage(currentSnapshotMsg.content);
  const latestRoster = extractRosterFromMessage(latestConceptMsg.content);
  assert.ok(rosterDiffersMeaningfully(snapshotRoster, latestRoster), 'should detect the 12-vs-10 drift and promote the later message');
});

check('ADR-0069: a later PROSE-only revision (no restated roster) is not flagged — Black Swan Society shape', () => {
  // "The Black Swan Society" (926cd375-...): 13 later assistant messages changed the
  // setting to Victorian, renamed the institution, added a Savannah plot thread — but
  // never restated a full character list. extractRosterFromMessage correctly finds no
  // roster in the later message, so rosterDiffersMeaningfully must not fire (there is
  // nothing to promote the snapshot to). This class of drift is out of scope for the
  // roster-comparison fix — it's covered separately by ADR-0059's conversationContent
  // widening, not by this function.
  const snapshotRoster = extractRosterFromMessage(draft1);
  const laterProseOnly = extractRosterFromMessage('Let\'s change it to Victorian era, with witty banter and clever wordplay — full absurd comedic tone, and let\'s rename the institution away from Morehouse.');
  assert.strictEqual(laterProseOnly.length, 0);
  assert.ok(!rosterDiffersMeaningfully(snapshotRoster, laterProseOnly));
});

// ADR-0069 Addendum 1 (2026-09-05): "Murder At The Golden Feather Awards"
// (97115032-...) — customer removed one character from a 22-person roster via chat
// alone ("can we get rid of the magpie") without ever touching the player_count form
// field, which stayed at its original value of 24. isPlausibleRosterCount(21, 24)
// rejects the real final roster as implausible (21 < 24-2), so pre-fix,
// findLatestConceptMessage fell back to the stale 22-person snapshot and the
// customer's confirmed edit never took effect. isPlausibleRosterCandidate's
// snapshot-overlap signal is what closes this gap.
const goldenFeatherSnapshot = roster([
  'Cyrus/Cybil Cassowary', 'Carter/Coraline Cock-of-the-Rock', 'Percy/Persephone Peacock', 'Oliver/Olive Owl',
  'Dashiell/Delia Duck', 'Polly/Paolo Parrot', 'Hedwig/Harlan Hummingbird', 'Vinny/Violet Vulture',
  'Percival/Patricia Penguin', 'Baxter/Bianca Blue-footed Booby', 'Duke/Duchess Dove', 'Monty/Mona Magpie',
  'Preston/Priscilla Prairie Chicken', 'Wally/Wanda Woodpecker', 'Ozzy/Opal Ostrich', 'Sebastian/Seraphina Swallow',
  'Carla/Carlos Cardinal', 'Hugo/Henrietta House Finch', 'Sunny/Solomon Summer Tanager', 'Tucker/Tilly Tufted Titmouse',
  'Blake/Blaire Blue Jay', 'Willa/Wren Carolina Wren',
]);
const goldenFeatherRevised = roster([
  'Cyrus/Cybil Cassowary', 'Carter/Coraline Cock-of-the-Rock', 'Percy/Persephone Peacock', 'Oliver/Olive Owl',
  'Dashiell/Delia Duck', 'Polly/Paolo Parrot', 'Hedwig/Harlan Hummingbird', 'Vinny/Violet Vulture',
  'Percival/Patricia Penguin', 'Baxter/Bianca Blue-footed Booby', 'Duke/Duchess Dove',
  'Preston/Priscilla Prairie Chicken', 'Wally/Wanda Woodpecker', 'Ozzy/Opal Ostrich', 'Sebastian/Seraphina Swallow',
  'Carla/Carlos Cardinal', 'Hugo/Henrietta House Finch', 'Sunny/Solomon Summer Tanager', 'Tucker/Tilly Tufted Titmouse',
  'Blake/Blaire Blue Jay', 'Willa/Wren Carolina Wren',
]);

check('ADR-0069 Addendum 1: a legitimate roster trim survives a stale player_count when it overlaps the current snapshot', () => {
  const snapshotRoster = extractRosterFromMessage(`## Character List (22 players)\n\n${goldenFeatherSnapshot}`);
  const revisedRoster = extractRosterFromMessage(`## Character List (21 players)\n\n${goldenFeatherRevised}`);
  assert.strictEqual(snapshotRoster.length, 22);
  assert.strictEqual(revisedRoster.length, 21);
  // player_count stuck at the original 24 — pre-fix, this alone made 21 "implausible"
  assert.ok(!isPlausibleRosterCandidate(revisedRoster, 24), 'sanity check: player_count alone should still find this implausible');
  assert.ok(
    isPlausibleRosterCandidate(revisedRoster, 24, snapshotRoster),
    'high overlap with the current snapshot should make it plausible despite the stale player_count',
  );
});

check('ADR-0069 Addendum 1: findLatestConceptMessage picks the real trimmed roster, not the stale snapshot, given a reference roster', () => {
  const goldenFeatherMsgs = [
    { id: 'snapshot', role: 'assistant', content: `## Character List (22 players)\n\n${goldenFeatherSnapshot}`, created_at: '2026-09-03T07:08:23Z' },
    { id: 'u-later', role: 'user', content: "can we get rid f the magpie so there's only 21 characters now", created_at: '2026-09-04T19:44:14Z' },
    { id: 'a-later', role: 'assistant', content: `## Character List (21 players)\n\n${goldenFeatherRevised}`, created_at: '2026-09-04T19:44:31Z' },
  ];
  const snapshotRoster = extractRosterFromMessage(goldenFeatherMsgs[0].content);
  // player_count = 24, the stale original value — this is the exact regression shape
  const latest = findLatestConceptMessage(goldenFeatherMsgs, 24, snapshotRoster);
  assert.strictEqual(latest.id, 'a-later', 'must pick the customer\'s real 21-person revision, not fall back to the stale 22-person snapshot');
});

check('ADR-0069 Addendum 1: a fake structural match with near-zero overlap is still rejected even with a reference roster (ADR-0118 regression guard)', () => {
  // "The Hollingsworth Estate" (bf336652-...) false positive: a later reply listing
  // murder-method direction options happens to embed real character surnames inside
  // unrelated phrases ("Holloway's Compound"), which must NOT count as a name match —
  // rosterOverlapFraction uses normalized EXACT equality, not substring, for exactly
  // this reason.
  const hollingsworthSnapshot = roster([
    'Adrienne Fairweather', 'William Gray', 'Cole Voss', 'Everett Moss', 'Cleopatra',
    'Cornelius Ashgrave', 'Dr. Victor Holloway', 'Raven', 'Julian Harwell', 'Marcus Sinclair', 'Wren Sorrel',
  ]);
  const hollingsworthFakeReply = roster([
    "Holloway's Compound", "Ashgrave's Old Craft", "Cleopatra's Ancient Knowledge",
    'A Shared Clue, Not a Single Culprit', 'My suggestion',
  ]);
  const snapshotRoster = extractRosterFromMessage(`## Character List (11 players)\n\n${hollingsworthSnapshot}`);
  const fakeRoster = extractRosterFromMessage(`## Direction Options\n\n${hollingsworthFakeReply}`);
  assert.strictEqual(snapshotRoster.length, 11);
  assert.strictEqual(fakeRoster.length, 5);
  assert.strictEqual(rosterOverlapFraction(fakeRoster, snapshotRoster), 0, 'surname-embedding phrases must not count as a name match');
  assert.ok(!isPlausibleRosterCandidate(fakeRoster, 11, snapshotRoster), 'zero overlap plus implausible count must still be rejected');
});

console.log(`\n${passed} checks passed.`);
