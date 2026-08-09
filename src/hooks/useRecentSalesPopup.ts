import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Timing/behavior defaults per ADR-0071 — kept as named constants so cadence
// can be tuned without touching the fetch/rotation logic below.
export const INITIAL_DELAY_MS = 4_000;
export const VISIBLE_DURATION_MS = 5_000;
export const GAP_MS = 4_000;
export const POLL_INTERVAL_MS = 45_000;
export const POOL_SIZE = 15;
export const SESSION_SHOWN_CAP = 6;

const SESSION_SHOWN_KEY = "recentSalesPopup:shownCount";
const SESSION_DISMISSED_KEY = "recentSalesPopup:dismissed";

// Self-purchase heuristic: while a checkout is in flight in this browser
// (pendingConversationId set by MysteryPurchase before redirecting to Stripe),
// suppress anything sold in the last 90s so a customer doesn't see their own
// purchase reflected back as a stranger's. Coarse on purpose — sale volume is
// low enough that this rarely drops anyone else's real notification.
const SELF_PURCHASE_WINDOW_MS = 90_000;

export interface RecentSale {
  mystery_title: string;
  purchaser_first_name: string | null;
  purchased_at: string;
}

function isDialogOpen() {
  return document.querySelector('[role="dialog"]') !== null;
}

function getShownCount() {
  return Number(sessionStorage.getItem(SESSION_SHOWN_KEY) || "0");
}

function incrementShownCount() {
  sessionStorage.setItem(SESSION_SHOWN_KEY, String(getShownCount() + 1));
}

export function dismissRecentSalesPopup() {
  sessionStorage.setItem(SESSION_DISMISSED_KEY, "1");
}

function isDismissed() {
  return sessionStorage.getItem(SESSION_DISMISSED_KEY) === "1";
}

export function useRecentSalesPopup(enabled: boolean) {
  const [current, setCurrent] = useState<RecentSale | null>(null);
  const poolRef = useRef<RecentSale[]>([]);
  const indexRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const clearTimers = () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };

    const fetchPool = async () => {
      const { data, error } = await supabase.rpc("get_recent_public_sales", {
        limit_count: POOL_SIZE,
      });
      if (!error && data && !cancelled) {
        const inSelfPurchaseWindow = Boolean(localStorage.getItem("pendingConversationId"));
        const cutoff = Date.now() - SELF_PURCHASE_WINDOW_MS;
        poolRef.current = inSelfPurchaseWindow
          ? (data as RecentSale[]).filter((sale) => new Date(sale.purchased_at).getTime() < cutoff)
          : (data as RecentSale[]);
      }
    };

    const scheduleNext = (delay: number) => {
      const timer = setTimeout(showNext, delay);
      timersRef.current.push(timer);
    };

    const showNext = () => {
      if (cancelled) return;

      if (isDismissed() || getShownCount() >= SESSION_SHOWN_CAP || isDialogOpen()) {
        setCurrent(null);
        scheduleNext(GAP_MS);
        return;
      }

      const pool = poolRef.current;
      if (pool.length === 0) {
        scheduleNext(GAP_MS);
        return;
      }

      const sale = pool[indexRef.current % pool.length];
      indexRef.current += 1;
      incrementShownCount();
      setCurrent(sale);

      const hideTimer = setTimeout(() => {
        setCurrent(null);
        scheduleNext(GAP_MS);
      }, VISIBLE_DURATION_MS);
      timersRef.current.push(hideTimer);
    };

    fetchPool().then(() => scheduleNext(INITIAL_DELAY_MS));

    const pollInterval = setInterval(fetchPool, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimers();
      clearInterval(pollInterval);
    };
  }, [enabled]);

  return current;
}
