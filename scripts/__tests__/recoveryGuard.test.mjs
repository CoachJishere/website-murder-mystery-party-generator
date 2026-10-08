/**
 * Offline test for the character re-fire guard (ADR-0148). No network. Run: node scripts/__tests__/recoveryGuard.test.mjs
 * Guards the 2026-10-07 incident: "Death And Dumplings" had master_context = '' and the recovery loop still fired 10 character
 * re-fires (1.50 USD logged) that could not write anything.
 */
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
const { transformSync } = await import('esbuild');
const src = readFileSync(new URL('../../supabase/functions/_shared/recovery-guard.ts', import.meta.url), 'utf8');
const js = transformSync(src, { loader: 'ts', format: 'esm' }).code;
const { masterContextUsable, partitionRecoveryTargets, MASTER_CONTEXT_MIN_CHARS } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
let passed = 0;
const check = (n, fn) => { fn(); passed++; console.log(`  ok - ${n}`); };
const big = 'x'.repeat(MASTER_CONTEXT_MIN_CHARS);
const names = ['Toni/Tony Delgado', 'Mo/Moe Osborne'];

check('empty, null and undefined master_context are unusable', () => {
  for (const v of ['', null, undefined]) assert.equal(masterContextUsable(v), false);
});
check('threshold is exactly 1000 characters', () => {
  assert.equal(masterContextUsable('x'.repeat(MASTER_CONTEXT_MIN_CHARS - 1)), false);
  assert.equal(masterContextUsable(big), true);
});
check('empty master_context blocks every target and fires none', () => {
  const r = partitionRecoveryTargets(names, '');
  assert.deepEqual(r.fire, []);
  assert.deepEqual(r.blocked, names);
});
check('a usable master_context lets every target fire and blocks none', () => {
  const r = partitionRecoveryTargets(names, big);
  assert.deepEqual(r.fire, names);
  assert.deepEqual(r.blocked, []);
});
check('no targets is a no-op either way', () => {
  assert.deepEqual(partitionRecoveryTargets([], ''), { fire: [], blocked: [] });
  assert.deepEqual(partitionRecoveryTargets([], big), { fire: [], blocked: [] });
});
check('the input array is not mutated', () => {
  const t = [...names];
  partitionRecoveryTargets(t, big).fire.push('x');
  assert.deepEqual(t, names);
});
console.log(`${passed} checks passed`);
