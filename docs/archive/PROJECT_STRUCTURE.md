# Aegis AI - Project Structure

## 📁 Directory Organization

### Root Level

```
├── config/                 # Configuration files
├── src/                    # Main application code
├── mobile/                 # Mobile app (Expo)
├── prisma/                 # Database schema & migrations
├── scripts/                # Utility scripts (organized by purpose)
├── docs/                   # Documentation
├── public/                 # Static assets
├── uploads/                # User uploads
├── .github/                # GitHub configuration
└── [Config files]          # eslint, jest, next.config, etc.
```

### `/src` - Main Application

#### Core Folders

- **`/app`** - Next.js App Router pages & layouts
  - `admin/` - Admin dashboard pages
  - `api/` - API routes
  - `chat/` - Chat interface pages
  - `dashboard/` - User dashboard
  - `files/` - File management
  - `knowledge/` - Knowledge base/RAG
  - `login/` - Authentication
  - `register/` - User registration
  - `settings/` - User settings

- **`/components`** - React components
  - `chat/` - Chat-specific components
  - `dashboard/` - Dashboard components
  - `layout/` - Layout components
  - `rag/` - RAG-related components
  - `ui/` - Reusable UI components

- **`/services`** - Business logic & integrations
  - API clients
  - AI/ML integrations
  - Third-party service handlers

- **`/api`** - Backend API logic
  - Route handlers
  - Business logic
  - Database operations

- **`/lib`** - Utility libraries & helpers
  - Database queries
  - Helper functions
  - Common utilities

- **`/types`** - TypeScript type definitions
  - Global types
  - API schemas
  - Database models

- **`/utils`** - General utility functions
  - Formatters
  - Validators
  - String helpers

- **`/hooks`** - React custom hooks
  - useChat
  - useAuth
  - useUser

- **`/tools`** - AI tools & functions
  - Calculator
  - Image generator
  - Web search
  - Web reader

- **`/workers`** - Background workers
  - AI worker process
  - Job processing

- **`/__tests__`** - Test files
  - Unit tests
  - Integration tests
  - E2E tests

### `/scripts` - Organized Scripts

#### Categories

- **`/setup`** - Initial setup & configuration
  - `setup-admin.js`
  - `setup-role-accounts.ts`

- **`/diagnostics`** - Debugging & diagnostics
  - `check-langchain.ts`
  - `check-rag.ts`
  - `diagnose-ai.ts`
  - `simple-diagnostic.ts`

- **`/maintenance`** - Database & maintenance tasks
  - `cleanup-sessions.ts`
  - `reset_admin_password.ts`

- **`/testing`** - Test & verification scripts
  - `test-login-api.ts`
  - `test-openai-key.ts`
  - `verify-login.ts`
  - `security-test.js`

### `/docs` - Documentation

```
docs/
├── CHANGELOG.md
├── DOCUMENTATION.md
├── IMPLEMENTATION_GUIDE.md
├── RAG_GUIDE.md
├── RAG_IMPLEMENTATION.md
├── RAG_QUICKSTART.md
├── TEST_ACCOUNTS.md
├── admin/
│   ├── ADMIN_GUIDE.md
│   ├── ADMIN_IMPLEMENTATION.md
│   └── ADMIN_QUICKSTART.md
└── archive/
    └── Historical documentation
```

### `/mobile` - Expo Mobile App

```
mobile/
├── app/                 # Expo Router pages
├── src/
│   ├── components/
│   ├── config/
│   ├── context/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── utils/
└── assets/             # Images and media
```

### `/prisma` - Database

```
prisma/
├── schema.prisma       # Database schema
└── migrations/         # Migration files by phase
    ├── 20251222082436_init/
    ├── 20251224172359_phase2_conversations/
    ├── 20251227144440_phase4_memory/
    └── ...
```

### `/config` - Configuration Files

Store environment & configuration here:

- `.env` / `.env.local`
- Database configuration
- API configuration
- Feature flags

### `/public` - Static Assets

- Icons (apple-icon.png, icon.png)
- Favicon
- Images
- Static documents

## 🏗️ Architecture Overview

### Frontend (Next.js)

- App Router for pages
- React components
- Tailwind CSS styling
- Real-time chat UI

### Backend (Next.js API Routes)

- API endpoints
- Database operations (Prisma ORM)
- Authentication & authorization
- Business logic

### Database (PostgreSQL)

- 13+ strategic indexes
- Migrations for versioning
- Prisma ORM for queries

### AI/ML Pipeline

- OpenRouter integration
- RAG with LanceDB
- LangChain tools
- Background workers with BullMQ

### Security

- JWT authentication
- AES-256-GCM encryption
- RBAC system
- Input validation
- Rate limiting

## 📦 Key Dependencies

- **Framework**: Next.js 16.0
- **Language**: TypeScript 5.0
- **Database**: PostgreSQL 16 + Prisma ORM
- **UI**: React 19.2, Tailwind CSS 4.0
- **AI**: LangChain, OpenRouter, LanceDB
- **Backend**: Express patterns, BullMQ, Redis
- **Auth**: JWT, bcrypt
- **Testing**: Jest, ESLint

## 🚀 Development Workflow

1. **Clone repo** → Install dependencies
2. **Setup env** → Configure `.env.local`
3. **Database** → Run migrations
4. **Dev server** → `npm run dev`
5. **Mobile** → `expo start` in `/mobile`

## 📖 Key Documentation

- [DOCUMENTATION.md](./DOCUMENTATION.md) - Full API & feature docs
- [RAG_QUICKSTART.md](./RAG_QUICKSTART.md) - RAG setup & usage
- [admin/ADMIN_QUICKSTART.md](./admin/ADMIN_QUICKSTART.md) - Admin features
- [TEST_ACCOUNTS.md](./TEST_ACCOUNTS.md) - Test credentials

## 🔗 Related Files

- `package.json` - Dependencies & scripts
- `tsconfig.json` - TypeScript configuration
- `jest.config.ts` - Testing configuration
- `next.config.js` - Next.js configuration
- `docker-compose.yml` - Docker setup
- `prisma/schema.prisma` - Database schema
