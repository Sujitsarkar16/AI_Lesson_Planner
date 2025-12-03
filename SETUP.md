# AI Lesson Planner - Complete Setup Guide

## 🚀 Quick Start

This guide will help you set up the AI Lesson Planner from scratch to deployment.

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git
- Accounts needed:
  - Auth0 (free tier)
  - Google AI Studio (for Gemini API)
  - Supabase (free tier)
  - Stripe (for payments)
  - Vercel (for deployment)

## 🔧 Installation

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd ai-lesson-planner

# Install dependencies
npm install
```

### 2. Setup Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials (see Configuration section below).

## ⚙️ Configuration

### Auth0 Setup

1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Create a new application (Single Page Application)
3. Note down:
   - Domain: `your-tenant.auth0.com`
   - Client ID: `your_client_id`
   - Audience: `https://your-tenant.auth0.com/api/v2/`
4. Configure Application URIs:
   - Allowed Callback URLs: `http://localhost:3000, http://localhost:3000/`
   - Allowed Logout URLs: `http://localhost:3000`
   - Allowed Web Origins: `http://localhost:3000`
5. Enable Google Social Connection (optional)

Add to `.env`:
```
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id
VITE_AUTH0_AUDIENCE=https://your-tenant.auth0.com/api/v2/
```

### Google Gemini API Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `.env`:
```
VITE_API_KEY=your_gemini_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### Supabase Setup

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Create a new project
3. Wait for project to be ready
4. Go to Settings > API
5. Note down:
   - Project URL
   - `anon` public key
   - `service_role` secret key (keep this secret!)
6. Go to SQL Editor
7. Run the schema from `supabase/schema.sql`
8. Add to `.env`:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Stripe Setup

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Get API keys from Developers > API keys
3. Create products:
   
   **Pro Plan:**
   - Go to Products > Add Product
   - Name: "Pro Plan"
   - Price: $12.00/month recurring
   - Click "Add pricing" > Save
   - Copy the Price ID (starts with `price_`)
   
   **School Plan:**
   - Go to Products > Add Product
   - Name: "School Plan"
   - Price: $49.00/month recurring
   - Click "Add pricing" > Save
   - Copy the Price ID

4. Setup Webhook (for development):
   - Install Stripe CLI: `brew install stripe/stripe-cli/stripe` (Mac) or download from Stripe
   - Login: `stripe login`
   - Forward webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
   - Copy the webhook secret (starts with `whsec_`)

5. Add to `.env`:
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
VITE_STRIPE_PRO_PRICE_ID=price_xxxxx
VITE_STRIPE_SCHOOL_PRICE_ID=price_xxxxx
```

### App Configuration

Add to `.env`:
```
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_URL=http://localhost:3000
VITE_ENVIRONMENT=development
```

## 🏃 Running Locally

### Start Development Server

```bash
# Start the app
npm run dev

# In another terminal, start Stripe webhook forwarding
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Visit `http://localhost:3000` in your browser.

### Test Features

1. **Authentication:**
   - Click "Get Started" or "Log In"
   - Sign up with email or Google

2. **Document Generation:**
   - Go to Dashboard > Generate
   - Fill in the form
   - Click "Generate"
   - Save the document

3. **Subscription (Test Mode):**
   - Go to Dashboard > Billing
   - Click "Upgrade Plan"
   - Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: any future date
   - CVC: any 3 digits

4. **Export:**
   - Go to My Documents
   - Click on a document
   - Click "Export" button
   - Choose PDF or DOCX (DOCX requires Pro)

## 🗄️ Database Migration

If you have existing data in localStorage, it will be automatically migrated to Supabase on first login.

To manually migrate:
1. The migration happens automatically in `AuthContext.tsx`
2. Check browser console for migration status
3. Old localStorage data will be cleared after successful migration

## 📦 Building for Production

```bash
# Build the app
npm run build

# Preview production build
npm run preview
```

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions to Vercel.

### Quick Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts
```

Then configure environment variables in Vercel Dashboard.

## 🧪 Testing

### Manual Testing Checklist

- [ ] User registration and login
- [ ] Document generation (all types)
- [ ] Document save and retrieval
- [ ] Document delete
- [ ] Template selection
- [ ] PDF export
- [ ] DOCX export (Pro only)
- [ ] Subscription upgrade (Pro)
- [ ] Subscription upgrade (School)
- [ ] Usage limit enforcement (Free tier)
- [ ] Subscription cancellation
- [ ] Webhook handling (subscription events)

### Test Credit Cards (Stripe Test Mode)

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Require SCA: `4000 0025 0000 3155`

## 🔐 Security Checklist

- [ ] Environment variables not committed to git
- [ ] `.env` added to `.gitignore`
- [ ] Auth0 redirect URLs configured correctly
- [ ] Supabase RLS policies enabled
- [ ] Stripe webhook signature verification enabled
- [ ] HTTPS enabled in production
- [ ] API keys rotated regularly

## 🐛 Troubleshooting

### Build Errors

**Error: Cannot find module '@supabase/supabase-js'**
```bash
npm install
```

**Error: TypeScript errors**
```bash
# Check for errors
npm run build

# Fix and rebuild
```

### Runtime Errors

**Supabase connection failed**
- Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Ensure RLS policies are set up correctly
- Check Supabase project is active

**Stripe checkout not working**
- Verify VITE_STRIPE_PUBLISHABLE_KEY is correct
- Check Price IDs are valid
- Ensure webhook is running in development

**Auth0 login fails**
- Verify redirect URIs are configured
- Check Auth0 credentials
- Ensure application is not blocked

### Database Issues

**Can't insert documents**
- Check Supabase RLS policies
- Verify user ID is correct
- Check database schema is created

**Migration from localStorage fails**
- Open browser console
- Check for error messages
- Verify Supabase connection

## 📚 Project Structure

```
ai-lesson-planner/
├── api/                    # Serverless API functions
│   └── stripe/            # Stripe payment endpoints
├── components/            # React components
│   └── apps/             # Generator components
├── data/                  # Templates and static data
├── pages/                 # Page components
├── supabase/             # Database schema
├── utils/                # Utility functions
│   ├── stripeClient.ts   # Stripe configuration
│   ├── supabaseClient.ts # Supabase client
│   ├── databaseService.ts # Database operations
│   ├── pdfExport.ts      # PDF generation
│   └── docxExport.ts     # DOCX generation
├── .env.example          # Environment template
├── vercel.json           # Vercel configuration
└── DEPLOYMENT.md         # Deployment guide
```

## 🆘 Getting Help

1. Check this guide
2. Review [DEPLOYMENT.md](./DEPLOYMENT.md)
3. Check browser console for errors
4. Review Vercel/Supabase/Stripe logs
5. Create an issue on GitHub

## 📝 License

See LICENSE file for details.

## 🎉 Congratulations!

You're now ready to use and deploy the AI Lesson Planner. Good luck with your launch! 🚀
