# Stripe Integration Setup Guide

## Overview
This guide explains how to set up Stripe for the TodoDJs subscription payment system.

## Prerequisites
- Stripe account (sign up at https://stripe.com)
- Access to Stripe Dashboard

## Step 1: Get Your Stripe API Keys

1. Log in to your Stripe Dashboard: https://dashboard.stripe.com
2. Navigate to **Developers** → **API keys**
3. Copy your keys:
   - **Publishable key** (starts with `pk_test_` for test mode)
   - **Secret key** (starts with `sk_test_` for test mode)

## Step 2: Configure Environment Variables

Add these to your `server/.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Step 3: Set Up Stripe Webhooks

Webhooks allow Stripe to notify your server about payment events.

### For Local Development (using Stripe CLI):

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login to Stripe CLI:
   ```bash
   stripe login
   ```
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:5000/api/stripe/webhook
   ```
4. Copy the webhook signing secret (starts with `whsec_`) and add it to your `.env` file

### For Production:

1. Go to **Developers** → **Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Enter your webhook URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret and add it to your production `.env` file

## Step 4: Test the Integration

### Test Cards (Test Mode Only):

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

Use any future expiry date, any 3-digit CVC, and any postal code.

## Subscription Plans

The system includes 4 subscription plans:

1. **Individual Monthly** - €19.99/month
2. **Individual Quarterly** - €54.99/3 months ⭐
3. **Shared Monthly** - €29.99/month
4. **Shared Quarterly** - €79.99/3 months ⭐

## Payment Flow

1. User selects a plan on the pricing page
2. Frontend creates a checkout session via `/api/stripe/create-checkout-session`
3. User is redirected to Stripe Checkout
4. User completes payment
5. Stripe redirects back to success page with session ID
6. Frontend verifies payment via `/api/stripe/verify-payment`
7. Backend activates subscription and updates user record
8. Webhook confirms payment (backup verification)

## API Endpoints

### Public Endpoints:
- `GET /api/stripe/config` - Get Stripe publishable key
- `POST /api/stripe/webhook` - Handle Stripe webhooks

### Protected Endpoints:
- `POST /api/stripe/create-checkout-session` - Create checkout session
- `POST /api/stripe/create-payment-intent` - Create payment intent (alternative)
- `POST /api/stripe/verify-payment` - Verify and activate subscription

## Security Notes

1. **Never expose your secret key** - Keep it server-side only
2. **Always verify webhook signatures** - Prevents fake webhook calls
3. **Use HTTPS in production** - Required for PCI compliance
4. **Validate amounts server-side** - Never trust client-side pricing

## Going Live

When ready for production:

1. Switch to **Live mode** in Stripe Dashboard
2. Get your live API keys (start with `pk_live_` and `sk_live_`)
3. Update environment variables with live keys
4. Set up production webhook endpoint
5. Test with real cards (small amounts first)
6. Enable Stripe Radar for fraud prevention

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Test your integration: https://stripe.com/docs/testing

## Troubleshooting

### Webhook not receiving events:
- Check webhook URL is accessible
- Verify webhook secret is correct
- Check Stripe CLI is running (local dev)
- Review webhook logs in Stripe Dashboard

### Payment not activating subscription:
- Check webhook handler is processing events
- Verify user ID in session metadata
- Check server logs for errors
- Ensure database connection is stable

### Test cards not working:
- Confirm you're in test mode
- Use correct card numbers from Stripe docs
- Check for any rate limiting
