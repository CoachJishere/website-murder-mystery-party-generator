import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * One-time Edge Function: backfill-welcome-discounts
 *
 * Finds all users who signed up in the last 7 days without a purchase,
 * creates a unique Stripe promo code for each, and sends them a
 * "welcome discount" notification email.
 *
 * Safe to run multiple times — skips users who already have a promo code.
 * Can be deleted after running.
 */

const STRIPE_COUPON_ID = "co18EYxp";
const DISCOUNT_WINDOW_DAYS = 7;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!stripeSecretKey) {
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }), { status: 500 });
  }
  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Find eligible users: signed up in last 7 days, no promo code, no purchases
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - DISCOUNT_WINDOW_DAYS);

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, welcome_promo_code")
      .is("welcome_promo_code", null);

    if (profileError) throw profileError;

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];
    const results: { email: string; promo_code: string; days_left: number }[] = [];

    for (const profile of profiles || []) {
      try {
        // Get user details
        const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
        const user = userData?.user;
        if (!user?.email) { skipped++; continue; }

        // Check if signed up within 7 days
        const createdAt = new Date(user.created_at);
        if (createdAt < sevenDaysAgo) { skipped++; continue; }

        // Check if already purchased
        const { data: purchases } = await supabase
          .from("conversations")
          .select("id")
          .eq("user_id", profile.id)
          .eq("is_paid", true)
          .limit(1);

        if (purchases && purchases.length > 0) { skipped++; continue; }

        // Create unique Stripe promo code
        const stripeResponse = await fetch("https://api.stripe.com/v1/promotion_codes", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${stripeSecretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            coupon: STRIPE_COUPON_ID,
            max_redemptions: "1",
            [`metadata[user_id]`]: profile.id,
            [`metadata[source]`]: "backfill",
          }),
        });

        if (!stripeResponse.ok) {
          const err = await stripeResponse.text();
          errors.push(`${user.email}: Stripe error - ${err}`);
          continue;
        }

        const promoData = await stripeResponse.json();
        const promoCode = promoData.code;

        // Set expiry to 7 days from original signup
        const expiresAt = new Date(createdAt);
        expiresAt.setDate(expiresAt.getDate() + DISCOUNT_WINDOW_DAYS);

        // Save to profile
        await supabase
          .from("profiles")
          .update({
            welcome_promo_code: promoCode,
            welcome_promo_expires_at: expiresAt.toISOString(),
          })
          .eq("id", profile.id);

        // Calculate days left for email
        const hoursLeft = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
        const daysLeft = Math.max(0, Math.ceil(hoursLeft / 24));

        // Send notification email
        const userName = user.user_metadata?.full_name
          || user.user_metadata?.name
          || user.email.split("@")[0];

        const htmlBody = buildWelcomeDiscountEmail(userName, daysLeft);

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Mystery Maker <noreply@mysterymaker.party>",
            to: [user.email],
            subject: daysLeft <= 1
              ? "A special welcome gift — 20% off expires today!"
              : `A special welcome gift — 20% off for the next ${daysLeft} days`,
            html: htmlBody,
          }),
        });

        if (!resendResponse.ok) {
          const errText = await resendResponse.text();
          errors.push(`${user.email}: Resend error - ${errText}`);
          continue;
        }

        processed++;
        results.push({ email: user.email, promo_code: promoCode, days_left: daysLeft });
        console.log(`Backfilled ${user.email}: code=${promoCode}, ${daysLeft} days left`);

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (err) {
        errors.push(`${profile.id}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
        results,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Backfill error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function buildWelcomeDiscountEmail(name: string, daysLeft: number): string {
  const timePhrase = daysLeft <= 1
    ? "expires today"
    : `is valid for the next ${daysLeft} days`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">

      <!-- Header -->
      <div style="background: #C81400; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #F5F0E8; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">MYSTERY MAKER</h1>
      </div>

      <!-- Content -->
      <div style="background: #111111; padding: 40px 30px; border-radius: 0 0 8px 8px;">
        <h2 style="font-size: 22px; color: #F5F0E8; margin: 0 0 20px 0; font-weight: 700;">
          Welcome to Mystery Maker, ${name}!
        </h2>

        <p style="font-size: 16px; color: rgba(245,240,232,0.7); margin-bottom: 20px; line-height: 1.6;">
          We're so glad you're here. To help you get started, we'd like to offer you an exclusive welcome discount on your first murder mystery party package.
        </p>

        <!-- Discount callout -->
        <div style="background: #000000; border: 2px solid #C81400; padding: 24px; margin: 25px 0; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 8px 0; color: rgba(245,240,232,0.5); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            Your exclusive offer
          </p>
          <p style="margin: 0 0 12px 0; color: #F5F0E8; font-size: 32px; font-weight: 700;">
            20% OFF
          </p>
          <p style="margin: 0 0 8px 0; color: #F5F0E8; font-size: 18px; font-weight: 600;">
            <span style="text-decoration: line-through; color: rgba(245,240,232,0.4);">$24.99</span>
            &nbsp;&rarr;&nbsp;
            <span style="color: #C81400;">$19.99</span>
          </p>
          <p style="margin: 0; color: rgba(245,240,232,0.5); font-size: 14px;">
            This offer ${timePhrase}
          </p>
        </div>

        <p style="font-size: 16px; color: rgba(245,240,232,0.7); margin-bottom: 8px; line-height: 1.6;">
          Here's what you get with your mystery package:
        </p>

        <div style="background: #000000; border-left: 4px solid #C81400; padding: 20px; margin: 16px 0 25px; border-radius: 4px;">
          <p style="margin: 0 0 10px 0; color: #F5F0E8; font-size: 15px;">
            &#127917; <strong>A fully custom murder mystery</strong> tailored to your theme
          </p>
          <p style="margin: 0 0 10px 0; color: #F5F0E8; font-size: 15px;">
            &#128221; <strong>Complete host guide</strong> with step-by-step instructions
          </p>
          <p style="margin: 0 0 10px 0; color: #F5F0E8; font-size: 15px;">
            &#128100; <strong>Individual character scripts</strong> for every guest
          </p>
          <p style="margin: 0 0 10px 0; color: #F5F0E8; font-size: 15px;">
            &#128269; <strong>Evidence cards and clues</strong> ready to print
          </p>
          <p style="margin: 0; color: #F5F0E8; font-size: 15px;">
            &#128231; <strong>Email character assignments</strong> directly to guests
          </p>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 35px 0;">
          <a href="https://www.mysterymaker.party/dashboard?utm_source=welcome_discount&utm_medium=email&utm_campaign=backfill" style="display: inline-block; background: #C81400; color: #F5F0E8; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            Create Your Mystery &amp; Save 20%
          </a>
        </div>

        <p style="color: rgba(245,240,232,0.5); font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(245,240,232,0.1); line-height: 1.6;">
          Your discount is applied automatically at checkout — no code needed. Just create your mystery and the savings will be waiting for you.
        </p>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding: 20px; color: rgba(245,240,232,0.35); font-size: 12px;">
        <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.5); text-decoration: none;">mysterymaker.party</a>
      </div>
    </body>
    </html>
  `;
}
