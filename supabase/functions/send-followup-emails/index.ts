import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function: send-followup-emails
 *
 * Called by a daily pg_cron job. Processes pending rows in followup_emails
 * where scheduled_for <= now.
 *
 * Dispatches by email_type:
 *   - how_did_it_go (+21d post-generation): Trustpilot review request,
 *     with social proof if any guest left positive feedback.
 *   - invite_friends (+14d post-generation): light "share with friends"
 *     prompt, sent only to paid hosts who haven't unsubscribed.
 *
 * Both honor conversations.unsubscribed_from_followups.
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
    const { data: pendingEmails, error: fetchError } = await supabase
      .from("followup_emails")
      .select(`
        id,
        conversation_id,
        user_id,
        email_type,
        scheduled_for
      `)
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString());

    if (fetchError) throw fetchError;

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No pending emails" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const email of pendingEmails) {
      try {
        const { data: convo } = await supabase
          .from("conversations")
          .select("title, unsubscribed_from_followups, is_paid")
          .eq("id", email.conversation_id)
          .single();

        if (!convo) {
          await markSkipped(supabase, email.id, "conversation_not_found");
          continue;
        }

        if (convo.unsubscribed_from_followups) {
          await markSkipped(supabase, email.id, "unsubscribed");
          continue;
        }

        // invite_friends only goes to paid hosts (a free draft owner has
        // nothing meaningful to share yet).
        if (email.email_type === "invite_friends" && !convo.is_paid) {
          await markSkipped(supabase, email.id, "not_paid");
          continue;
        }

        const { data: userData } = await supabase.auth.admin.getUserById(email.user_id);
        const hostEmail = userData?.user?.email;

        if (!hostEmail) {
          await markSkipped(supabase, email.id, "no_host_email");
          continue;
        }

        const hostName = userData?.user?.user_metadata?.full_name
          || userData?.user?.user_metadata?.name
          || hostEmail.split("@")[0];

        const mysteryTitle = convo.title || "Your Mystery";

        let subject: string;
        let htmlBody: string;

        if (email.email_type === "invite_friends") {
          const shareUrl = buildShareUrl(email.user_id, "invite_friends");
          subject = `Friends keep asking about ${mysteryTitle}?`;
          htmlBody = buildInviteFriendsEmail(hostName, mysteryTitle, shareUrl, email.conversation_id);
        } else {
          // how_did_it_go (existing path)
          const { data: existingFeedback } = await supabase
            .from("mystery_feedback")
            .select("id")
            .eq("conversation_id", email.conversation_id)
            .maybeSingle();

          if (existingFeedback) {
            await markSkipped(supabase, email.id, "host_already_gave_feedback");
            continue;
          }

          const guestFeedback = await getPositiveGuestFeedback(supabase, email.conversation_id);
          const feedbackUrl = `https://www.mysterymaker.party/feedback/${email.conversation_id}`;
          const shareUrl = buildShareUrl(email.user_id, "trustpilot_followup");

          htmlBody = guestFeedback
            ? buildGuestTriggeredEmail(hostName, mysteryTitle, guestFeedback, feedbackUrl, shareUrl)
            : buildStandardEmail(hostName, mysteryTitle, feedbackUrl, shareUrl);

          subject = guestFeedback
            ? `Your guests loved ${mysteryTitle}!`
            : `How was ${mysteryTitle}?`;
        }

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Mystery Maker <noreply@mysterymaker.party>",
            to: [hostEmail],
            subject,
            html: htmlBody,
          }),
        });

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text();
          errors.push(`${email.id}: Resend error ${resendResponse.status}`);
          console.error(`Failed to send ${email.id}:`, errorText);
          continue;
        }

        await supabase
          .from("followup_emails")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", email.id);

        sentCount++;
        console.log(`Sent ${email.email_type} for ${email.conversation_id}`);
      } catch (err) {
        errors.push(`${email.id}: ${err.message}`);
        console.error(`Error processing ${email.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        total: pendingEmails.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-followup-emails:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

async function markSkipped(supabase: any, emailId: string, reason: string) {
  await supabase
    .from("followup_emails")
    .update({ status: "skipped", skipped_reason: reason })
    .eq("id", emailId);
}

async function getPositiveGuestFeedback(supabase: any, conversationId: string) {
  const { data: packages } = await supabase
    .from("mystery_packages")
    .select("id")
    .eq("conversation_id", conversationId);

  if (!packages || packages.length === 0) return null;

  const packageIds = packages.map((p: any) => p.id);

  const { data: characters } = await supabase
    .from("mystery_characters")
    .select("id")
    .in("package_id", packageIds);

  if (!characters || characters.length === 0) return null;

  const characterIds = characters.map((c: any) => c.id);

  const { data: assignments } = await supabase
    .from("character_assignments")
    .select("id")
    .in("character_id", characterIds);

  if (!assignments || assignments.length === 0) return null;

  const assignmentIds = assignments.map((a: any) => a.id);

  const { data: feedback } = await supabase
    .from("guest_feedback")
    .select("star_rating, character_name, best_part")
    .in("character_assignment_id", assignmentIds)
    .gte("star_rating", 4)
    .order("star_rating", { ascending: false })
    .limit(3);

  if (!feedback || feedback.length === 0) return null;

  return {
    count: feedback.length,
    topRating: feedback[0].star_rating,
    topName: feedback[0].character_name,
    topHighlight: feedback[0].best_part,
    averageRating: Math.round((feedback.reduce((sum: number, f: any) => sum + f.star_rating, 0) / feedback.length) * 10) / 10,
  };
}

function buildShareUrl(userId: string, campaign: string): string {
  // UTM-tagged share link — designed so it can be upgraded to a true ?ref=CODE
  // when the two-sided referral coupon system lands without changing the email.
  const params = new URLSearchParams({
    utm_source: "share",
    utm_medium: "email",
    utm_campaign: campaign,
    utm_content: `host-${userId}`,
  });
  return `https://www.mysterymaker.party/?${params.toString()}`;
}

function buildShareSection(shareUrl: string): string {
  return `
    <div style="margin: 24px 0 8px 0; padding: 16px; background: rgba(245,240,232,0.04); border: 1px solid rgba(245,240,232,0.1); border-radius: 6px;">
      <p style="margin: 0 0 8px 0; color: #F5F0E8; font-size: 14px; font-weight: 600;">Friends will love this too</p>
      <p style="margin: 0 0 12px 0; color: rgba(245,240,232,0.6); font-size: 13px;">
        If your guests asked "where did you get this?" — send them here. Each mystery is one-of-a-kind.
      </p>
      <a href="${shareUrl}" style="display: inline-block; color: #F5F0E8; font-size: 13px; text-decoration: none; padding: 8px 14px; border: 1px solid rgba(245,240,232,0.25); border-radius: 4px;">Share Mystery Maker →</a>
    </div>
  `;
}

function buildGuestTriggeredEmail(
  hostName: string,
  mysteryTitle: string,
  guestFeedback: any,
  feedbackUrl: string,
  shareUrl: string
): string {
  const starDisplay = "★".repeat(guestFeedback.topRating) + "☆".repeat(5 - guestFeedback.topRating);
  const guestLine = guestFeedback.count === 1
    ? `${guestFeedback.topName} rated their experience <strong style="color: #f59e0b;">${starDisplay}</strong>`
    : `${guestFeedback.count} of your guests rated their experience - average <strong style="color: #f59e0b;">${guestFeedback.averageRating}/5 stars</strong>`;

  const highlightBlock = guestFeedback.topHighlight
    ? `<div style="background: #000000; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0; color: rgba(245,240,232,0.7); font-style: italic;">"${guestFeedback.topHighlight}"</p>
        <p style="margin: 8px 0 0 0; color: rgba(245,240,232,0.4); font-size: 13px;">- ${guestFeedback.topName}</p>
      </div>`
    : "";

  return buildTrustpilotShell(
    hostName,
    `Great news - your guests enjoyed <strong style="color: #F5F0E8;">${mysteryTitle}</strong>!`,
    `${guestLine}${highlightBlock}
    <p style="color: rgba(245,240,232,0.7); margin-top: 20px;">
      If you had a great time hosting, we'd really appreciate a quick Trustpilot review. It takes about 30 seconds and helps other hosts find us.
    </p>`,
    feedbackUrl,
    shareUrl
  );
}

function buildStandardEmail(
  hostName: string,
  mysteryTitle: string,
  feedbackUrl: string,
  shareUrl: string
): string {
  return buildTrustpilotShell(
    hostName,
    `How was <strong style="color: #F5F0E8;">${mysteryTitle}</strong>?`,
    `<p style="color: rgba(245,240,232,0.7);">
      We hope you and your guests had an amazing time! If you enjoyed hosting, we'd really appreciate a quick Trustpilot review. It takes about 30 seconds and helps other hosts discover Mystery Maker.
    </p>`,
    feedbackUrl,
    shareUrl
  );
}

function buildInviteFriendsEmail(
  hostName: string,
  mysteryTitle: string,
  shareUrl: string,
  conversationId: string
): string {
  const unsubUrl = `https://www.mysterymaker.party/feedback/${conversationId}?unsubscribe=true`;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">
  <div style="background: #C81400; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #F5F0E8; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">MYSTERY MAKER</h1>
  </div>

  <div style="background: #111111; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-bottom: 8px; color: #F5F0E8;">Hi ${hostName},</p>

    <p style="color: rgba(245,240,232,0.85); margin-bottom: 16px;">
      Hope <strong style="color: #F5F0E8;">${mysteryTitle}</strong> was a hit. We bet at least one guest leaned over that night and asked,
      <em>"where did you get this?"</em>
    </p>

    <p style="color: rgba(245,240,232,0.7); margin-bottom: 24px;">
      Every mystery on Mystery Maker is generated from scratch, so no two parties play the same one. If a friend wants to host their own,
      send them the link below — they'll get to design something built around their own theme, guest count, and inside jokes.
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${shareUrl}" style="display: inline-block; background: #C81400; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Share Mystery Maker →</a>
    </div>

    <p style="color: rgba(245,240,232,0.5); font-size: 13px; text-align: center; margin: 16px 0 0 0;">
      Or just copy this link: <span style="color: rgba(245,240,232,0.7);">mysterymaker.party</span>
    </p>

    <p style="color: rgba(245,240,232,0.3); font-size: 12px; text-align: center; margin: 28px 0 0 0; padding-top: 20px; border-top: 1px solid rgba(245,240,232,0.1);">
      <a href="${unsubUrl}" style="color: rgba(245,240,232,0.3); text-decoration: underline;">Unsubscribe from follow-up emails</a>
    </p>
  </div>

  <div style="text-align: center; padding: 16px; font-size: 12px;">
    <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.3); text-decoration: none;">mysterymaker.party</a>
  </div>
</body>
</html>
  `.trim();
}

function buildTrustpilotShell(
  hostName: string,
  headline: string,
  bodyContent: string,
  feedbackUrl: string,
  shareUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">
  <div style="background: #C81400; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #F5F0E8; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">MYSTERY MAKER</h1>
  </div>

  <div style="background: #111111; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-bottom: 8px; color: #F5F0E8;">Hi ${hostName},</p>

    <p style="color: rgba(245,240,232,0.7); margin-bottom: 20px;">${headline}</p>

    ${bodyContent}

    <div style="text-align: center; margin: 28px 0;">
      <a href="${TRUSTPILOT_REVIEW_URL}" style="display: inline-block; background: #00b67a; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Leave a Trustpilot Review ★</a>
    </div>

    <div style="text-align: center; margin-bottom: 16px;">
      <a href="${feedbackUrl}" style="color: rgba(245,240,232,0.5); font-size: 13px; text-decoration: underline;">Or share detailed feedback with us directly</a>
    </div>

    ${buildShareSection(shareUrl)}

    <p style="color: rgba(245,240,232,0.3); font-size: 12px; text-align: center; margin: 24px 0 0 0; padding-top: 20px; border-top: 1px solid rgba(245,240,232,0.1);">
      <a href="${feedbackUrl}?unsubscribe=true" style="color: rgba(245,240,232,0.3); text-decoration: underline;">Unsubscribe from follow-up emails</a>
    </p>
  </div>

  <div style="text-align: center; padding: 16px; font-size: 12px;">
    <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.3); text-decoration: none;">mysterymaker.party</a>
  </div>
</body>
</html>
  `.trim();
}
