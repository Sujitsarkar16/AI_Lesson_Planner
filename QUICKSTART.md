# 🚀 Quick Start Guide - Get Running in 15 Minutes

This is a condensed version to get you up and running quickly. For detailed instructions, see [SETUP.md](SETUP.md).

## ⚡ Prerequisites
- Node.js 18+ installed
- Code editor (VS Code recommended)
- Terminal/command line access

## 📝 Step-by-Step Setup

### 1. Install Dependencies (2 min)
```bash
cd "d:/AI Projects/ai-lesson-planner"
npm install
```

### 2. Get Your API Keys (10 min)

#### Auth0 (2 min)
1. Go to https://auth0.com → Sign up
2. Create Application → Single Page Application
3. Copy: Domain, Client ID
4. Settings → Application URIs:
   - Allowed Callback URLs: `http://localhost:3000`
   - Allowed Logout URLs: `http://localhost:3000`
   - Allowed Web Origins: `http://localhost:3000`

#### Google Gemini (1 min)
1. Go to https://makersuite.google.com/app/apikey
2. Create API Key
3. Copy the key

#### Supabase (3 min)
1. Go to https://supabase.com → New Project
2. Wait for setup (~2 min)
3. Settings → API:
   - Copy Project URL
   - Copy `anon public` key
   - Copy `service_role` key
4. SQL Editor → New query:
   - Copy/paste contents of `supabase/schema.sql`
   - Run (Execute)

#### Stripe (4 min)
1. Go to https://dashboard.stripe.com → Sign up
2. Developers → API keys → Copy test keys
3. Products → Add Product:
   - Name: "Pro Plan"
   - Price: $12/month recurring → Save
   - Copy Price ID (starts with `price_`)
4. Products → Add Product:
   - Name: "School Plan"
   - Price: $49/month recurring → Save
   - Copy Price ID

### 3. Configure Environment (2 min)

Create `.env` file in project root:

```env
# Auth0
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id
VITE_AUTH0_AUDIENCE=https://your-tenant.auth0.com/api/v2/

# Google Gemini
VITE_API_KEY=your_gemini_api_key
GEMINI_API_KEY=your_gemini_api_key

# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
VITE_STRIPE_PRO_PRICE_ID=price_xxxxx
VITE_STRIPE_SCHOOL_PRICE_ID=price_xxxxx

# App
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_URL=http://localhost:3000
VITE_ENVIRONMENT=development
```

Replace all `your_*` and `xxxxx` with actual values from step 2.

### 4. Start Development Server (1 min)

#### Terminal 1 - App:
```bash
npm run dev
```

#### Terminal 2 - Stripe Webhooks (optional for testing payments):
```bash
# Install Stripe CLI first:
# Mac: brew install stripe/stripe-cli/stripe
# Windows: Download from stripe.com/docs/stripe-cli

stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the webhook secret (whsec_...) to your .env file as STRIPE_WEBHOOK_SECRET
```

### 5. Test the App! 🎉

Visit: http://localhost:3000

**Try these:**
1. Click "Get Started" → Sign up
2. Go to Dashboard → Generate
3. Create a lesson plan
4. View in My Documents
5. Test export (PDF is free)
6. Go to Billing → Try upgrading (use test card: `4242 4242 4242 4242`)

## 🐛 Common Issues

**"Cannot find module" errors:**
```bash
npm install
```

**Auth0 login fails:**
- Check callback URLs in Auth0 dashboard
- Verify VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID

**Supabase errors:**
- Verify you ran the schema.sql in Supabase SQL Editor
- Check VITE_SUPABASE_URL and keys are correct

**Stripe not working:**
- Make sure webhook secret is set
- Run `stripe listen` in separate terminal

## 📱 Test Payment Flow

1. Go to Billing page
2. Click "Upgrade Plan"
3. Choose Pro ($12/mo)
4. Use test card: `4242 4242 4242 4242`
5. Expiry: any future date (e.g., 12/25)
6. CVC: any 3 digits (e.g., 123)
7. Complete checkout
8. You should see "Pro" tier in billing page

## 🚀 Deploy to Production

When ready to deploy:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts, then add environment variables in Vercel dashboard
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 📚 Next Steps

- Read [SETUP.md](SETUP.md) for detailed configuration
- Read [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- Read [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for technical details
- Check [README.md](README.md) for project overview

## 🆘 Need Help?

1. Check browser console for errors (F12)
2. Check terminal for server errors
3. Review [SETUP.md](SETUP.md) troubleshooting section
4. All environment variables set correctly?
5. Database schema loaded in Supabase?

## ✅ You're Ready!

The app should now be running at http://localhost:3000

Enjoy your production-ready SaaS application! 🎉
