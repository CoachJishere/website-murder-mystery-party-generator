import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function: send-discount-reminders
 *
 * Called by a daily pg_cron job. Sends two reminder emails:
 * - Day 5 (48h before expiry): Friendly nudge
 * - Day 7 morning (hours before expiry): Final urgency
 *
 * Only sends to users who haven't purchased yet.
 */

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    return new Response(
      JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const now = new Date();

    // Find users with active welcome discounts who haven't purchased
    // Day 5 reminder: expires_at is between 24h and 48h from now
    // Day 7 reminder: expires_at is between 0 and 24h from now
    const { data: eligibleUsers, error: fetchError } = await supabase
      .from("profiles")
      .select("id, welcome_promo_code, welcome_promo_expires_at, discount_reminder_day5_sent, discount_reminder_day7_sent")
      .not("welcome_promo_code", "is", null)
      .gt("welcome_promo_expires_at", now.toISOString());

    if (fetchError) throw fetchError;

    if (!eligibleUsers || eligibleUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No eligible users" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const profile of eligibleUsers) {
      try {
        const expiresAt = new Date(profile.welcome_promo_expires_at);
        const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Determine which reminder to send
        let reminderType: "day5" | "day7" | null = null;

        if (hoursUntilExpiry <= 48 && hoursUntilExpiry > 24 && !profile.discount_reminder_day5_sent) {
          reminderType = "day5";
        } else if (hoursUntilExpiry <= 24 && hoursUntilExpiry > 0 && !profile.discount_reminder_day7_sent) {
          reminderType = "day7";
        }

        if (!reminderType) continue;

        // Check if user has purchased
        const { data: purchases } = await supabase
          .from("conversations")
          .select("id")
          .eq("user_id", profile.id)
          .eq("is_paid", true)
          .limit(1);

        if (purchases && purchases.length > 0) continue;

        // Get user email
        const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
        const userEmail = userData?.user?.email;
        if (!userEmail) continue;

        const userName = userData?.user?.user_metadata?.full_name
          || userData?.user?.user_metadata?.name
          || userEmail.split("@")[0];

        const hoursLeft = Math.round(hoursUntilExpiry);
        const subject = reminderType === "day5"
          ? "Your 20% welcome discount expires in 2 days"
          : `Your 20% discount expires ${hoursLeft <= 12 ? "in a few hours" : "tonight"}`;

        const htmlBody = buildReminderEmail(userName, reminderType, hoursLeft);

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Mystery Maker <noreply@mysterymaker.party>",
            to: [userEmail],
            subject,
            html: htmlBody,
          }),
        });

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text();
          errors.push(`${profile.id}: Resend error ${resendResponse.status}`);
          console.error(`Failed to send reminder for ${profile.id}:`, errorText);
          continue;
        }

        // Mark reminder as sent
        const updateField = reminderType === "day5"
          ? { discount_reminder_day5_sent: true }
          : { discount_reminder_day7_sent: true };

        await supabase
          .from("profiles")
          .update(updateField)
          .eq("id", profile.id);

        sentCount++;
        console.log(`Sent ${reminderType} discount reminder to ${profile.id}`);
      } catch (err) {
        errors.push(`${profile.id}: ${err.message}`);
        console.error(`Error processing ${profile.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        total: eligibleUsers.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-discount-reminders:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function buildReminderEmail(name: string, type: "day5" | "day7", hoursLeft: number): string {
  const urgencyText = type === "day5"
    ? "You still have 2 days to claim your exclusive welcome discount."
    : `Your welcome discount expires ${hoursLeft <= 12 ? "in just a few hours" : "tonight"} — this is your last chance to save.`;

  const ctaText = type === "day5"
    ? "Create Your Mystery Now"
    : "Claim Your Discount Before It's Gone";

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
          ${type === "day5" ? "Don't forget your 20% discount!" : "Last chance for 20% off!"}
        </h2>

        <p style="font-size: 16px; color: rgba(245,240,232,0.7); margin-bottom: 20px; line-height: 1.6;">
          Hey ${name}, ${urgencyText}
        </p>

        <!-- Discount callout -->
        <div style="background: #000000; border-left: 4px solid #C81400; padding: 20px; margin: 25px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; color: #F5F0E8; font-size: 18px; font-weight: 700;">
            <span style="text-decoration: line-through; color: rgba(245,240,232,0.5);">$24.99</span>
            &nbsp;&rarr;&nbsp;
            <span style="color: #C81400;">$19.99</span>
          </p>
          <p style="margin: 0; color: rgba(245,240,232,0.5); font-size: 14px;">
            Your exclusive 20% welcome discount
          </p>
        </div>

        <p style="font-size: 16px; color: rgba(245,240,232,0.7); margin-bottom: 25px; line-height: 1.6;">
          Create a custom murder mystery party with unique characters, clue cards, and a complete host guide — all generated in minutes.
        </p>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 35px 0;">
          <a href="https://www.mysterymaker.party/dashboard?utm_source=discount_reminder&utm_medium=email&utm_campaign=${type}" style="display: inline-block; background: #C81400; color: #F5F0E8; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
            ${ctaText}
          </a>
        </div>

        <p style="color: rgba(245,240,232,0.5); font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(245,240,232,0.1); line-height: 1.6;">
          Your discount is automatically applied at checkout — no code needed. Just create your mystery and the savings are waiting.
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
