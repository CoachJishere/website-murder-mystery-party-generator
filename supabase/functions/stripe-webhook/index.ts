
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.17.0?target=deno";

// Configure CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Stripe
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

// ADR-0088: the adaptation dispatch below is deliberately fire-and-forget (a
// slow/failed transform must never make Stripe think this event delivery
// failed) — EdgeRuntime.waitUntil is the documented way to guarantee the
// isolate survives long enough for it to actually complete
// (https://supabase.com/docs/guides/functions/background-tasks). Checked
// defensively at runtime, not declared as a TS ambient global: this
// project's pinned local edge-runtime (v1.74.3) predates it, so this falls
// back to a plain un-awaited fetch (this function's existing behavior)
// wherever it isn't available, rather than assuming a specific version.
function fireAndForget(promise: Promise<unknown>): void {
  const settled = promise.catch((e) => console.error("background dispatch failed:", e));
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(settled);
}

// GA4 configuration
const GA4_MEASUREMENT_ID = "G-XGD48X4ZQS";
const GA4_API_SECRET = Deno.env.get("GA4_API_SECRET") || "";

async function sendGA4Event(
  clientId: string,
  userId: string | null,
  eventName: string,
  eventParams: Record<string, any>
) {
  if (!GA4_API_SECRET) {
    console.warn("GA4_API_SECRET not set, skipping GA4 event");
    return;
  }

  try {
    const payload = {
      client_id: clientId,
      ...(userId && { user_id: userId }),
      events: [
        {
          name: eventName,
          params: {
            ...eventParams,
            engagement_time_msec: "1",
          },
        },
      ],
    };

    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      console.error(`GA4 event failed: ${response.status}`);
    } else {
      console.log(`GA4 ${eventName} event sent successfully`);
    }
  } catch (error) {
    console.error("Error sending GA4 event:", error);
  }
}

// ── Cold Case Files (ADR-0029) ──────────────────────────────────────────────
// The cold-case Payment Link carries metadata {product: "cold_case"}, which Stripe
// copies onto the checkout session. This branch is dead code until that link exists;
// the party flow is untouched.
//
// Recovered 2026-08-15: this block was live in production (stripe-webhook v61,
// deployed directly, not via this repo's main) but absent from this file — main
// never had the feat/cold-case-files branch merged in. Diffing local against
// live before deploying the ADR-0088 changes below caught the divergence before
// it would have silently deleted live Cold Case order processing; restored here
// verbatim from the deployed version so this file matches reality again.
const COLD_CASE_LANGS = new Set([
  "en", "es", "fr", "de", "it", "pt", "nl", "da", "sv", "fi", "ko", "ja", "zh-cn",
]);

