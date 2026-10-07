/**
 * Offline test for auto-remediate-packages' per-detector failure isolation. No network. Run: node scripts/__tests__/detectorGuard.test.mjs
 * Guards the 2026-10-07 incident: list_packages_with_meta_text_leak hit a statement timeout and aborted the whole run,
 * so the free dangling_quote_mark heal after it did not run for 35 minutes (ADR-0103 Addendum 87 Update 3).
 */
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
const { transformSync } = await import('esbuild');
const load = async (rel) => {
  const src = readFileSync(new URL(rel, import.meta.url), 'utf8');
  const js = transformSync(src, { loader: 'ts', format: 'esm' }).code;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
};
const { runDetectorGuarded, detectorFailureAlert, runWindowDays, HELD_RUN_WINDOW_DAYS } = await load('../../supabase/functions/auto-remediate-packages/detector-guard.ts');
let passed = 0;
const check = async (n, fn) => { await fn(); passed++; console.log(`  ok - ${n}`); };
const quiet = async (fn) => { const e = console.error; console.error = () => {}; try { return await fn(); } finally { console.error = e; } };

await check('a healthy detector returns its rows and records nothing', async () => {
  const failures = [];
  const rows = await runDetectorGuarded('a', async () => [{ package_id: 'p1' }], failures);
  assert.deepStrictEqual(rows, [{ package_id: 'p1' }]); assert.deepStrictEqual(failures, []);
});
await check('the live case: a statement timeout is recorded and returns no rows instead of throwing', async () => {
  const failures = [];
  const rows = await quiet(() => runDetectorGuarded('list_packages_with_meta_text_leak',
    async () => { throw new Error('detector list_packages_with_meta_text_leak failed: canceling statement due to statement timeout'); }, failures));
  assert.deepStrictEqual(rows, []);
  assert.strictEqual(failures.length, 1); assert.strictEqual(failures[0].rpc, 'list_packages_with_meta_text_leak');
  assert.match(failures[0].message, /statement timeout/);
});
await check('a failure does not stop later detectors in the same run', async () => {
  const failures = []; const ran = [];
  for (const [rpc, boom] of [['meta', true], ['dangling_quote', false], ['header', false]]) {
    await quiet(() => runDetectorGuarded(rpc, async () => { ran.push(rpc); if (boom) throw new Error('x'); return []; }, failures));
  }
  assert.deepStrictEqual(ran, ['meta', 'dangling_quote', 'header']); assert.strictEqual(failures.length, 1);
});
await check('a statement timeout is retried once and a recovery records nothing', async () => {
  const failures = []; let calls = 0;
  const rows = await quiet(() => runDetectorGuarded('a', async () => {
    calls++; if (calls === 1) throw new Error('canceling statement due to statement timeout'); return [{ package_id: 'p1' }];
  }, failures));
  assert.strictEqual(calls, 2); assert.deepStrictEqual(rows, [{ package_id: 'p1' }]); assert.deepStrictEqual(failures, []);
});
await check('two timeouts in a row are recorded once, after exactly two attempts', async () => {
  const failures = []; let calls = 0;
  const rows = await quiet(() => runDetectorGuarded('a', async () => { calls++; throw new Error('canceling statement due to statement timeout'); }, failures));
  assert.strictEqual(calls, 2); assert.deepStrictEqual(rows, []); assert.strictEqual(failures.length, 1);
});
await check('any other error is not retried', async () => {
  const failures = []; let calls = 0;
  await quiet(() => runDetectorGuarded('a', async () => { calls++; throw new Error('permission denied for function'); }, failures));
  assert.strictEqual(calls, 1); assert.strictEqual(failures.length, 1);
});
await check('window: the full run keeps 30 days, the held run scans 7, narrow requests still narrow, backfill wins', () => {
  assert.strictEqual(HELD_RUN_WINDOW_DAYS, 7);
  assert.strictEqual(runWindowDays(0, NaN, 30, false), 30);
  assert.strictEqual(runWindowDays(0, 0, 30, true), 7);
  assert.strictEqual(runWindowDays(0, 3, 30, true), 3);
  assert.strictEqual(runWindowDays(0, 90, 30, false), 30);
  assert.strictEqual(runWindowDays(60, 0, 30, true), 60);
});
await check('non-Error throws are recorded as text', async () => {
  const failures = [];
  await quiet(() => runDetectorGuarded('a', async () => { throw 'boom'; }, failures));
  assert.strictEqual(failures[0].message, 'boom');
});
await check('one alert body per run, none when nothing failed', () => {
  assert.strictEqual(detectorFailureAlert([]), null);
  const body = detectorFailureAlert([{ rpc: 'a', message: 'm1' }, { rpc: 'b', message: 'm2' }]);
  assert.match(body, /^2 detector\(s\) failed/); assert.match(body, /- a: m1/); assert.match(body, /- b: m2/);
});
await check('index.ts: class sweeps go through sweep(); only the two re-detect gates call callDetector directly', () => {
  const src = readFileSync(new URL('../../supabase/functions/auto-remediate-packages/index.ts', import.meta.url), 'utf8');
  const direct = [...src.matchAll(/await callDetector\(([^)]*)\)/g)].map((m) => m[1].trim());
  assert.deepStrictEqual(direct.sort(), ['DETECTOR_RPC.confession_names_cast_member, sinceIso', 'DETECTOR_RPC[defectClass], sinceIso', 'rpc, sinceIso'].sort());
  assert.ok(!/filterNeedsReview\(await callDetector\(DETECTOR_RPC/.test(src), 'a class sweep bypasses the guard');
  assert.ok(src.includes('detector_failures: detectorFailures'), 'summary must report detector failures');
});
console.log(`${passed} passed`);
