
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

        // Extract conversation ID from client_reference_id
        const conversationId = session.client_reference_id;
        if (!conversationId) {
          console.warn("No client_reference_id found in session");
          break;
        }

        // Get customer email
        const customerEmail = session.customer_email || session.customer_details?.email;

        // First name only, for the recent-sales popup (ADR-0071). Display is
        // separately gated on the customer's own social_proof_opt_in choice
        // captured at checkout -- this just stores what Stripe already collects.
        const purchaserFirstName = session.customer_details?.name?.trim().split(/\s+/)[0] || null;

        // Update conversation in database
        const { data: conversation, error: updateError } = await supabase
          .from("conversations")
          .update({
            is_paid: true,
            purchase_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            purchaser_first_name: purchaserFirstName,
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
        // Optional: track abandoned checkouts
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
