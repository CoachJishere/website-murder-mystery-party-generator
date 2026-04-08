import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function: send-guest-feedback-email
 *
 * Called by the daily pg_cron job to send feedback request emails
 * to guests 14 days after their character profile was sent.
 *
 * Expects POST with: { assignment_id: string }
 * Or POST with: { batch: true } to process all eligible assignments.
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
    const body = await req.json();

    let assignments: any[] = [];

    if (body.batch) {
      // Batch mode: find all eligible assignments (14+ days since sent, no feedback email yet)
      const { data, error } = await supabase
        .from("character_assignments")
        .select(`
          id,
          guest_name,
          guest_email,
          access_token,
          mystery_id,
          mystery_characters!inner (
            character_name,
            package_id
          )
        `)
        .eq("is_sent", true)
        .is("feedback_email_sent_at", null)
        .lt("sent_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;
      assignments = data || [];

      // Filter out assignments where the conversation is unsubscribed
      if (assignments.length > 0) {
        const packageIds = [...new Set(assignments.map((a: any) => a.mystery_characters.package_id))];

        const { data: packages } = await supabase
          .from("mystery_packages")
          .select("id, conversation_id")
          .in("id", packageIds);

        if (packages) {
          const conversationIds = [...new Set(packages.map(p => p.conversation_id))];

          const { data: unsubscribed } = await supabase
            .from("conversations")
            .select("id")
            .in("id", conversationIds)
            .eq("unsubscribed_from_followups", true);

          if (unsubscribed && unsubscribed.length > 0) {
            const unsubConvoIds = new Set(unsubscribed.map(u => u.id));
            const unsubPackageIds = new Set(
              packages.filter(p => unsubConvoIds.has(p.conversation_id)).map(p => p.id)
            );
            assignments = assignments.filter(
              (a: any) => !unsubPackageIds.has(a.mystery_characters.package_id)
            );
          }
        }

        // Also filter out assignments that already have guest feedback
        const assignmentIds = assignments.map((a: any) => a.id);
        const { data: existingFeedback } = await supabase
          .from("guest_feedback")
          .select("character_assignment_id")
          .in("character_assignment_id", assignmentIds);

        if (existingFeedback && existingFeedback.length > 0) {
          const feedbackIds = new Set(existingFeedback.map(f => f.character_assignment_id));
          assignments = assignments.filter((a: any) => !feedbackIds.has(a.id));
        }
      }
    } else if (body.assignment_id) {
      // Single assignment mode
      const { data, error } = await supabase
        .from("character_assignments")
        .select(`
          id,
          guest_name,
          guest_email,
          access_token,
          mystery_id,
          mystery_characters!inner (
            character_name,
            package_id
          )
        `)
        .eq("id", body.assignment_id)
        .single();

      if (error) throw error;
      if (data) assignments = [data];
    }

    if (assignments.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No eligible assignments" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Resolve mystery titles for all assignments
    const packageIds = [...new Set(assignments.map((a: any) => a.mystery_characters.package_id))];
    const { data: packages } = await supabase
      .from("mystery_packages")
      .select("id, conversation_id, conversations!inner(title)")
      .in("id", packageIds);

    const titleByPackageId: Record<string, string> = {};
    if (packages) {
      for (const pkg of packages) {
        titleByPackageId[pkg.id] = (pkg as any).conversations?.title || "Your Mystery";
      }
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const assignment of assignments) {
      const character = assignment.mystery_characters;
      const mysteryTitle = titleByPackageId[character.package_id] || "Your Mystery";
      const feedbackUrl = `https://www.mysterymaker.party/guest-feedback/${assignment.access_token}`;

      try {
        const htmlBody = buildEmailHtml(
          assignment.guest_name,
          character.character_name,
          mysteryTitle,
          feedbackUrl
        );

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Mystery Maker <noreply@mysterymaker.party>",
            to: [assignment.guest_email],
            subject: `How was ${mysteryTitle}?`,
            html: htmlBody,
          }),
        });

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text();
          errors.push(`${assignment.id}: Resend error ${resendResponse.status}`);
          console.error(`Failed to send to ${assignment.id}:`, errorText);
          continue;
        }

        // Mark as sent
        await supabase
          .from("character_assignments")
          .update({ feedback_email_sent_at: new Date().toISOString() })
          .eq("id", assignment.id);

        sentCount++;
      } catch (err) {
        errors.push(`${assignment.id}: ${err.message}`);
        console.error(`Error processing ${assignment.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        total: assignments.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-guest-feedback-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function buildEmailHtml(
  guestName: string,
  characterName: string,
  mysteryTitle: string,
  feedbackUrl: string
): string {
  const stars = [1, 2, 3, 4, 5]
    .map(
      (n) =>
        `<a href="${feedbackUrl}?rating=${n}" style="text-decoration: none; font-size: 28px; padding: 0 2px;">` +
        `<span style="color: #f59e0b;">${n <= 3 ? "★" : "☆"}</span></a>`
    )
    .join("");

  return `
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
    <p style="font-size: 18px; margin-bottom: 8px; color: #F5F0E8;">Hi ${guestName},</p>

    <p style="color: rgba(245,240,232,0.7); margin-bottom: 24px;">
      You recently played <strong style="color: #F5F0E8;">${characterName}</strong> in <strong style="color: #F5F0E8;">${mysteryTitle}</strong>. We hope you had a great time!
    </p>

    <div style="background: #000000; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <p style="color: rgba(245,240,232,0.7); margin: 0 0 12px 0; font-size: 15px;">How was your experience?</p>
      <div style="font-size: 0;">
        ${stars}
      </div>
      <p style="color: rgba(245,240,232,0.4); margin: 12px 0 0 0; font-size: 13px;">Tap a star to rate</p>
    </div>

    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${feedbackUrl}" style="display: inline-block; background: #FF6B6B; color: #F5F0E8; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Leave Feedback</a>
    </div>

    <p style="color: rgba(245,240,232,0.3); font-size: 12px; text-align: center; margin: 24px 0 0 0; padding-top: 20px; border-top: 1px solid rgba(245,240,232,0.1);">
      This is a one-time email about your recent mystery experience. You won't receive any other emails from us.
    </p>
  </div>

  <div style="text-align: center; padding: 16px; font-size: 12px;">
    <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.3); text-decoration: none;">mysterymaker.party</a>
  </div>
</body>
</html>
  `.trim();
}
