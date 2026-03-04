
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.17.0";

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
const GA4_MEASUREMENT_ID = "G-1VCPKFH6NV";
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

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        stripeWebhookSecret
      );
      console.log(`Verified Stripe webhook event: ${event.type}`);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
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

        // Update conversation in database
        const { data: conversation, error: updateError } = await supabase
          .from("conversations")
          .update({
            is_paid: true,
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent as string,
            updated_at: new Date().toISOString(),
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
    console.error("Error processing webhook:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