async function handleColdCaseOrder(session: Stripe.Checkout.Session) {
  const email = session.customer_email || session.customer_details?.email;
  if (!email) {
    console.error("[cold-case] session has no customer email:", session.id);
    return;
  }

  // buyer_language: the Payment Link's ?locale= param lands on session.locale
  // ("auto" when unset). Guests have no profiles.language row, so this is the
  // only language signal we get (drives the localized READY email).
  const rawLocale = (session.locale || "").toLowerCase();
  const lang = COLD_CASE_LANGS.has(rawLocale)
    ? rawLocale
    : COLD_CASE_LANGS.has(rawLocale.slice(0, 2))
      ? rawLocale.slice(0, 2)
      : "en";

  const slug = `cc-${crypto.randomUUID().slice(0, 8)}`;

  // Buyer brief (ADR-0029 amendment): the Payment Link's custom fields carry the buyer's
  // era/place/details — the core promise ("you pick the era and the place"). Field keys are
  // set when the link is created (see docs/cold-case-launch-runbook.md): setting_era, details.
  // Both optional; absent/blank = "surprise me" (the engine invents).
  const fieldVal = (key: string) =>
    (session.custom_fields || []).find((f) => f.key === key)?.text?.value?.trim() || "";
  // Primary: session metadata (create-cold-case-checkout carries the landing brief box).
  // Fallback: Payment-Link custom fields (if that path is ever used).
  const briefSetting = session.metadata?.setting_era?.trim() || fieldVal("setting_era");
  const briefDetails = session.metadata?.details?.trim() || fieldVal("details");
  const brief =
    briefSetting || briefDetails
      ? { ...(briefSetting && { setting: briefSetting }), ...(briefDetails && { details: briefDetails }) }
      : null;

  const { data: order, error } = await supabase
    .from("cold_case_orders")
    .insert({
      email,
      buyer_language: lang,
      slug,
      brief,
      user_id: session.metadata?.user_id || null,
      stripe_session_id: session.id,
      amount_total: session.amount_total,
      currency: session.currency,
    })
    .select("id, delivery_token")
    .single();

  if (error) {
    // 23505 unique violation on stripe_session_id = Stripe webhook retry — idempotent no-op
    if ((error as { code?: string }).code === "23505") {
      console.log("[cold-case] duplicate webhook replay for", session.id);
      return;
    }
    console.error("[cold-case] order insert failed:", error);
    return;
  }
  console.log(`[cold-case] order ${order.id} queued as ${slug} for ${email} (${lang})`);

  // GA4 purchase with a DISTINCT item id (the party flow hardcodes murder_mystery_party)
  await sendGA4Event(session.id, null, "purchase", {
    currency: session.currency?.toUpperCase() || "USD",
    value: (session.amount_total || 0) / 100,
    transaction_id: session.payment_intent as string,
    items: [
      {
        item_id: "cold_case_files",
        item_name: "Cold Case File (bespoke)",
        price: (session.amount_total || 0) / 100,
        quantity: 1,
      },
    ],
    cold_case_order_id: order.id,
  });

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.warn("[cold-case] RESEND_API_KEY not set — skipping emails");
    return;
  }
  const siteUrl = Deno.env.get("SITE_URL") || "https://www.mysterymaker.party";
  const statusUrl = `${siteUrl}/cold-case/${order.delivery_token}`;

  // Buyer confirmation — async expectation set immediately, never "download now".
  // v1 ships English-only; buyer_language localizes the READY email (the deliverable).
  try {
    const confirmRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mystery Maker <noreply@mysterymaker.party>",
        to: [email],
        subject: "Your cold case is being assembled 🔍",
        html: `
          <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
            <div style="background: #14100e; color: #f2ede6; padding: 28px 24px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-weight: 600; letter-spacing: .02em;">Case file in preparation</h2>
            </div>
            <div style="background: #f7f4ee; padding: 26px 24px; border: 1px solid #e3ded3; border-top: none; border-radius: 0 0 8px 8px; line-height: 1.7;">
              <p>Thank you — your order is confirmed.</p>
              <p>We're now generating your <strong>one-of-one cold case</strong>: an original unsolved murder that has never existed before and will never be generated again. Twenty-five period documents, photographs, a real twist — and everything you need to solve it is in the file.</p>
              <p><strong>We'll email you when it's ready — usually within the hour.</strong></p>
              <p style="margin-top: 18px;">You can check progress any time:<br>
              <a href="${statusUrl}" style="color: #8a2b1d;">${statusUrl}</a></p>
              <p style="font-size: 13px; color: #6d675c; margin-top: 22px;">Questions? Just reply to this email.</p>
            </div>
          </div>`,
      }),
    });
    if (!confirmRes.ok) {
      console.error(`[cold-case] buyer confirmation email failed: ${confirmRes.status} ${await confirmRes.text()}`);
    } else {
      console.log("[cold-case] buyer confirmation email sent");
    }
  } catch (e) {
    console.error("[cold-case] buyer confirmation email error:", e);
  }

  // Owner notification (mirrors the party purchase alert)
  try {
    const amountFormatted = ((session.amount_total || 0) / 100).toFixed(2);
    const currency = (session.currency || "usd").toUpperCase();
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mystery Maker <noreply@mysterymaker.party>",
        to: ["support@mysterymaker.party"],
        subject: `🕵️ New COLD CASE order (${currency} ${amountFormatted})`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1e293b; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">New Cold Case Order</h2>
            </div>
            <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #6b7280;">Order</td><td style="padding: 8px 0; font-size: 12px;">${order.id}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Slug</td><td style="padding: 8px 0; font-weight: 600;">${slug}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Amount</td><td style="padding: 8px 0; font-weight: 600;">${currency} ${amountFormatted}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Customer</td><td style="padding: 8px 0;">${email}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Language</td><td style="padding: 8px 0;">${lang}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Stripe Session</td><td style="padding: 8px 0; font-size: 12px;">${session.id}</td></tr>
              </table>
              <p style="font-size: 12px; color: #9ca3af; margin-top: 16px;">The worker will claim this order and generate the case (~30 min). Failure alerts go to Telegram.</p>
            </div>
          </div>`,
      }),
    });
  } catch (e) {
    console.error("[cold-case] owner notification error:", e);
  }
}

// ADR-0088: owner notification for "Remove a Character" purchases (renamed
// from "Recast" — ADR-0091), mirroring the existing
// party-purchase and Cold Case notification emails above — fires at PURCHASE
// time (not completion time; send-adaptation-complete-email already covers
// completion, to the customer, separately). Fire-and-forgotten alongside the
// adapt-mystery-apply dispatch below so it never delays the customer's
// actual processing start. Exists so the owner has a way to notice real
// purchases happened and go check how they turned out, without needing to
// watch the DB — see CHANGELOG 2026-08-15.
async function sendAdaptationPurchaseNotification(params: {
  batchId: string;
  rows: { character_name: string; character_role: string | null }[];
  amountTotalCents: number | null;
  currency: string | null;
  customerEmail: string | null;
  conversationId: string | null;
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.warn("[adaptation] RESEND_API_KEY not set — skipping purchase notification email");
    return;
  }
  const { batchId, rows, amountTotalCents, currency, customerEmail, conversationId } = params;

  const amountFormatted = ((amountTotalCents ?? 0) / 100).toFixed(2);
  const currencyFormatted = (currency || "usd").toUpperCase();
  const characterListHtml = rows.map((r) => {
    const isReassign = r.character_role === "murderer" || r.character_role === "accomplice";
    return `<li style="margin-bottom: 6px;">${r.character_name} <span style="color: #6b7280;">(${r.character_role ?? "unknown"})</span>${isReassign ? ` <strong style="color: #d97706;">— reassignment, worth a look</strong>` : ""}</li>`;
  }).join("");
  const mysteryUrl = conversationId ? `https://www.mysterymaker.party/mystery/${conversationId}` : null;

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mystery Maker <noreply@mysterymaker.party>",
        to: ["support@mysterymaker.party"],
        subject: `🎭 New Remove-a-Character purchase (${currencyFormatted} ${amountFormatted})`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #7c3aed; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">New "Remove a Character" Purchase</h2>
            </div>
            <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #6b7280;">Amount</td><td style="padding: 8px 0; font-weight: 600;">${currencyFormatted} ${amountFormatted}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Customer</td><td style="padding: 8px 0;">${customerEmail || "N/A"}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Batch ID</td><td style="padding: 8px 0; font-size: 12px;">${batchId}</td></tr>
              </table>
              <p style="margin: 16px 0 6px 0; color: #6b7280;">Characters (${rows.length}):</p>
              <ul style="margin: 0; padding-left: 20px;">${characterListHtml}</ul>
              ${mysteryUrl ? `<div style="margin-top: 20px;"><a href="${mysteryUrl}" style="color: #7c3aed;">View this mystery →</a></div>` : ""}
              <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
                ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" })} · fires at purchase, not completion — check back in a few minutes to see how it turned out
              </div>
            </div>
          </div>`,
      }),
    });
    if (!resp.ok) {
      console.error(`[adaptation] purchase notification email failed: ${resp.status} ${await resp.text()}`);
    } else {
      console.log(`[adaptation] purchase notification email sent for batch ${batchId}`);
    }
  } catch (e) {
    console.error("[adaptation] purchase notification email error:", e);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      throw new Error("Missing Stripe signature header");
    }

    // Verify webhook signature (use async version for Deno/Web Crypto compatibility)
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        stripeWebhookSecret
      );
      console.log(`Verified Stripe webhook event: ${event.type}`);
    } catch (err) {
      console.error("Webhook signature verification failed:", err?.message || err);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Processing checkout.session.completed:", session.id);

        // Cold Case Files order? (Payment Link metadata → session metadata, ADR-0029)
        if (session.metadata?.product === "cold_case") {
          await handleColdCaseOrder(session);
          break;
        }

        const refId = session.client_reference_id;

        // ADR-0036/0082/0088 (staging only): adaptation checkouts use a
        // prefixed client_reference_id so they can never collide with a bare
        // conversations.id. This branch returns early via `break` -- every
        // line below it (the existing purchase path: conversations UPDATE,
        // GA4 event, purchase-notification email) is completely unchanged
        // for any client_reference_id that doesn't start with "adaptation-batch:".
        //
        // ADR-0088: a batch can cover multiple characters in one checkout
        // (one flat $5 charge regardless of count) -- one multi-row UPDATE
        // marks every row in the batch paid, then only batch_sequence=0 is
        // dispatched. adapt-mystery-apply chain-dispatches the rest of the
        // batch itself, strictly sequentially, once each prior row commits --
        // see that function's header comment for why concurrent dispatch of
        // a whole batch is unsafe. (The old singular "adaptation:" prefix is
        // retired, not kept alongside -- nothing in production ever used it;
        // every mystery_adaptations row now always belongs to a batch, even
        // a batch of one.)
        if (refId?.startsWith("adaptation-batch:")) {
          const batchId = refId.slice("adaptation-batch:".length);
          const { data: paidRows, error: adaptUpdateError } = await supabase
            .from("mystery_adaptations")
            .update({
              status: "paid",
              stripe_session_id: session.id,
              stripe_client_reference_id: refId,
              paid_at: new Date().toISOString(),
            })
            .eq("batch_id", batchId)
            .eq("status", "pending") // idempotent against Stripe's at-least-once delivery
            .select("id, batch_sequence, character_name, character_role, requested_by_email, conversation_id");

          if (adaptUpdateError) {
            console.error("Failed to mark adaptation batch paid:", adaptUpdateError);
          } else {
            console.log(`Marked ${paidRows?.length ?? 0} adaptation row(s) paid for batch ${batchId}`);
          }

          if (paidRows && paidRows.length > 0) {
            // Fire-and-forget, same as the processing dispatch below — a slow
            // or failed notification email must never delay the customer's
            // actual batch from starting. amount_total/currency come from the
            // session itself (the real charge, flat $5 regardless of N
            // characters — ADR-0088), not summed from row-level amount_usd.
            fireAndForget(sendAdaptationPurchaseNotification({
              batchId,
              rows: paidRows.map((r) => ({
                character_name: r.character_name as string,
                character_role: r.character_role as string | null,
              })),
              amountTotalCents: session.amount_total,
              currency: session.currency,
              customerEmail: session.customer_email
                || session.customer_details?.email
                || (paidRows.find((r) => r.requested_by_email)?.requested_by_email as string | undefined)
                || null,
              conversationId: (paidRows[0]?.conversation_id as string | undefined) ?? null,
            }));
          }

          const firstRow = (paidRows ?? []).find((r) => r.batch_sequence === 0);
          if (firstRow) {
            // Fire-and-forget: the webhook must return fast, and a slow/failed
            // transform must never make Stripe think this event delivery failed.
            fireAndForget(fetch(`${supabaseUrl}/functions/v1/adapt-mystery-apply`, {
              method: "POST",
              headers: { Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ adaptation_id: firstRow.id }),
            }));
          } else {
            // Re-delivered event after the batch was already claimed/processed
            // (or, unexpectedly, batch_sequence 0 wasn't in this UPDATE's
            // result) -- nothing new to dispatch, not an error.
            console.log(`No batch_sequence=0 row to dispatch for batch ${batchId} (already processed or re-delivered event)`);
          }

          break;
        }

        // Extract conversation ID from client_reference_id (UNCHANGED)
        const conversationId = refId;
        if (!conversationId) {
          console.warn("No client_reference_id found in session");
          break;
        }

        // Get customer email
        const customerEmail = session.customer_email || session.customer_details?.email;

        // Merge (not overwrite) the confirmed Stripe amount/currency/payment_intent
        // into mystery_data, so the client (PaymentSuccess.tsx) can read back the
        // real charged amount for the Google Ads purchase conversion instead of
        // guessing client-side which price tier (full vs. welcome-discount) applied.
        const { data: existingConv } = await supabase
          .from("conversations")
          .select("mystery_data")
          .eq("id", conversationId)
          .single();

        const mergedMysteryData = {
          ...((existingConv?.mystery_data as Record<string, unknown>) || {}),
          payment: {
            amount_total: session.amount_total,
            currency: session.currency,
            payment_intent: session.payment_intent,
          },
        };

        // Update conversation in database
        const { data: conversation, error: updateError } = await supabase
          .from("conversations")
          .update({
            is_paid: true,
            purchase_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            mystery_data: mergedMysteryData,
          })
          .eq("id", conversationId)
          .select("user_id")
          .single();

        if (updateError) {
          console.error("Error updating conversation:", updateError);
        } else {
          console.log(`Marked conversation ${conversationId} as paid`);
        }

        // Send GA4 purchase event
        // Generate or retrieve GA4 client_id (use session.id as fallback)
        const clientId = session.client_reference_id || session.id;
        const userId = conversation?.user_id;

        await sendGA4Event(
          clientId,
          userId,
          "purchase",
          {
            currency: session.currency?.toUpperCase() || "USD",
            value: (session.amount_total || 0) / 100, // Convert cents to dollars
            transaction_id: session.payment_intent as string,
            items: [
              {
                item_id: "murder_mystery_party",
                item_name: "Murder Mystery Party Package",
                price: (session.amount_total || 0) / 100,
                quantity: 1,
              },
            ],
            // Additional custom parameters
            conversation_id: conversationId,
            customer_email: customerEmail,
          }
        );

        console.log("Purchase conversion tracked in GA4");

        // Send purchase notification email
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey) {
          try {
            const amountFormatted = ((session.amount_total || 0) / 100).toFixed(2);
            const currency = (session.currency || "usd").toUpperCase();

            // Fetch mystery title from conversation
            const { data: convData } = await supabase
              .from("conversations")
              .select("title")
              .eq("id", conversationId)
              .single();

            const mysteryTitle = convData?.title || "Unknown Mystery";

            const notificationHtml = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                  <h2 style="margin: 0;">New Purchase!</h2>
                </div>
                <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #6b7280;">Mystery</td><td style="padding: 8px 0; font-weight: 600;">${mysteryTitle}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Amount</td><td style="padding: 8px 0; font-weight: 600;">${currency} ${amountFormatted}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Customer</td><td style="padding: 8px 0;">${customerEmail || "N/A"}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Conversation ID</td><td style="padding: 8px 0; font-size: 12px;">${conversationId}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Stripe Session</td><td style="padding: 8px 0; font-size: 12px;">${session.id}</td></tr>
                  </table>
                  <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
                    ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}
                  </div>
                </div>
              </div>
            `;

            const emailResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Mystery Maker <noreply@mysterymaker.party>",
                to: ["support@mysterymaker.party"],
                subject: `💰 New Purchase - ${mysteryTitle} (${currency} ${amountFormatted})`,
                html: notificationHtml,
              }),
            });

            if (!emailResponse.ok) {
              const errorText = await emailResponse.text();
              console.error(`Purchase notification email failed: ${emailResponse.status} ${errorText}`);
            } else {
              console.log("Purchase notification email sent successfully");
            }
          } catch (emailError) {
            console.error("Error sending purchase notification email:", emailError);
          }
        } else {
          console.warn("RESEND_API_KEY not set, skipping purchase notification email");
        }

        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout session expired:", session.id);

        // ADR-0092: an abandoned adaptation checkout (closed tab, hit back,
        // changed their mind) otherwise leaves its mystery_adaptations rows
        // stuck at 'pending' forever -- nothing else ever moves them out of
        // that status, which both permanently blocks the package's "only one
        // batch in flight" guard (adapt-mystery-create) and makes the host's
        // UI show a false "Update in progress" spinner for work that will
        // never happen (GuestDropoutPanel's active-batch poll treats any
        // pending/paid/processing row as in-flight). Release them here,
        // mirroring checkout.session.completed's adaptation branch above --
        // idempotent against Stripe's at-least-once delivery via the same
        // .eq("status", "pending") guard.
        const refId = session.client_reference_id;
        if (refId?.startsWith("adaptation-batch:")) {
          const batchId = refId.slice("adaptation-batch:".length);
          const { data: releasedRows, error: releaseErr } = await supabase
            .from("mystery_adaptations")
            .update({ status: "failed", error_message: "checkout_expired" })
            .eq("batch_id", batchId)
            .eq("status", "pending")
            .select("id, batch_sequence");

          if (releaseErr) {
            console.error("Failed to release expired adaptation batch:", releaseErr);
          } else {
            console.log(`Released ${releasedRows?.length ?? 0} adaptation row(s) for expired batch ${batchId}`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return success response
    return new Response(
      JSON.stringify({ received: true, event_type: event.type }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing webhook:", error?.message || error, error?.stack);

    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || String(error),
        stack: error?.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
