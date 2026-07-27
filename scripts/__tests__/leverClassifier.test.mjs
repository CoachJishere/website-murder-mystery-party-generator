/**
 * Offline unit test for the SEO lever classifier (ADR-0045). No network, no paid
 * API. Run: node scripts/__tests__/leverClassifier.test.mjs
 */
import assert from 'node:assert';
import { buildExpectedCtrCurve, expectedCtrAt, classifyLever, FALLBACK_CTR_CURVE } from '../_seoLever.mjs';

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

// Zero-inflation guard: a bucket full of 0-click long-tail queries plus a few
// clickers must NOT collapse expected CTR to 0 (the live-data bug from 2026-07-27).
check('zero-inflated bucket does not collapse expected CTR to 0', () => {
  const zeroInflated = [
    ...Array.from({ length: 90 }, () => ({ ctr: 0, position: 4, impressions: 100, clicks: 0 })),
    ...Array.from({ length: 10 }, () => ({ ctr: 10, position: 4, impressions: 100, clicks: 10 })),
  ];
  const curve = buildExpectedCtrCurve(zeroInflated);
  // weighted = 100 clicks / 10000 impr = 1%, floored at FALLBACK[4]*0.5 = 4 → 4, never 0
  assert.ok(expectedCtrAt(4, curve) >= FALLBACK_CTR_CURVE[4] * 0.5);
  assert.ok(expectedCtrAt(4, curve) > 0);
});

// Dense healthy bucket self-calibrates ABOVE the static curve.
check('dense high-CTR bucket calibrates above the static curve', () => {
  const rich = Array.from({ length: 10 }, () => ({ ctr: 12, position: 4, impressions: 300, clicks: 36 }));
  const curve = buildExpectedCtrCurve(rich);
  assert.strictEqual(expectedCtrAt(4, curve), 12); // 3600/30000 = 12% > static 8%
});

// Already-winning query (great CTR, low position) → watch, not a surfaced action.
check('over-performing page-1 query → watch (not links)', () => {
  const v = classifyLever({ query: 'x', ctr: 23, position: 6.5 }, buildExpectedCtrCurve([{ ctr: 0, position: 6, impressions: 10 }]));
  assert.strictEqual(v.lever, 'watch');
});

console.log(`\n${passed} checks passed`);
