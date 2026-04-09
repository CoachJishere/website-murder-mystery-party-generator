import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://www.mysterymaker.party',
  'https://mysterymaker.party',
  'http://localhost:5173',
  'http://localhost:3000',
];

const STRIPE_COUPON_ID = "co18EYxp";
const DISCOUNT_WINDOW_DAYS = 7;

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      throw new Error("user_id is required");
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user already has a promo code
    const { data: profile } = await supabase
      .from("profiles")
      .select("welcome_promo_code")
      .eq("id", user_id)
      .single();

    if (profile?.welcome_promo_code) {
      console.log("User already has a promo code:", profile.welcome_promo_code);
      return new Response(
        JSON.stringify({ success: true, promo_code: profile.welcome_promo_code, already_exists: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a unique, single-use promotion code via Stripe API
    const stripeResponse = await fetch("https://api.stripe.com/v1/promotion_codes", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        coupon: STRIPE_COUPON_ID,
        max_redemptions: "1",
        [`metadata[user_id]`]: user_id,
      }),
    });

    if (!stripeResponse.ok) {
      const error = await stripeResponse.text();
      throw new Error(`Stripe API error: ${error}`);
    }

    const promoData = await stripeResponse.json();
    const promoCode = promoData.code;

    // Calculate expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DISCOUNT_WINDOW_DAYS);

    // Save to profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        welcome_promo_code: promoCode,
        welcome_promo_expires_at: expiresAt.toISOString(),
      })
      .eq("id", user_id);

    if (updateError) {
      console.error("Failed to save promo code to profile:", updateError);
      throw new Error(`Database update error: ${updateError.message}`);
    }

    console.log(`Welcome discount created for user ${user_id}: ${promoCode}, expires ${expiresAt.toISOString()}`);

    return new Response(
      JSON.stringify({ success: true, promo_code: promoCode, expires_at: expiresAt.toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating welcome discount:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
