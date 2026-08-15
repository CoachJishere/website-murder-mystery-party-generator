import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * send-adaptation-complete-email — "Recast" (ADR-0088). STAGING ONLY.
 *
 * Service-role only, fired-and-forgotten by adapt-mystery-apply's finally
 * block exactly once per batch, at the moment chain-dispatch determines
 * every row in that batch_id has reached a terminal status. Exists because a
 * batch can realistically take several minutes (longer with a
 * murderer/accomplice reassignment in it — a much bigger generation than a
 * plain removal), and the intended UX is non-blocking: the host closes the
 * dialog and keeps using the rest of their mystery rather than staring at a
 * spinner. This email is the reliable way they find out it's done if they've
 * closed the tab (the realtime subscription already wired in MysteryView.tsx
 * covers the case where they're still in-app).
 *
 * English only for this slice, matching this feature's existing i18n-deferred
 * scope (see ADR-0082) — other transactional emails in this codebase (e.g.
 * send-host-email) are localized across 13 languages; this one isn't, yet.
 *
 * POST body: { batch_id }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const ENABLED = Deno.env.get("ENABLE_GUEST_DROPOUT_ADAPTATION") === "true";

interface AdaptationSummaryRow {
  character_name: string;
  character_role: string | null;
  status: string;
  requested_by_email: string | null;
  conversation_id: string;
  package_id: string;
  transform_result: { reassignment?: { promoted_character_name?: string }; host_review_recommended?: boolean } | null;
  error_message: string | null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildEmailHtml(params: {
  introLine: string;
  resultLines: string[];
  reviewNoticeHtml: string | null;
  ctaUrl: string;
}): string {
  const { introLine, resultLines, reviewNoticeHtml, ctaUrl } = params;
  const resultListHtml = resultLines.map((line) => `<li style="margin-bottom: 8px;">${line}</li>`).join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">
  <div style="background: #C81400; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <img src="https://www.mysterymaker.party/email-assets/wordmark-cream.png" alt="Mystery Maker" width="232" height="40" style="display: block; max-width: 232px; height: auto; margin: 0 auto 16px auto; border: 0; outline: none; text-decoration: none;" />
    <h1 style="color: #F5F0E8; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px;">RECAST</h1>
  </div>

  <div style="background: #111111; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-bottom: 20px; color: #F5F0E8;">${introLine}</p>

    <ul style="background: #000000; border-left: 4px solid #C81400; padding: 20px 20px 20px 40px; margin: 20px 0; border-radius: 4px; color: rgba(245,240,232,0.85);">
      ${resultListHtml}
    </ul>

    ${reviewNoticeHtml ?? ""}

    <div style="text-align: center; margin: 30px 0;">
      <a href="${ctaUrl}" style="display: inline-block; background: #C81400; color: #F5F0E8; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View your mystery</a>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; font-size: 12px;">
    <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.5); text-decoration: none;">mysterymaker.party</a>
  </div>
</body>
</html>
  `.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!ENABLED) return jsonResponse({ error: "not_enabled" }, 404);
  if (req.method !== "POST") return jsonResponse({ error: "POST only" }, 405);

  try {
    const { batch_id } = await req.json();
    if (!batch_id) return jsonResponse({ error: "batch_id required" }, 400);

    const { data: rows, error: rowsErr } = await supabase
      .from("mystery_adaptations")
      .select("character_name, character_role, status, requested_by_email, conversation_id, package_id, transform_result, error_message")
      .eq("batch_id", batch_id)
      .order("batch_sequence", { ascending: true });
    if (rowsErr) throw new Error(`batch lookup failed: ${rowsErr.message}`);
    if (!rows || rows.length === 0) {
      console.warn(`send-adaptation-complete-email: no rows found for batch ${batch_id} — nothing to send`);
      return jsonResponse({ sent: false, reason: "no_rows_for_batch" });
    }
    const batchRows = rows as AdaptationSummaryRow[];

    const recipientEmail = batchRows.find((r) => r.requested_by_email)?.requested_by_email;
    if (!recipientEmail) {
      console.warn(`send-adaptation-complete-email: batch ${batch_id} has no requested_by_email on any row — nothing to send`);
      return jsonResponse({ sent: false, reason: "no_recipient_email" });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("send-adaptation-complete-email: RESEND_API_KEY not configured — skipping send (staging)");
      return jsonResponse({ sent: false, reason: "resend_not_configured" });
    }

    const { data: pkg } = await supabase
      .from("mystery_packages").select("title").eq("id", batchRows[0].package_id).maybeSingle();
    const mysteryTitle = (pkg as { title?: string } | null)?.title || "your mystery";

    const allVerified = batchRows.every((r) => r.status === "verified");
    const anyFailed = batchRows.some((r) => r.status === "failed" || r.status === "rolled_back");
    const anyReviewRecommended = batchRows.some((r) => r.transform_result?.host_review_recommended);

    const resultLines = batchRows.map((r) => {
      const promoted = r.transform_result?.reassignment?.promoted_character_name;
      if (r.status === "verified") {
        return promoted
          ? `<strong>${r.character_name}</strong> removed — <strong>${promoted}</strong> is now the ${r.character_role}.`
          : `<strong>${r.character_name}</strong> removed from every character sheet, the detective script, and evidence cards.`;
      }
      return `<strong>${r.character_name}</strong> — this one couldn't be safely completed and was left unchanged. No charge lost the change; support can help if this keeps happening.`;
    });

    const introLine = allVerified
      ? `Your requested changes to <strong>${mysteryTitle}</strong> are done.`
      : anyFailed
        ? `We finished working on <strong>${mysteryTitle}</strong> — most of it went through, but see below for one that didn't.`
        : `We finished working on <strong>${mysteryTitle}</strong>.`;

    const reviewNoticeHtml = anyReviewRecommended
      ? `<div style="background: rgba(217,119,6,0.12); border-left: 4px solid #d97706; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
           <p style="margin: 0; color: rgba(245,240,232,0.85); font-size: 14px;">
             <strong style="color: #f0b429;">Worth a skim before the party:</strong> reassigning who the culprit is meant rewriting the detective script's reveal and a confession — we recommend reading through both once before hosting.
           </p>
         </div>`
      : null;

    const ctaUrl = `https://www.mysterymaker.party/mystery/${batchRows[0].conversation_id}`;
    const subject = allVerified
      ? `Done — ${mysteryTitle} has been updated`
      : `${mysteryTitle} — update finished (see details)`;

    const html = buildEmailHtml({ introLine, resultLines, reviewNoticeHtml, ctaUrl });

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Mystery Maker <noreply@mysterymaker.party>",
        to: [recipientEmail],
        subject,
        html,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Resend send failed: ${resp.status} - ${errText}`);
    }

    return jsonResponse({ sent: true, recipient: recipientEmail, batch_id });
  } catch (error) {
    // Best-effort notification — never let an email failure look like a
    // bigger problem than it is. Logged for visibility, not retried here
    // (matches this feature's existing "cheap, not elaborate" retry posture).
    console.error("send-adaptation-complete-email error:", (error as Error).message);
    return jsonResponse({ sent: false, error: (error as Error).message }, 200);
  }
});
