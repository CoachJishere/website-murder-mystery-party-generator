import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Edge Function: notify-feedback
 *
 * Called by a Supabase database webhook when a new row is inserted
 * into mystery_feedback. Sends an email notification to support.
 */

serve(async (req) => {
  // Database webhooks send POST with the inserted record
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await req.json();

    // Database webhook payload has: type, table, record, schema, old_record
    const record = payload.record;

    if (!record) {
      throw new Error("No record in webhook payload");
    }

    // Fetch mystery title for context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let mysteryTitle = "Unknown Mystery";
    let userEmail = "Unknown";

    if (record.conversation_id) {
      const { data: conversation } = await supabase
        .from("conversations")
        .select("title, user_id")
        .eq("id", record.conversation_id)
        .single();

      if (conversation) {
        mysteryTitle = conversation.title || mysteryTitle;

        if (conversation.user_id) {
          const { data: userData } = await supabase.auth.admin.getUserById(
            conversation.user_id
          );
          userEmail = userData?.user?.email || "Unknown";
        }
      }
    }

    // Build stars display
    const stars = "★".repeat(record.star_rating || 0) +
      "☆".repeat(5 - (record.star_rating || 0));

    // Build email HTML
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8B1538 0%, #6B0F28 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">New Mystery Feedback</h1>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 140px;">Mystery:</td>
              <td style="padding: 8px 0; font-weight: 600;">${mysteryTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Customer:</td>
              <td style="padding: 8px 0;">${record.display_name || "Anonymous"} (${userEmail})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Rating:</td>
              <td style="padding: 8px 0; font-size: 20px; color: #f59e0b;">${stars} (${record.star_rating}/5)</td>
            </tr>
            ${record.nps_score !== null ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">NPS Score:</td>
              <td style="padding: 8px 0;">${record.nps_score}/10</td>
            </tr>` : ""}
            ${record.did_host_party ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Hosted party?</td>
              <td style="padding: 8px 0;">${record.did_host_party}</td>
            </tr>` : ""}
            ${record.attendee_count ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Attendees:</td>
              <td style="padding: 8px 0;">${record.attendee_count}</td>
            </tr>` : ""}
          </table>

          ${record.best_part ? `
          <div style="margin-top: 16px; padding: 12px; background: #f9fafb; border-radius: 6px;">
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 13px;">Best part:</p>
            <p style="margin: 0;">${record.best_part}</p>
          </div>` : ""}

          ${record.testimonial ? `
          <div style="margin-top: 12px; padding: 12px; background: #f9fafb; border-radius: 6px;">
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 13px;">Testimonial:</p>
            <p style="margin: 0;">${record.testimonial}</p>
          </div>` : ""}

          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
            Public: ${record.is_public ? "Yes" : "No"} &bull;
            Conversation: ${record.conversation_id} &bull;
            Submitted: ${new Date(record.created_at).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}
          </div>
        </div>
      </div>
    `;

    // Send via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const ratingEmoji = record.star_rating <= 2 ? "🔴" : record.star_rating <= 3 ? "🟡" : "🟢";

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mystery Maker <noreply@mysterymaker.party>",
        to: ["support@mysterymaker.party"],
        subject: `${ratingEmoji} New Feedback: ${record.star_rating}/5 stars - ${mysteryTitle}`,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Resend API error: ${emailResponse.status} ${errorText}`);
    }

    console.log("Feedback notification sent successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending feedback notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
