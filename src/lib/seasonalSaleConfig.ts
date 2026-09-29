export interface SeasonalSale {
  id: "halloween" | "holiday";
  promoCode: string;
  startsAt: number;
  endsAt: number;
}

// Both Stripe promo codes (HALLOWEEN20, HOLIDAY20) were created directly in
// the Stripe Dashboard with redeem_by set to Oct 31 / Dec 31 at 11:59pm in
// Jonathan's local timezone (Europe/Madrid). Spain is on CET (UTC+1) on both
// of these dates in 2026 (DST ends the last Sunday of October, the 25th), so
// the cutoffs below are anchored to that offset. If the Stripe dashboard
// account timezone is ever different, these two endsAt values need updating
// to match Stripe's actual redeem_by instant — showing the banner past that
// moment means the checkout page silently drops the "expired" promo code
// with no explanation to the customer (same failure mode as ADR-0119).
export const SEASONAL_SALES: SeasonalSale[] = [
  {
    id: "halloween",
    promoCode: "HALLOWEEN20",
    startsAt: Date.UTC(2026, 8, 1, 0, 0, 0), // effectively "now" - well before launch
    endsAt: Date.UTC(2026, 9, 31, 22, 59, 59), // Oct 31 23:59:59 CET
  },
  {
    id: "holiday",
    promoCode: "HOLIDAY20",
    startsAt: Date.UTC(2026, 9, 31, 23, 0, 0), // Nov 1 00:00:00 CET
    endsAt: Date.UTC(2026, 11, 31, 22, 59, 59), // Dec 31 23:59:59 CET
  },
];

export function getActiveSeasonalSale(): SeasonalSale | null {
  const now = Date.now();
  return SEASONAL_SALES.find((sale) => now >= sale.startsAt && now <= sale.endsAt) ?? null;
}
