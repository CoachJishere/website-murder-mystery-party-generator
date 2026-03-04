# Stripe Webhook Integration Setup Guide

This Edge Function handles Stripe webhook events and tracks purchase conversions in GA4.

## What It Does

1. **Verifies Stripe webhook signatures** (security - prevents fake requests)
2. **Handles `checkout.session.completed` events** when payments succeed
3. **Updates Supabase** - marks conversations as `is_paid: true`
4. **Tracks conversions in GA4** - sends purchase events to Google Analytics

## Deployment Steps

### 1. Deploy the Edge Function

```bash
# From project root
cd "supabase/functions/stripe-webhook"

# Deploy to Supabase
supabase functions deploy stripe-webhook
```

After deployment, you'll get a URL like:
```
https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/stripe-webhook
```

### 2. Set Environment Variables in Supabase

Go to your Supabase project dashboard → Edge Functions → Configuration:

```bash
# Required variables:
STRIPE_SECRET_KEY=sk_live_...          # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...        # From Stripe webhook setup (see step 3)
GA4_API_SECRET=...                     # From Google Analytics (see step 4)

# Already set (inherited):
SUPABASE_URL=https://mhfikaomkmqcndqfohbp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Get Stripe Webhook Secret

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Set endpoint URL: `https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen for:
   - ✅ `checkout.session.completed` (required)
   - ✅ `checkout.session.expired` (optional - for tracking abandoned carts)
5. Click **"Add endpoint"**
6. Copy the **"Signing secret"** (starts with `whsec_...`)
7. Add it to Supabase as `STRIPE_WEBHOOK_SECRET`

### 4. Get GA4 API Secret

1. Go to [Google Analytics](https://analytics.google.com)
2. Navigate to: **Admin (⚙️) → Data Streams → Your Web Stream**
3. Scroll to **"Measurement Protocol API secrets"**
4. Click **"Create"**
5. Give it a nickname (e.g., "Stripe Webhook")
6. Copy the **secret value**
7. Add it to Supabase as `GA4_API_SECRET`

### 5. Test the Integration

#### Test in Stripe Dashboard:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Find your webhook endpoint
3. Click **"Send test webhook"**
4. Select `checkout.session.completed`
5. Click **"Send test webhook"**

#### Check logs:
```bash
supabase functions logs stripe-webhook --project-ref mhfikaomkmqcndqfohbp
```

Expected output:
```
✅ Verified Stripe webhook event: checkout.session.completed
✅ Marked conversation {id} as paid
✅ GA4 purchase event sent successfully
```

## How It Works

### Webhook Flow

```
Stripe Payment → Webhook Event → Edge Function → Updates Database + GA4
                                       ↓
                          1. Verify signature (security)
                          2. Parse checkout.session.completed
                          3. Update conversations table (is_paid=true)
                          4. Send purchase event to GA4
                          5. Return 200 OK to Stripe
```

### GA4 Purchase Event Structure

```javascript
{
  client_id: "conversation_id",
  user_id: "supabase_user_id",
  events: [{
    name: "purchase",
    params: {
      currency: "USD",
      value: 9.99,
      transaction_id: "pi_...",
      items: [{
        item_id: "murder_mystery_party",
        item_name: "Murder Mystery Party Package",
        price: 9.99,
        quantity: 1
      }],
      conversation_id: "...",
      customer_email: "user@example.com"
    }
  }]
}
```

## Security Features

✅ **Webhook signature verification** - Rejects unsigned/invalid requests
✅ **Environment variables** - Secrets never exposed in code
✅ **Service role key** - Function can update database securely

## Troubleshooting

### "Invalid signature" error
- Check that `STRIPE_WEBHOOK_SECRET` matches your Stripe webhook endpoint
- Ensure you're using the signing secret from the correct webhook endpoint

### "GA4 event failed" in logs
- Verify `GA4_API_SECRET` is correct
- Check that GA4_MEASUREMENT_ID matches your property (currently: G-XGD48X4ZQS)

### Conversation not marked as paid
- Check that `client_reference_id` is set in Stripe checkout (should be conversation ID)
- Verify database permissions for the service role key

### No GA4 conversions showing
- Wait 24-48 hours (GA4 has processing delay)
- Check GA4 Realtime report → Events → Look for "purchase" event
- Verify conversion is configured in GA4 Admin → Events → Mark "purchase" as conversion

## Next Steps

After setup is complete:

1. ✅ Mark "purchase" event as conversion in GA4 Admin
2. ✅ Test with a real payment (use Stripe test mode first)
3. ✅ Monitor GA4 Realtime report for purchase events
4. ✅ Set up GA4 alert for failed webhooks (optional)

## File Structure

```
supabase/functions/stripe-webhook/
├── index.ts          # Main webhook handler
└── README.md         # This file
```
