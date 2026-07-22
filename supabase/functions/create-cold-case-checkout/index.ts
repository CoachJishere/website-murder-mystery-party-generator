// create-cold-case-checkout — the landing page's brief box → Stripe Checkout (ADR-0029).
//
// POST { brief?: string }  →  { url }  (the Stripe-hosted checkout)
//
// The buyer types their case brief (era/place/details, free text) on the landing page —
// the familiar "describe what you want" gesture from the party homepage — and it rides
// into checkout as session metadata. Blank brief = "surprise me" (the engine invents).
// This replaces Payment-Link custom fields: the brief belongs where the pitch is, not
// on Stripe's sterile checkout form. Guests only (no login) — verify_jwt is off; the
// endpoint is public and rate-limited, and it can only ever create a checkout session.
//
// Config: COLD_CASE_PRICE_ID (Stripe price) — until it's set the endpoint returns
// {error:"not_configured"} and the landing renders its "Opening soon" state.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.17.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

// Best-effort per-IP rate limit (public endpoint)
const RL_WINDOW_MS = 5 * 60 * 1000;
const RL_MAX = 20;
const hits = new Map<string, { n: number; t: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > RL_WINDOW_MS) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  h.n++;
  return h.n > RL_MAX;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return json({ error: "rate_limited" }, 429);

  const priceId = Deno.env.get("COLD_CASE_PRICE_ID");
  if (!priceId) return json({ error: "not_configured" }, 503);

  try {
    const { brief, email, user_id } = await req.json().catch(() => ({}));
    // Stripe caps each metadata value at 500 chars; the webhook composes the brief from
    // BOTH setting_era and details, so a long premise (the chat's output) splits across them.
    const briefText = String(brief || "").trim().slice(0, 1000);
    const briefHead = briefText.slice(0, 500);
    const briefTail = briefText.slice(500);
    const buyerEmail = typeof email === "string" && /.+@.+\..+/.test(email) ? email : undefined;
    const userId = typeof user_id === "string" && /^[0-9a-f-]{36}$/.test(user_id) ? user_id : undefined;

    // Welcome discount (same 7-day window as the party product — the signup that gated
    // the free trial started this countdown). Auto-apply the buyer's personal promo code
    // when it's still valid; fail OPEN — a discount lookup problem must never block a sale.
    let discountPromoId: string | undefined;
    if (userId) {
      try {
        const admin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const { data: profile } = await admin
          .from("profiles")
          .select("welcome_promo_code, welcome_promo_expires_at")
          .eq("id", userId)
          .single();
        if (
          profile?.welcome_promo_code &&
          profile.welcome_promo_expires_at &&
          new Date(profile.welcome_promo_expires_at) > new Date()
        ) {
          // Resolve the human code to its Stripe id; skip if already redeemed/inactive.
          const codes = await stripe.promotionCodes.list({ code: profile.welcome_promo_code, limit: 1 });
          const promo = codes.data[0];
          if (promo?.active) discountPromoId = promo.id;
        }
      } catch (e) {
        console.error("[create-cold-case-checkout] discount lookup failed (continuing):", e?.message || e);
      }
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://www.mysterymaker.party";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      // Stripe forbids discounts + allow_promotion_codes together; auto-apply wins.
      ...(discountPromoId
        ? { discounts: [{ promotion_code: discountPromoId }] }
        : { allow_promotion_codes: true }),
      ...(buyerEmail && { customer_email: buyerEmail }),
      metadata: {
        product: "cold_case",
        ...(briefHead && { setting_era: briefHead }),
        ...(briefTail && { details: briefTail }),
        ...(userId && { user_id: userId }),
      },
      // After payment the buyer lands on their own status page (resolved via session id);
      // the confirmation email is the durable path either way.
      success_url: `${siteUrl}/cold-case/thanks?sid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cold-case-files`,
    });

    return json({ url: session.url });
  } catch (e) {
    console.error("[create-cold-case-checkout] error:", e?.message || e);
    return json({ error: "checkout_failed" }, 500);
  }
});
