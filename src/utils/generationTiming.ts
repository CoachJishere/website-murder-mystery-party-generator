// Generation timing scales with cast size (ADR-0043 follow-up, ADR-0138, ADR-0139). Shared by the purchase page (the wait we state
// BEFORE the customer pays) and the package page (progress screen and timeout), so the two can never disagree.
//
// Tiers map to the mysteryView.timing.{small,medium,large,xlarge} i18n keys, which state the measured range (paid packages since
// 2026-08-01, plus the quality review): small up to 35 min, medium and large up to 60, xlarge up to 75. The timeout, after which the
// package page shows the "team notified" card, is kept above the upper end of the range we display for that tier (plus 5 minutes),
// so a slow but healthy package never alarms the customer before the time we promised. (Until 2026-10-04 these were 20/30/40/50,
// below the ranges now displayed.)
export const getGenerationTiming = (playerCount: number): { etaKey: string; timeoutMin: number } => {
  const n = playerCount || 6;
  if (n <= 10) return { etaKey: 'small', timeoutMin: 40 };
  if (n <= 18) return { etaKey: 'medium', timeoutMin: 65 };
  if (n <= 28) return { etaKey: 'large', timeoutMin: 65 };
  return { etaKey: 'xlarge', timeoutMin: 80 };
};
