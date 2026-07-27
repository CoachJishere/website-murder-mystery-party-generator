/**
 * SEO lever diagnostic — pure, testable, no network. See ADR-0045.
 *
 * Separates two independent axes so the weekly digest can tell a copy problem
 * from an authority problem (and flag when it's both):
 *   - CTR gap  = actual CTR − expected CTR for that position  → copy / SERP-appeal
 *   - position band (page 1 / page 2 / near-miss)             → relevance + authority
 *
 * CTR units throughout are percentages on the same scale the snapshot uses
 * (e.g. 5.4 means 5.4%), and position is the GSC average (e.g. 8.5).
 */

// Static GSC-aggregate CTR-by-position curve (%). Used only as a fallback for
// position buckets where we don't have enough of our own queries to self-calibrate.
export const FALLBACK_CTR_CURVE = {
  1: 27, 2: 15, 3: 11, 4: 8, 5: 6.5, 6: 5, 7: 4, 8: 3.3, 9: 2.8, 10: 2.5,
  11: 1.8, 12: 1.6, 13: 1.4, 14: 1.3, 15: 1.2, 16: 1.1, 17: 1.0, 18: 1.0, 19: 0.9, 20: 0.9,
};

// A self-calibrated bucket needs this much impression volume to be trusted; and
// we never let a (noisy, zero-inflated) self-calibrated value fall below half the
// static curve. Our query set is heavily zero-inflated — most long-tail queries
// get 0 clicks in a week — so a *median* per-query CTR collapses to 0. We use the
// impression-weighted CTR (sum clicks / sum impressions) instead, which is the
// correct "share of impressions that get clicked at this position" statistic.
const MIN_BUCKET_IMPRESSIONS = 200;

/**
 * Build a self-calibrating expected-CTR curve from our own query rows.
 * rows: [{ ctr, position, impressions, clicks? }]. For each position 1..20, uses
 * the impression-weighted CTR of that bucket when it has real volume, else falls
 * back to FALLBACK_CTR_CURVE. Floored at half the static curve so a zero-inflated
 * bucket can never zero out copy detection.
 */
export function buildExpectedCtrCurve(rows) {
  const byPos = new Map(); // p -> { clicks, impressions }
  for (const r of rows) {
    const p = Math.round(r.position);
    if (p < 1 || p > 20) continue;
    const impressions = r.impressions || 0;
    const clicks = r.clicks != null ? r.clicks : Math.round((r.ctr / 100) * impressions);
    const b = byPos.get(p) || { clicks: 0, impressions: 0 };
    b.clicks += clicks;
    b.impressions += impressions;
    byPos.set(p, b);
  }
  const curve = {};
  for (let p = 1; p <= 20; p++) {
    const b = byPos.get(p);
    if (b && b.impressions >= MIN_BUCKET_IMPRESSIONS && b.clicks > 0) {
      const weighted = Math.round((b.clicks / b.impressions) * 1000) / 10; // %
      curve[p] = Math.max(weighted, FALLBACK_CTR_CURVE[p] * 0.5);
    } else {
      curve[p] = FALLBACK_CTR_CURVE[p];
    }
  }
  return curve;
}

export function expectedCtrAt(position, curve) {
  const p = Math.max(1, Math.min(20, Math.round(position)));
  return curve[p] ?? FALLBACK_CTR_CURVE[p] ?? 0.9;
}

/**
 * Classify a single query into a lever verdict. `q` needs { query, ctr, position }.
 * Returns { expectedCtr, ctrGap, lever, reason }.
 *
 * "Under-clicking" is an absolute floor (1.5pp) OR a relative one (40% of
 * expected), whichever is larger — so a pos-3 result at 11% expected must miss
 * by ~4.4pp to flag, while a pos-12 result at 1.6% expected flags on the 1.5pp
 * floor rather than an implausibly tiny relative gap.
 */
export function classifyLever(q, curve) {
  const expected = expectedCtrAt(q.position, curve);
  const ctrGap = Math.round((q.ctr - expected) * 10) / 10;
  const underClicking = ctrGap <= -Math.max(1.5, expected * 0.4);
  const overClicking = q.ctr >= expected * 1.5; // already winning CTR for its rank — not an action item
  const onPage2 = q.position > 10 && q.position <= 20;
  const nearPage1 = q.position >= 5 && q.position <= 10;

  let lever, reason;
  if (onPage2 && underClicking) {
    lever = 'both';
    reason = `pos ${q.position}, CTR ${q.ctr}% vs ~${expected}% expected — needs authority (to rank) AND copy (under-clicking)`;
  } else if (onPage2) {
    lever = 'links';
    reason = `pos ${q.position}, CTR ${q.ctr}% is normal for the rank — authority / internal-links problem, NOT a copy rewrite`;
  } else if (underClicking) {
    lever = 'copy';
    reason = `pos ${q.position} (page 1) but CTR ${q.ctr}% vs ~${expected}% expected — title/meta appeal; verify the query isn't already in the title before rewriting`;
  } else if (nearPage1 && !overClicking) {
    lever = 'links';
    reason = `pos ${q.position} — one nudge from page 1; CTR is fine for the rank, so a small authority push, not copy`;
  } else {
    lever = 'watch';
    reason = `pos ${q.position}, CTR ${q.ctr}% — ${overClicking ? 'already over-performing on CTR for its rank' : 'near expected on both axes'}; monitor`;
  }
  return { expectedCtr: expected, ctrGap, lever, reason };
}
