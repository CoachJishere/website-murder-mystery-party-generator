// Temporary notice: Jonathan is away Oct 8 (morning CET) to Oct 13 (morning CET), 2026.
// Shown to PAID mysteries only (mystery page banner + the "ready" email), never on
// pre-purchase pages. Self-expiring: nothing to remove for correctness, but delete
// the banner mount in MysteryView.tsx and the `awayNotice` locale keys afterwards.
//
// The same window is duplicated in supabase/functions/send-mystery-ready-email/index.ts
// (edge functions cannot import from src/). Keep the two in sync.
//
// Spain is on CEST (UTC+2) until Oct 25, 2026.
export const AWAY_NOTICE_STARTS_AT = Date.UTC(2026, 9, 7, 0, 0, 0); // shown from the evening before
export const AWAY_NOTICE_ENDS_AT = Date.UTC(2026, 9, 13, 10, 0, 0); // Oct 13 12:00 CEST

export function isAwayNoticeActive(now: number = Date.now()): boolean {
  return now >= AWAY_NOTICE_STARTS_AT && now <= AWAY_NOTICE_ENDS_AT;
}
