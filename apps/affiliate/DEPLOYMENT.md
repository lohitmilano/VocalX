# VocalX Affiliate Program - Deployment Guide

## Quick Deploy Options

### Option 1: Railway (Recommended)

Railway provides the easiest deployment with built-in PostgreSQL:

1. **Connect Repository**
   ```bash
   # Push to GitHub first
   git add .
   git commit -m "Add affiliate program"
   git push
   ```

2. **Deploy on Railway**
   - Visit [railway.app](https://railway.app)
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Choose `apps/affiliate` as root directory

3. **Add Environment Variables**
   ```env
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=your-super-secure-jwt-secret-key-here-min-32-chars
   STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
   MAIN_APP_URL=https://getvocalx.app
   FRONTEND_URL=https://affiliate.getvocalx.app
   ```

4. **Add PostgreSQL Service**
   - Click "Add Service" → "Database" → "PostgreSQL"
   - Railway will auto-connect the DATABASE_URL

5. **Custom Domain**
   - Go to Settings → Domains
   - Add custom domain: `affiliate.getvocalx.app`
   - Update DNS: `CNAME affiliate -> your-app.railway.app`

### Option 2: Vercel + Supabase

1. **Deploy to Vercel**
   ```bash
   cd apps/affiliate
   npx vercel --prod
   ```

2. **Set up Supabase Database**
   - Create project at [supabase.com](https://supabase.com)
   - Get connection string from Settings → Database
   - Add to Vercel environment variables

3. **Configure Environment Variables**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add all required variables from `env.example`

### Option 3: Docker + DigitalOcean

1. **Build and Push Docker Image**
   ```bash
   cd apps/affiliate
   docker build -t vocalx-affiliate .
   docker tag vocalx-affiliate your-registry/vocalx-affiliate
   docker push your-registry/vocalx-affiliate
   ```

2. **Deploy on DigitalOcean App Platform**
   - Create new app from Docker image
   - Add managed PostgreSQL database
   - Configure environment variables

## Post-Deployment Setup

### 1. Database Migration

```bash
# SSH into your server or use Railway/Vercel CLI
npx prisma migrate deploy
npx prisma generate
```

### 2. Create Initial Admin

```bash
# Run the setup script
npm run setup
```

Or manually create admin:

```sql
INSERT INTO admins (id, email, name, password, role, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@getvocalx.app',
  'VocalX Admin',
  '$2a$12$your_bcrypt_hashed_password',
  'admin',
  true,
  NOW(),
  NOW()
);
```

### 3. Configure Stripe Webhook

1. **Stripe Dashboard**
   - Go to Webhooks → Add endpoint
   - URL: `https://affiliate.getvocalx.app/api/webhooks/stripe`
   - Events: `invoice.payment_succeeded`, `charge.refunded`, `customer.created`

2. **Test Webhook**
   ```bash
   # Use Stripe CLI to test
   stripe listen --forward-to https://affiliate.getvocalx.app/api/webhooks/stripe
   stripe trigger invoice.payment_succeeded
   ```

### 4. DNS Configuration

Add these DNS records to your domain:

```
Type: CNAME
Name: affiliate
Value: your-deployment-url.railway.app (or vercel.app)
TTL: 300
```

## Environment Variables Reference

### Required Variables

```env
# Database (auto-provided by Railway/Supabase)
DATABASE_URL="postgresql://..."

# Authentication (generate secure random string)
JWT_SECRET="your-super-secure-jwt-secret-key-here-min-32-chars"

# Stripe (from Stripe Dashboard)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."

# URLs
MAIN_APP_URL="https://getvocalx.app"
FRONTEND_URL="https://affiliate.getvocalx.app"
```

### Optional Variables

```env
# Email notifications
SENDGRID_API_KEY="SG...."
ADMIN_EMAIL="admin@getvocalx.app"

# Security tuning
BCRYPT_ROUNDS="12"
RATE_LIMIT_MAX="100"
RATE_LIMIT_WINDOW="900000"
```

## Integration with Main VocalX App

### 1. Customer Attribution

Add this to your main app's signup flow:

```typescript
// In your main VocalX app
async function attributeCustomerToAffiliate(customerData: {
  email: string;
  stripeCustomerId: string;
  affiliateCode?: string;
}) {
  if (!customerData.affiliateCode) return;

  try {
    await fetch('https://affiliate.getvocalx.app/api/customers/attribute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AFFILIATE_API_KEY}`,
      },
      body: JSON.stringify({
        email: customerData.email,
        stripeCustomerId: customerData.stripeCustomerId,
        affiliateCode: customerData.affiliateCode,
      }),
    });
  } catch (error) {
    console.error('Failed to attribute customer to affiliate:', error);
  }
}
```

### 2. Referral Link Tracking

Add this to your main app's landing pages:

```typescript
// In your main VocalX app (client-side)
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get('ref');
  
  if (ref) {
    // Set cookie for 30 days
    document.cookie = `vocalx_ref=${ref}; max-age=2592000; path=/; domain=.getvocalx.app`;
  }
}, []);
```

## Monitoring & Maintenance

### Health Checks

```bash
# Check application health
curl https://affiliate.getvocalx.app/api/health

# Check database connection
curl https://affiliate.getvocalx.app/api/dashboard/stats
```

### Logs

```bash
# Railway
railway logs

# Vercel
vercel logs

# Docker
docker logs container_name
```

### Database Backups

```bash
# Railway (automatic backups enabled)
# Manual backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check DATABASE_URL format
   echo $DATABASE_URL
   
   # Test connection
   npx prisma db pull
   ```

2. **Stripe Webhook Failures**
   ```bash
   # Check webhook logs in Stripe Dashboard
   # Verify STRIPE_WEBHOOK_SECRET matches
   # Test with Stripe CLI
   ```

3. **JWT Authentication Issues**
   ```bash
   # Ensure JWT_SECRET is at least 32 characters
   # Check token expiration (24 hours)
   ```

### Performance Optimization

1. **Database Indexing**
   ```sql
   -- Add indexes for common queries
   CREATE INDEX idx_commission_events_affiliate_month ON commission_events(affiliate_id, month_year);
   CREATE INDEX idx_payouts_status ON payouts(status);
   ```

2. **Caching**
   - Add Redis for session storage
   - Cache dashboard statistics
   - Use CDN for static assets

## Security Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Environment variables secured (not in code)
- [ ] Database connection encrypted
- [ ] Stripe webhook signature verification enabled
- [ ] Rate limiting configured
- [ ] Admin password changed from default
- [ ] CORS properly configured
- [ ] SQL injection protection via Prisma
- [ ] XSS protection enabled

## Support

For deployment issues:
1. Check application logs
2. Verify environment variables
3. Test database connectivity
4. Contact: admin@getvocalx.app
