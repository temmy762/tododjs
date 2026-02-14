# TodoDJS Backend API

Backend server for TodoDJS Music Platform with authentication and payment processing.

## Features

- **User Authentication** (JWT-based)
  - Registration & Login
  - Password hashing with bcrypt
  - Protected routes
  - Role-based access control (User/Admin)

- **Subscription Management**
  - Free, Premium, and Pro plans
  - Stripe integration for payments
  - Automatic subscription handling via webhooks
  - Download limits based on subscription tier

- **Payment Processing**
  - Stripe Checkout integration
  - Subscription creation and management
  - Webhook handling for payment events
  - Cancel/Reactivate subscriptions

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Stripe Payment Gateway
- bcrypt for password hashing

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Environment Variables

Create a `.env` file in the server directory:

```env
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/tododjs

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRE=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Price IDs (create these in Stripe Dashboard)
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxx
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_xxx
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
STRIPE_PRO_YEARLY_PRICE_ID=price_xxx

# Frontend
FRONTEND_URL=http://localhost:5174
```

### 3. MongoDB Setup

**Option A: Local MongoDB**
```bash
# Install MongoDB locally
# Start MongoDB service
mongod
```

**Option B: MongoDB Atlas (Cloud)**
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string
4. Update MONGODB_URI in .env

### 4. Stripe Setup

1. Create Stripe account at https://stripe.com
2. Get API keys from Dashboard
3. Create Products and Prices:
   - Premium Monthly ($9.99)
   - Premium Yearly ($99.99)
   - Pro Monthly ($19.99)
   - Pro Yearly ($199.99)
4. Copy Price IDs to .env
5. Setup webhook endpoint: `http://localhost:5000/api/payment/webhook`
6. Copy webhook secret to .env

### 5. Start Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Server will run on http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user (Protected)
- `PUT /api/auth/updatedetails` - Update user details (Protected)
- `PUT /api/auth/updatepassword` - Update password (Protected)

### Payment
- `POST /api/payment/create-checkout-session` - Create Stripe checkout (Protected)
- `POST /api/payment/webhook` - Stripe webhook handler
- `POST /api/payment/cancel-subscription` - Cancel subscription (Protected)
- `POST /api/payment/reactivate-subscription` - Reactivate subscription (Protected)
- `GET /api/payment/subscription` - Get subscription details (Protected)

### Health Check
- `GET /api/health` - Server health check

## Testing with Stripe

Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

Any future expiry date and any 3-digit CVC.

## Subscription Plans

### Free
- 5 downloads/day
- MP3 quality
- Basic support

### Premium ($9.99/month or $99.99/year)
- 50 downloads/day
- WAV & MP3 quality
- Priority support
- Exclusive content

### Pro ($19.99/month or $199.99/year)
- Unlimited downloads
- WAV & FLAC quality
- 24/7 support
- Early access
- API access

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- HTTP-only cookies
- CORS protection
- Rate limiting
- Helmet security headers
- Input validation

## Next Steps

1. Install MongoDB
2. Setup Stripe account and products
3. Configure environment variables
4. Run the server
5. Test authentication endpoints
6. Test payment flow with Stripe test cards
