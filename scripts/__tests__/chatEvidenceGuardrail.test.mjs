/**
 * Offline wiring test for the concept-chat guardrail on evidence cards and extra documents (ADR-0103 Addendum 99).
 * No network, no paid API. Run: node scripts/__tests__/chatEvidenceGuardrail.test.mjs
 *
 * The bug: a customer asked for "8 pieces of evidence"; the chat repeated "8 printable evidence cards" in five replies and
 * wrote that it noted a story-form reference text and a visual schedule "as delivery requirements". The package has three
 * evidence cards (Rounds 2 to 4) and neither document. The customer found out after delivery.
 */
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../../supabase/functions/mystery-ai/index.ts', import.meta.url), 'utf8');
let passed = 0;
function check(name, fn) { fn(); passed++; console.log('  ok - ' + name); }

const i = src.indexOf('CRITICAL: The package contains exactly THREE evidence cards');
const block = i > -1 ? src.slice(i, src.indexOf('`;', i)) : '';

check('the guardrail exists', () => assert.ok(i > -1));
check('it fixes the number at three, one each for Rounds 2, 3 and 4', () => {
  assert.ok(/exactly THREE evidence cards/.test(block));
  assert.ok(/Round 2 \(motive\)/.test(block) && /Round 3 \(method\)/.test(block) && /Round 4 \(opportunity\)/.test(block));
});
check('it forbids agreeing to, or repeating, a larger number', () => {
  assert.ok(/do NOT agree to it, do NOT repeat a larger number back/.test(block));
});
check('it tells the model to say so in the same reply and where red herrings go instead', () => {
  assert.ok(/in the same reply/.test(block) && /red herrings and extra clues are woven into those three cards/.test(block));
});
check('it blocks promising extra documents and the "noted as a delivery requirement" phrasing', () => {
  assert.ok(/story-form summary/.test(block) && /visual timeline or movement grid/.test(block));
  assert.ok(/noting" such a request "as a delivery requirement"/.test(block));
});
check('it is appended to the system prompt unconditionally, inside the same block as the other CRITICAL guardrails', () => {
  assert.ok(src.slice(i - 20, i).includes('systemPrompt +=') || src.slice(i - 40, i).includes('systemPrompt +='));
  const before = src.slice(0, i);
  assert.ok(before.lastIndexOf('systemPrompt += `\\n\\nCRITICAL: Every mystery has exactly ONE victim') > -1);
  assert.ok(src.indexOf('// Format messages for Anthropic API') > i);
});
check('no template-literal breakers inside the block (backtick or ${)', () => {
  assert.ok(!block.includes('${') && !block.includes('`'));
});
console.log(`\n${passed} checks passed.`);
