# 🚀 CI/CD Setup Guide

## ✅ What's Been Configured

### GitHub Actions Workflow
A complete CI/CD pipeline has been set up at [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) that automatically:

1. **Builds and Tests** on every push and pull request to `main` or `develop` branches
2. **Deploys to Vercel** automatically when code is pushed to `main` branch

### Pipeline Jobs

#### 1. Build and Test Job
Runs on multiple Node.js versions (18.x and 20.x) and performs:
- ✅ Code checkout
- ✅ Node.js setup with npm caching
- ✅ Dependency installation (`npm ci`)
- ✅ TypeScript type checking
- ✅ Production build
- ✅ Build artifacts archiving

#### 2. Deploy to Vercel Job
Automatically deploys to Vercel production when:
- All tests pass
- Code is pushed to `main` branch
- Uses Vercel Action for seamless deployment

---

## 🔐 Required GitHub Secrets

To enable Vercel deployment, you need to add these secrets to your GitHub repository:

### How to Add Secrets:
1. Go to your repository: https://github.com/Sujitsarkar16/AI_Lesson_Planner
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

### Required Secrets:

#### `VERCEL_TOKEN`
- **Description**: Your Vercel authentication token
- **How to get it**:
  1. Go to https://vercel.com/account/tokens
  2. Click "Create Token"
  3. Give it a name (e.g., "GitHub Actions")
  4. Copy the token

#### `VERCEL_ORG_ID`
- **Description**: Your Vercel organization/team ID
- **How to get it**:
  1. Install Vercel CLI: `npm i -g vercel`
  2. Run `vercel login`
  3. Run `vercel link` in your project directory
  4. Check `.vercel/project.json` for `orgId`
  
  OR
  
  1. Go to https://vercel.com/account
  2. Your org ID is in the URL: `https://vercel.com/[ORG_ID]/...`

#### `VERCEL_PROJECT_ID`
- **Description**: Your Vercel project ID
- **How to get it**:
  1. After running `vercel link`, check `.vercel/project.json` for `projectId`
  
  OR
  
  1. Go to your project settings in Vercel dashboard
  2. The project ID is shown in the settings

---

## 📝 What Was Removed

### Stripe Payment Integration
All Stripe-related code has been removed to simplify the codebase:

**Deleted Files:**
- ❌ `api/stripe/create-checkout-session.ts`
- ❌ `api/stripe/webhook.ts`
- ❌ `api/stripe/manage-subscription.ts`
- ❌ `utils/stripeClient.ts`
- ❌ `components/UpgradeModal.tsx`
- ❌ `pages/BillingPage.tsx`

**Updated Files:**
- ✅ `package.json` - Removed `@stripe/stripe-js` and `stripe` dependencies
- ✅ `App.tsx` - Removed billing route
- ✅ `.env.example` - Removed Stripe environment variables
- ✅ `components/ExportModal.tsx` - Removed Stripe tier dependencies

### Documentation Files
The following files are now gitignored and won't be pushed to the repository:
- ❌ `MARKET_READINESS_PLAN.txt`
- ❌ `DEPLOYMENT.md`
- ❌ `IMPLEMENTATION_SUMMARY.md`

---

## 🌐 Deployment Workflow

### Automatic Deployment
Every push to `main` branch will:
1. Run all tests and type checks
2. Build the application
3. Deploy to Vercel production if all checks pass

### Manual Deployment
You can also deploy manually:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

---

## 🧪 Testing the CI/CD Pipeline

### Test Build Locally
Before pushing, test if the build works:
```bash
npm run build
```

### Test Type Checking
```bash
npx tsc --noEmit
```

### Trigger CI/CD
Simply push to the repository:
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

Check the **Actions** tab in your GitHub repository to see the pipeline running.

---

## 📊 Pipeline Status

You can check your pipeline status at:
https://github.com/Sujitsarkar16/AI_Lesson_Planner/actions

### Expected Workflow:
1. **✅ Build and Test** (runs first)
   - Installs dependencies
   - Checks TypeScript
   - Builds the app
   
2. **✅ Deploy to Vercel** (runs after build succeeds)
   - Only on `main` branch pushes
   - Deploys to production

---

## 🔧 Environment Variables

### Required for Deployment
Make sure these are set in your Vercel project:

```bash
# Auth0
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id
VITE_AUTH0_AUDIENCE=https://your-tenant.auth0.com/api/v2/

# Google Gemini
VITE_API_KEY=your_gemini_api_key
GEMINI_API_KEY=your_gemini_api_key

# Supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# App
VITE_APP_URL=https://your-app.vercel.app
VITE_ENVIRONMENT=production
```

Add these in:
1. Vercel Dashboard → Your Project → Settings → Environment Variables

---

## 🎯 Next Steps

1. **Add GitHub Secrets** (see above)
2. **Configure Vercel Environment Variables**
3. **Push code** to trigger first deployment
4. **Monitor** the Actions tab to see pipeline execution
5. **Access** your deployed app on Vercel

---

## 📁 Repository Structure

```
.github/
└── workflows/
    └── ci-cd.yml          # CI/CD pipeline configuration

.gitignore                 # Updated to exclude env files and docs

components/
├── ExportModal.tsx        # Updated - no Stripe dependencies
└── ...

utils/
├── databaseService.ts     # Supabase integration
├── pdfExport.ts          # PDF generation
├── docxExport.ts         # DOCX generation
└── ...
```

---

## ✨ Benefits of This Setup

✅ **Automated Testing** - Every commit is tested
✅ **Type Safety** - TypeScript errors caught early
✅ **Continuous Deployment** - Automatic production updates
✅ **Version Control** - Full git history
✅ **Collaboration Ready** - Easy for team development
✅ **Professional** - Industry-standard CI/CD practices

---

## 🆘 Troubleshooting

### Build Fails in GitHub Actions
- Check the Actions tab for detailed error logs
- Ensure all dependencies are in `package.json`
- Run `npm run build` locally first

### Deployment to Vercel Fails
- Verify GitHub secrets are set correctly
- Check Vercel dashboard for deployment logs
- Ensure environment variables are configured in Vercel

### TypeScript Errors
- Run `npx tsc --noEmit` locally
- Fix all type errors before pushing

---

## 📞 Support

For issues:
1. Check GitHub Actions logs
2. Review Vercel deployment logs
3. Ensure all secrets and env vars are set correctly

Your repository: https://github.com/Sujitsarkar16/AI_Lesson_Planner

Happy coding! 🚀
