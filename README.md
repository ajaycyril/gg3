# 🚀 GadgetGuru - Production-Ready AI Gadget Recommender

[![CI/CD](https://github.com/yourusername/gadgetguru/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/yourusername/gadgetguru/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🔹 Overview

GadgetGuru is a production-ready GPT + RAG-powered AI gadget recommender that provides structured and unstructured product intelligence through an adaptive interface. It pulls from live sources like Amazon, Reddit, YouTube, and benchmark sites to deliver personalized recommendations.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js Web   │────│   Express API   │────│   Supabase DB   │
│   (Port 3000)   │    │   (Port 3002)   │    │   PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌─────────┐            ┌─────────┐            ┌─────────┐
    │ Vercel  │            │Railway/ │            │Supabase │
    │Deployment│            │ Fly.io  │            │Hosting  │
    └─────────┘            └─────────┘            └─────────┘
```

## ✅ Production Features

### 🔒 Security & Performance
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ Rate limiting (100 req/15min)
- ✅ Input validation (Joi)
- ✅ JWT authentication
- ✅ Row Level Security (RLS)
- ✅ Request compression
- ✅ Error monitoring (Sentry)

### 🧠 AI & Data
- ✅ OpenAI GPT-4 integration
- ✅ RAG (Retrieval-Augmented Generation)
- ✅ Vector embeddings (pgvector ready)
- ✅ Comprehensive database schema
- ✅ Real-time recommendations
- ✅ User preference learning

### 🔄 Development & Deployment
- ✅ TypeScript monorepo structure
- ✅ Shared type definitions
- ✅ Production logging (Winston)
- ✅ Health checks & monitoring
- ✅ CI/CD pipeline (GitHub Actions)
- ✅ Docker ready
- ✅ Environment configuration

## 🚦 Quick Start

### Prerequisites
- Node.js 20+
- pnpm 8+
- Supabase account
- OpenAI API key

### Installation

```bash
# Clone repository
git clone <repository-url>
cd gadgetguru

# Install dependencies
pnpm install

# Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

# Configure environment variables
# Edit apps/api/.env and apps/web/.env.local

# Setup database
pnpm db:push
pnpm db:seed

# Start development servers
pnpm dev  # Starts both API (3002) and Web (3000)
```

## 📁 Project Structure

```
├── apps/
│   ├── api/                    # Express.js API server
│   │   ├── src/
│   │   │   ├── routes/        # API endpoints
│   │   │   ├── middleware/    # Auth, validation, error handling
│   │   │   ├── utils/         # Logging, helpers
│   │   │   └── db/           # Database client
│   │   └── dist/             # Compiled output
│   └── web/                   # Next.js frontend
│       ├── app/              # App Router pages
│       ├── components/       # React components
│       └── styles/          # Tailwind CSS
├── packages/
│   └── shared/               # Shared types & utilities
├── supabase/
│   ├── migrations/          # Database schemas
│   └── seed.sql            # Sample data
├── .github/
│   └── workflows/          # CI/CD pipelines
└── scripts/                # Setup & deployment scripts
```

## 🔗 API Endpoints

### Public Endpoints
- `GET /health` - Health check
- `GET /api/gadgets` - List/search gadgets
- `GET /api/gadgets/:id` - Get gadget details
- `POST /api/auth/signin` - User authentication
- `POST /api/auth/magic-link` - Magic link auth

### Protected Endpoints (Requires Auth)
- `POST /api/recommendations` - Generate AI recommendations
- `GET /api/recommendations` - User's recommendations
- `GET /api/users/profile` - User profile
- `PUT /api/users/preferences` - Update preferences
- `POST /api/feedback` - Submit feedback

## 🗄️ Database Schema

### Core Tables
- `gadgets` - Product catalog
- `reviews` - User & expert reviews
- `users` - User profiles & preferences
- `recommendations` - AI-generated recommendations
- `feedback` - User feedback
- `specs_normalized` - Structured specifications
- `benchmarks` - Performance data
- `embeddings` - Vector store (pgvector)

## 🚀 Deployment

### API Server (Railway/Fly.io)
```bash
# Build API
pnpm --filter @gadgetguru/api build

# Deploy to Railway
railway login
railway link <project-id>
railway up
```

### Frontend (Vercel)
```bash
# Deploy to Vercel
vercel --prod
```

### Environment Variables

#### API Server
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
OPENAI_API_KEY=your_openai_key
SENTRY_DSN=your_sentry_dsn
```

#### Web App
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=your_api_url
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Type checking
pnpm type-check

# Linting
pnpm lint

# E2E tests
pnpm test:e2e
```

## 📊 Monitoring

- **Health Checks**: `/health` and `/health/detailed`
- **Error Tracking**: Sentry integration
- **Logs**: Winston with file rotation
- **Metrics**: Built-in performance monitoring

## 🔧 Development

### Adding New Features
1. Update shared types in `packages/shared/src/types.ts`
2. Add API endpoints in `apps/api/src/routes/`
3. Create frontend components in `apps/web/`
4. Update database schema in `supabase/migrations/`

### Code Quality
- ESLint + Prettier configuration
- Husky pre-commit hooks
- TypeScript strict mode
- Comprehensive error handling

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Supabase for database & auth
- Vercel for hosting
- Railway for API deployment

---

**Ready for Production** ✅ | **AI-Powered** 🧠 | **Scalable** 🚀
