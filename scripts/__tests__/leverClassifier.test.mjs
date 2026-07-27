/**
 * Offline unit test for the SEO lever classifier (ADR-0045). No network, no paid
 * API. Run: node scripts/__tests__/leverClassifier.test.mjs
 */
import assert from 'node:assert';
import { buildExpectedCtrCurve, expectedCtrAt, classifyLever } from '../_seoLever.mjs';

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok — ${name}`);
}

// Thin dataset → curve falls back to the static curve for every position.
const thin = [{ ctr: 5, position: 3, impressions: 40 }];
const fallbackCurve = buildExpectedCtrCurve(thin);
check('thin buckets fall back to the static curve', () => {
  assert.strictEqual(expectedCtrAt(3, fallbackCurve), 11); // FALLBACK_CTR_CURVE[3]
  assert.strictEqual(expectedCtrAt(14, fallbackCurve), 1.3);
});

// >=5 queries in a bucket → self-calibrated median wins over the static curve.
const rich = [
  ...Array.from({ length: 6 }, () => ({ ctr: 20, position: 3, impressions: 50 })),
];
const calibrated = buildExpectedCtrCurve(rich);
check('self-calibrates from our own data when a bucket is dense', () => {
  assert.strictEqual(expectedCtrAt(3, calibrated), 20); // median of our own, not the static 11
});

// The real /custom-murder-mystery-party case: pos 14.5, CTR ~0 → page-2, links.
check('page-2 query with normal/low CTR → links (NOT copy)', () => {
  const v = classifyLever({ query: 'custom murder mystery party', ctr: 0, position: 14.5 }, fallbackCurve);
  assert.strictEqual(v.lever, 'links');
  assert.ok(!/rewrite|title\/meta/i.test(v.reason) || /NOT a copy/i.test(v.reason));
});

// Page-1 under-clicker → copy is a legitimate lever (Jonathan's "copy sometimes matters").
check('page-1 result under-clicking for its rank → copy', () => {
  // pos 3, expected 11%, actual 4% → gap -7 (well past max(1.5, 4.4)) → copy
  const v = classifyLever({ query: 'x', ctr: 4, position: 3 }, fallbackCurve);
  assert.strictEqual(v.lever, 'copy');
});

// Page-2 AND under-clicking → both.
check('page-2 and under-clicking → both', () => {
  // pos 12, expected 1.6%, actual 0% → gap -1.6 (past 1.5 floor) → both
  const v = classifyLever({ query: 'x', ctr: 0, position: 12 }, fallbackCurve);
  assert.strictEqual(v.lever, 'both');
});

// Page-1 clicking at/above expected → watch (not surfaced as an action).
check('healthy page-1 result → watch', () => {
  const v = classifyLever({ query: 'x', ctr: 12, position: 3 }, fallbackCurve);
  assert.strictEqual(v.lever, 'watch');
});

// Near-miss position 5–10 with healthy CTR → links (small authority nudge).
check('near-miss pos 5–10, healthy CTR → links', () => {
  const v = classifyLever({ query: 'x', ctr: 6.5, position: 5 }, fallbackCurve);
  assert.strictEqual(v.lever, 'links');
});

console.log(`\n${passed} checks passed`);
