# VocalX Affiliate Program

A comprehensive affiliate management system for VocalX with commission tracking, automated payouts, and Stripe integration.

## Features

- 🎯 **Affiliate Management**: Create, manage, and track affiliate partners
- 💰 **Commission Tracking**: Automated commission calculation based on Stripe payments
- 📊 **Analytics Dashboard**: Real-time insights and performance metrics
- 💸 **Payout Management**: Monthly payout generation and approval workflow
- 🔗 **Referral Tracking**: Unique tracking links with 30-day attribution window
- 🏆 **Tier System**: Silver/Gold/Platinum tiers with different commission rates
- 🔐 **Secure Admin Portal**: JWT-based authentication with role management
- 📈 **Stripe Integration**: Webhook-based commission processing

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT with bcrypt
- **Payments**: Stripe webhooks
- **Charts**: Recharts
- **Deployment**: Vercel/Railway/Heroku ready

## Quick Start

### 1. Environment Setup

```bash
# Copy environment variables
cp env.example .env.local

# Install dependencies
npm install

# Set up database
npx prisma migrate dev
npx prisma generate
```

### 2. Configure Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/vocalx_affiliate"

# Authentication
JWT_SECRET="your-super-secure-jwt-secret-key-here-min-32-chars"

# Stripe
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"

# App URLs
MAIN_APP_URL="https://getvocalx.app"
FRONTEND_URL="https://affiliate.getvocalx.app"
```

### 3. Initialize Database

```bash
# Run setup script to create admin user and sample data
npm run setup
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3001/login` and login with:
- **Email**: `admin@getvocalx.app`
- **Password**: `admin123` (change this immediately!)

## Stripe Webhook Setup

1. In your Stripe Dashboard, go to Webhooks
2. Add endpoint: `https://affiliate.getvocalx.app/api/webhooks/stripe`
3. Select events:
   - `invoice.payment_succeeded`
   - `charge.refunded`
   - `customer.created`
4. Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`

## Commission Flow

1. **Customer Attribution**: When a customer clicks an affiliate link (`?ref=AFFILIATE_CODE`), they're tracked via cookie
2. **Payment Processing**: When Stripe processes a payment, webhook triggers commission calculation
3. **Commission Calculation**: Based on affiliate tier (15-25% commission rates)
4. **Monthly Payouts**: Generate and approve monthly payouts for affiliates
5. **Bank Transfers**: Manual bank transfers (Stripe Connect integration available)

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login

### Affiliates
- `GET /api/affiliates` - List affiliates
- `POST /api/affiliates` - Create affiliate
- `GET /api/affiliates/[id]` - Get affiliate details
- `PUT /api/affiliates/[id]` - Update affiliate
- `DELETE /api/affiliates/[id]` - Deactivate affiliate

### Payouts
- `GET /api/payouts` - List payouts
- `POST /api/payouts` - Generate monthly payouts
- `PUT /api/payouts/[id]` - Update payout status
- `GET /api/payouts/export` - Export payouts as CSV

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler

## Database Schema

### Core Tables
- `admins` - Admin users
- `affiliates` - Affiliate partners
- `customers` - Referred customers
- `commission_events` - Individual commission transactions
- `payouts` - Monthly payout records
- `webhook_logs` - Stripe webhook event logs

## Deployment

### Railway (Recommended)

1. Connect your GitHub repository
2. Add environment variables
3. Deploy automatically

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Set up PostgreSQL database
3. Run migrations:
```bash
npx prisma migrate deploy
```

4. Start the server:
```bash
npm start
```

## Integration with Main VocalX App

To integrate with your main VocalX application:

### 1. Customer Attribution

In your main app's signup/registration flow:

```typescript
// Check for affiliate referral
const affiliateCode = req.cookies.get('vocalx_ref') || req.query.ref;

if (affiliateCode) {
  // Store affiliate attribution
  await fetch('https://affiliate.getvocalx.app/api/customers/attribute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerEmail: user.email,
      stripeCustomerId: user.stripeCustomerId,
      affiliateCode,
    }),
  });
}
```

### 2. Referral Link Tracking

Add this to your main app's landing pages:

```typescript
// Set affiliate cookie when ?ref= parameter is present
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get('ref');
  
  if (ref) {
    // Set cookie for 30 days
    document.cookie = `vocalx_ref=${ref}; max-age=2592000; path=/`;
  }
}, []);
```

## Security Considerations

- JWT tokens expire after 24 hours
- Passwords are hashed with bcrypt (12 rounds)
- Rate limiting on login attempts (5 per 15 minutes)
- Stripe webhook signature verification
- SQL injection prevention via Prisma
- XSS protection via input sanitization

## Monitoring & Analytics

The dashboard provides:
- Total affiliates and commission metrics
- Monthly commission trends
- Top performing affiliates
- Tier distribution
- Pending payout summaries

## Support

For questions or issues:
1. Check the [API documentation](./docs/api.md)
2. Review [deployment guide](./docs/deployment.md)
3. Contact: admin@getvocalx.app

## License

Proprietary - VocalX Affiliate Program
