import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function: notify-guest-feedback
 *
 * Called by a database trigger when a guest_feedback row is inserted.
 * 1. Sends an email notification to support
 * 2. If the rating is 4-5 stars, checks if the host's followup email
 *    is still pending — if so, it will naturally include the guest feedback
 *    when it sends. If already sent or doesn't exist, sends the host
 *    a Trustpilot prompt with the guest's positive feedback.
 */

const TRUSTPILOT_REVIEW_URL = "https://ca.trustpilot.com/evaluate/mysterymaker.party";

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
    const payload = await req.json();
    const record = payload.record;

    if (!record) throw new Error("No record in webhook payload");

    // Look up context: assignment → character → package → conversation
    const { data: assignment } = await supabase
      .from("character_assignments")
      .select("mystery_id")
      .eq("id", record.character_assignment_id)
      .single();

    const conversationId = assignment?.mystery_id;
    let mysteryTitle = record.mystery_title || "Unknown Mystery";
    let hostEmail = "Unknown";
    let hostName = "there";
    let userId: string | null = null;

    if (conversationId) {
      const { data: convo } = await supabase
        .from("conversations")
        .select("title, user_id, unsubscribed_from_followups")
        .eq("id", conversationId)
        .single();

      if (convo) {
        mysteryTitle = convo.title || mysteryTitle;
        userId = convo.user_id;

        if (convo.user_id) {
          const { data: userData } = await supabase.auth.admin.getUserById(convo.user_id);
          hostEmail = userData?.user?.email || "Unknown";
          hostName = userData?.user?.user_metadata?.full_name
            || userData?.user?.user_metadata?.name
            || hostEmail.split("@")[0];
        }

        // --- TRUSTPILOT UPGRADE LOGIC ---
        if (record.star_rating >= 4 && convo.user_id && !convo.unsubscribed_from_followups) {
          // Check if the host's followup email is still pending
          const { data: pendingFollowup } = await supabase
            .from("followup_emails")
            .select("id, status")
            .eq("conversation_id", conversationId)
            .eq("email_type", "how_did_it_go")
            .maybeSingle();

          if (!pendingFollowup || pendingFollowup.status === "sent" || pendingFollowup.status === "skipped") {
            // No pending followup — check if host already gave feedback
            const { data: hostFeedback } = await supabase
              .from("mystery_feedback")
              .select("id")
              .eq("conversation_id", conversationId)
              .maybeSingle();

            if (!hostFeedback && hostEmail !== "Unknown") {
              // Host hasn't given feedback and no pending email → send Trustpilot prompt now
              await sendTrustpilotPrompt(
                resendApiKey,
                hostEmail,
                hostName,
                mysteryTitle,
                record.character_name || "A guest",
                record.star_rating,
                record.best_part,
                conversationId
              );
              console.log(`Sent Trustpilot prompt to host for ${conversationId}`);
            }
          }
          // If pending — do nothing. The scheduled followup will pick up the guest data when it sends.
        }
      }
    }

    // --- SUPPORT NOTIFICATION ---
    const stars = "★".repeat(record.star_rating || 0) + "☆".repeat(5 - (record.star_rating || 0));

    const notificationHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">New Guest Feedback</h1>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 140px;">Mystery:</td>
              <td style="padding: 8px 0; font-weight: 600;">${mysteryTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Character:</td>
              <td style="padding: 8px 0;">${record.character_name || "Unknown"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Host:</td>
              <td style="padding: 8px 0;">${hostEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Rating:</td>
              <td style="padding: 8px 0; font-size: 20px; color: #f59e0b;">${stars} (${record.star_rating}/5)</td>
            </tr>
          </table>
          ${record.best_part ? `
          <div style="margin-top: 16px; padding: 12px; background: #f9fafb; border-radius: 6px;">
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 13px;">Highlight:</p>
            <p style="margin: 0;">${record.best_part}</p>
          </div>` : ""}
          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
            Guest feedback &bull; Assignment: ${record.character_assignment_id} &bull;
            Submitted: ${new Date(record.created_at).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}
          </div>
        </div>
      </div>
    `;

    const ratingEmoji = record.star_rating <= 2 ? "🔴" : record.star_rating <= 3 ? "🟡" : "🟢";

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mystery Maker <noreply@mysterymaker.party>",
        to: ["support@mysterymaker.party"],
        subject: `${ratingEmoji} Guest Feedback: ${record.star_rating}/5 stars - ${mysteryTitle} (${record.character_name || "guest"})`,
        html: notificationHtml,
      }),
    });

    console.log("Guest feedback notification sent");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in notify-guest-feedback:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

async function sendTrustpilotPrompt(
  resendApiKey: string,
  hostEmail: string,
  hostName: string,
  mysteryTitle: string,
  guestCharacterName: string,
  guestRating: number,
  guestHighlight: string | null,
  conversationId: string
) {
  const starDisplay = "★".repeat(guestRating) + "☆".repeat(5 - guestRating);
  const feedbackUrl = `https://www.mysterymaker.party/feedback/${conversationId}`;

  const highlightBlock = guestHighlight
    ? `<div style="background: #000000; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0; color: rgba(245,240,232,0.7); font-style: italic;">"${guestHighlight}"</p>
        <p style="margin: 8px 0 0 0; color: rgba(245,240,232,0.4); font-size: 13px;">- ${guestCharacterName}</p>
      </div>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">
  <div style="background: #FF6B6B; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #F5F0E8; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">MYSTERY MAKER</h1>
  </div>
  <div style="background: #111111; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-bottom: 8px; color: #F5F0E8;">Hi ${hostName},</p>
    <p style="color: rgba(245,240,232,0.7); margin-bottom: 20px;">
      Great news - your guests enjoyed <strong style="color: #F5F0E8;">${mysteryTitle}</strong>!
    </p>
    <p style="color: rgba(245,240,232,0.7);">
      ${guestCharacterName} rated their experience <strong style="color: #f59e0b;">${starDisplay}</strong>
    </p>
    ${highlightBlock}
    <p style="color: rgba(245,240,232,0.7); margin-top: 20px;">
      If you had a great time hosting, we'd really appreciate a quick Trustpilot review. It takes about 30 seconds and helps other hosts find us.
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${TRUSTPILOT_REVIEW_URL}" style="display: inline-block; background: #00b67a; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Leave a Trustpilot Review ★</a>
    </div>
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${feedbackUrl}" style="color: rgba(245,240,232,0.5); font-size: 13px; text-decoration: underline;">Or share detailed feedback with us directly</a>
    </div>
    <p style="color: rgba(245,240,232,0.3); font-size: 12px; text-align: center; margin: 24px 0 0 0; padding-top: 20px; border-top: 1px solid rgba(245,240,232,0.1);">
      <a href="${feedbackUrl}?unsubscribe=true" style="color: rgba(245,240,232,0.3); text-decoration: underline;">Unsubscribe from follow-up emails</a>
    </p>
  </div>
  <div style="text-align: center; padding: 16px; font-size: 12px;">
    <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.3); text-decoration: none;">mysterymaker.party</a>
  </div>
</body>
</html>`.trim();

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Mystery Maker <noreply@mysterymaker.party>",
      to: [hostEmail],
      subject: `Your guests loved ${mysteryTitle}!`,
      html,
    }),
  });
}
