import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { isDiscountActive, getTimeRemaining, type TimeRemaining, type DiscountInfo } from "@/lib/discountUtils";

export function useWelcomeDiscount() {
  const { isAuthenticated, user } = useAuth();
  const [discountInfo, setDiscountInfo] = useState<DiscountInfo | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPurchased, setHasPurchased] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setLoading(false);
      return;
    }

    // generate-welcome-discount (SignUp.tsx) is invoked non-blocking right after
    // signup, with no retry of its own. A customer who reaches this page fast
    // enough can beat that write to `profiles` - without a retry here, this
    // hook's one-shot fetch finds no promo code, never re-checks, and the
    // customer sees full price for the rest of the session even after the row
    // is populated moments later. The generation call normally completes in
    // well under a second, so a handful of short retries covers the race
    // without meaningfully delaying page render for customers who never had a
    // welcome discount at all (id-verified 2026-09-05 sweep: 5 of 8 full-price
    // purchases in a 2-week window were same-session buyers with a still-valid,
    // unredeemed promo code sitting unused in `profiles`).
    let cancelled = false;
    const RETRY_DELAYS_MS = [500, 1000, 2000, 3000];

    const fetchDiscount = async (attempt = 0): Promise<void> => {
      try {
        // Fetch promo info and purchase status in parallel
        const [profileResult, purchaseResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("welcome_promo_code, welcome_promo_expires_at")
            .eq("id", user.id)
            .single(),
          supabase
            .from("conversations")
            .select("id")
            .eq("user_id", user.id)
            .eq("is_paid", true)
            .limit(1),
        ]);

        if (cancelled) return;

        if (purchaseResult.data && purchaseResult.data.length > 0) {
          setHasPurchased(true);
          setLoading(false);
          return;
        }

        const profile = profileResult.data;
        if (profile?.welcome_promo_code && profile?.welcome_promo_expires_at) {
          if (isDiscountActive(profile.welcome_promo_expires_at)) {
            setDiscountInfo({
              promoCode: profile.welcome_promo_code,
              expiresAt: profile.welcome_promo_expires_at,
            });
            setTimeRemaining(getTimeRemaining(profile.welcome_promo_expires_at));
          }
          setLoading(false);
          return;
        }

        if (attempt < RETRY_DELAYS_MS.length) {
          setTimeout(() => fetchDiscount(attempt + 1), RETRY_DELAYS_MS[attempt]);
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching welcome discount:", error);
        if (!cancelled) setLoading(false);
      }
    };

    fetchDiscount();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.id]);

  // Update countdown every 15s — at 60s a customer could click "buy" up to a
  // minute after actual expiry while the UI still showed time remaining, and
  // Stripe silently drops the expired promo code (full price, no explanation).
  useEffect(() => {
    if (!discountInfo) return;

    const interval = setInterval(() => {
      const remaining = getTimeRemaining(discountInfo.expiresAt);
      setTimeRemaining(remaining);

      if (remaining.expired) {
        setDiscountInfo(null);
        setTimeRemaining(null);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [discountInfo]);

  return {
    discountInfo,
    timeRemaining,
    loading,
    hasPurchased,
    isActive: !!discountInfo && !hasPurchased,
  };
}
