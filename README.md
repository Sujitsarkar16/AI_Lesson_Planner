# 🎓 AI Lesson Planner - Enterprise SaaS Platform

> **Production-ready AI-powered lesson planning platform with Stripe subscriptions, Supabase backend, and professional PDF/DOCX export.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Stripe](https://img.shields.io/badge/Stripe-Integrated-008CDD?logo=stripe)](https://stripe.com/)

## 🌟 Features

### ✨ Core Functionality
- **AI-Powered Generation**: Create lesson plans, syllabi, quizzes, exam papers, and study notes using Google Gemini AI
- **Professional Templates**: Multiple beautiful templates for each document type
- **Real-time Preview**: Live preview of generated content with markdown support
- **Smart Caching**: Client-side rate limiting and content caching

### 💳 Payment & Subscriptions
- **3-Tier Pricing**: Free (5 gen/month), Pro ($12/mo unlimited), School ($49/mo team features)
- **Stripe Integration**: Secure payment processing with automatic subscription management
- **Usage Tracking**: Real-time usage monitoring and limit enforcement
- **Webhook Automation**: Automatic subscription updates via Stripe webhooks

### 🗄️ Database & Backend
- **Supabase Backend**: PostgreSQL database with Row Level Security (RLS)
- **Cloud Storage**: All documents stored securely in the cloud
- **Multi-device Sync**: Access your documents from anywhere
- **Auto Migration**: Seamless migration from localStorage to database

### 📄 Export Capabilities
- **PDF Export**: Professional PDF generation with custom branding
- **DOCX Export**: Microsoft Word format (Pro/School only)
- **Batch Export**: Export multiple documents at once
- **Customization**: Add school logos, custom footers, and remove watermarks (Pro)

### 🔐 Security & Authentication
- **Auth0 Integration**: Enterprise-grade authentication
- **Social Login**: Sign in with Google
- **Encrypted Storage**: Sensitive data encryption at rest
- **CSRF Protection**: XSS and injection attack prevention
- **Rate Limiting**: API rate limiting to prevent abuse

### 📊 Analytics & Insights
- **Usage Dashboard**: Track generations and usage over time
- **Subscription Analytics**: Monitor plan usage and billing
- **Document Management**: Organize and search your documents

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Accounts: Auth0, Supabase, Stripe, Google AI Studio

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd ai-lesson-planner

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the app in action.

For detailed setup instructions, see [SETUP.md](./SETUP.md).

## 📖 Documentation

- **[Setup Guide](./SETUP.md)** - Complete installation and configuration
- **[Deployment Guide](./DEPLOYMENT.md)** - Deploy to Vercel
- **[Architecture](./docs/ARCHITECTURE.md)** - System design and database schema
- **[API Reference](./docs/API.md)** - API endpoints documentation

## 🏗️ Tech Stack

### Frontend
- **React 19** - Modern UI library with concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first CSS (via neobrutalism design)
- **React Router** - Client-side routing

### Backend & Services
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Stripe** - Payment processing and subscription management
- **Auth0** - Authentication and user management
- **Google Gemini AI** - Content generation

### Export & Documents
- **jsPDF** - PDF generation
- **docx** - Microsoft Word document creation
- **React Markdown** - Markdown rendering
- **Mermaid** - Diagram generation

### Deployment
- **Vercel** - Serverless deployment platform
- **Vercel Functions** - Serverless API endpoints

## 📁 Project Structure

```
ai-lesson-planner/
├── api/                      # Serverless API endpoints
│   └── stripe/              # Payment processing APIs
│       ├── create-checkout-session.ts
│       ├── webhook.ts
│       └── manage-subscription.ts
├── components/              # React components
│   ├── apps/               # Content generators
│   ├── ExportModal.tsx     # Document export interface
│   ├── UpgradeModal.tsx    # Subscription upgrade flow
│   └── ...
├── data/                    # Static data and templates
├── pages/                   # Page components
│   ├── BillingPage.tsx     # Subscription management
│   ├── DashboardPage.tsx   # Main dashboard
│   └── ...
├── supabase/               # Database
│   └── schema.sql          # Database schema
├── utils/                  # Utility functions
│   ├── databaseService.ts  # Database operations
│   ├── stripeClient.ts     # Stripe configuration
│   ├── supabaseClient.ts   # Supabase client
│   ├── pdfExport.ts        # PDF generation
│   ├── docxExport.ts       # DOCX generation
│   └── useSubscription.ts  # Subscription hook
├── .env.example            # Environment template
├── vercel.json             # Vercel configuration
├── SETUP.md               # Setup guide
└── DEPLOYMENT.md          # Deployment guide
```

## 💰 Pricing Plans

| Feature | Free | Pro ($12/mo) | School ($49/mo) |
|---------|------|--------------|-----------------|
| Generations | 5/month | Unlimited | Unlimited |
| Templates | Basic | All Premium | All Premium |
| PDF Export | ✅ (watermark) | ✅ | ✅ |
| DOCX Export | ❌ | ✅ | ✅ |
| Custom Branding | ❌ | ✅ | ✅ |
| Team Members | 1 | 1 | 10 |
| Collaboration | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ✅ | ✅ |
| Analytics | Basic | Advanced | Advanced |

## 🎯 Use Cases

### For Individual Teachers
- Generate lesson plans in minutes
- Create quizzes and study materials
- Export to PDF for printing
- Track teaching materials

### For Schools
- Team collaboration on lesson plans
- Shared template library
- Department-wide document management
- Analytics on curriculum coverage

### For EdTech Companies
- White-label solution
- API integration
- Custom branding
- Multi-tenant support

## 🔧 Configuration

### Environment Variables

Required for all environments:
```env
# Auth0
VITE_AUTH0_DOMAIN=
VITE_AUTH0_CLIENT_ID=
VITE_AUTH0_AUDIENCE=

# Google AI
VITE_API_KEY=
GEMINI_API_KEY=

# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
VITE_STRIPE_PRO_PRICE_ID=
VITE_STRIPE_SCHOOL_PRICE_ID=

# App
VITE_APP_URL=
VITE_ENVIRONMENT=
```

See [SETUP.md](./SETUP.md) for detailed configuration instructions.

## 🧪 Testing

### Test Subscription Flow

1. Use Stripe test mode
2. Test card: `4242 4242 4242 4242`
3. Any future expiry date
4. Any 3-digit CVC

### Test Features

```bash
# Run in development
npm run dev

# Test scenarios:
# 1. Free tier - usage limits
# 2. Pro upgrade - unlimited access
# 3. School upgrade - team features
# 4. Document export - PDF/DOCX
# 5. Subscription cancel
```

## 📈 Business Model

### Revenue Streams
1. **Monthly Subscriptions** - Recurring revenue from Pro/School plans
2. **Annual Plans** - Discounted yearly subscriptions (15% off)
3. **Enterprise Licenses** - Custom pricing for large organizations

### Target Market
- **Primary**: K-12 Teachers (3.2M in US)
- **Secondary**: Higher Education Professors
- **Tertiary**: Schools and Districts

### Growth Strategy
1. **Content Marketing** - Blog posts, YouTube tutorials
2. **Social Media** - Facebook groups for teachers
3. **Partnerships** - Teacher influencers, EdTech platforms
4. **Referral Program** - 20% recurring commission

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in dashboard
```

### Custom Deployment

The app can be deployed to any platform supporting:
- Node.js 18+
- Serverless functions
- Environment variables

See [DEPLOYMENT.md](./DEPLOYMENT.md) for platform-specific guides.

## 📊 Performance

- **Lighthouse Score**: 95+ on all metrics
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Bundle Size**: < 500KB (gzipped)

## 🔒 Security

- ✅ HTTPS everywhere
- ✅ XSS protection
- ✅ CSRF tokens
- ✅ SQL injection prevention
- ✅ Rate limiting
- ✅ Input sanitization
- ✅ Encrypted sensitive data
- ✅ Secure payment processing (PCI compliant via Stripe)

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

Built with ❤️ by [Your Name]

## 🙏 Acknowledgments

- Google Gemini API for AI capabilities
- Auth0 for authentication
- Stripe for payment processing
- Supabase for database infrastructure
- Vercel for hosting

## 📞 Support

- **Documentation**: See [SETUP.md](./SETUP.md) and [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/ai-lesson-planner/issues)
- **Email**: support@yourapp.com

## 🗺️ Roadmap

### Q1 2025
- [ ] Mobile app (React Native)
- [ ] Collaborative editing
- [ ] Version history
- [ ] Advanced analytics

### Q2 2025
- [ ] Integration with Google Classroom
- [ ] LMS integrations (Canvas, Moodle)
- [ ] Multi-language support
- [ ] Curriculum standards alignment

### Q3 2025
- [ ] AI-powered assessment generation
- [ ] Student portal
- [ ] Parent communication features
- [ ] Gradebook integration

---

**Made for teachers, by developers who care about education.** 🎓✨

If this project helps you, please ⭐ star the repository!
