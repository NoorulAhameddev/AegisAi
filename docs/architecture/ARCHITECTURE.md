# Architecture & Visual Overview

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  Web (Next.js React)    │    Mobile (Expo React Native)         │
│  - Chat Interface       │    - Chat UI                           │
│  - Admin Dashboard      │    - Settings                          │
│  - Knowledge Base       │    - Chat Management                   │
│  - File Management      │                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 NEXT.JS API LAYER (Backend)                      │
├─────────────────────────────────────────────────────────────────┤
│  src/app/api/                                                    │
│  ├── /chat          → Chat operations                           │
│  ├── /auth          → Authentication                            │
│  ├── /users         → User management                           │
│  ├── /admin         → Admin operations                          │
│  ├── /files         → File uploads/management                  │
│  └── /knowledge     → RAG/Knowledge base                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  BUSINESS LOGIC LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  src/services/              │  src/lib/                          │
│  ├── ChatService.ts         │  ├── Database queries              │
│  ├── AiService.ts           │  ├── Prisma operations             │
│  ├── RagService.ts          │  ├── Helpers                       │
│  ├── UserService.ts         │  └── Utilities                     │
│  └── FileService.ts         │                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│               DATA & EXTERNAL SERVICES LAYER                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ PostgreSQL   │  │ LanceDB RAG  │  │ OpenRouter   │           │
│  │ (Prisma ORM) │  │ (Vector DB)  │  │ (AI Models)  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Redis Cache  │  │ BullMQ Queue │  │ External API │           │
│  │              │  │ (Background) │  │ (Web Search) │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

## 🗂️ Detailed Folder Structure

```
Aegis-Ai/
│
├── 📱 FRONTEND
│   ├── src/
│   │   ├── app/                    ← Next.js Pages (App Router)
│   │   │   ├── admin/              → Admin dashboard pages
│   │   │   ├── chat/               → Chat interface pages
│   │   │   ├── dashboard/          → User dashboard
│   │   │   ├── files/              → File management pages
│   │   │   ├── knowledge/          → RAG/Knowledge pages
│   │   │   ├── login/              → Login page
│   │   │   ├── register/           → Registration page
│   │   │   ├── settings/           → Settings pages
│   │   │   ├── api/                → API routes
│   │   │   │   ├── auth/           → Authentication endpoints
│   │   │   │   ├── chat/           → Chat endpoints
│   │   │   │   ├── users/          → User endpoints
│   │   │   │   ├── admin/          → Admin endpoints
│   │   │   │   ├── files/          → File endpoints
│   │   │   │   └── knowledge/      → RAG endpoints
│   │   │   ├── layout.tsx          → Root layout
│   │   │   ├── page.tsx            → Home page
│   │   │   └── globals.css         → Global styles
│   │   │
│   │   ├── components/             ← React Components
│   │   │   ├── chat/               → Chat components
│   │   │   │   ├── ChatMessage.tsx
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   └── ChatWindow.tsx
│   │   │   ├── dashboard/          → Dashboard components
│   │   │   ├── layout/             → Layout components
│   │   │   ├── rag/                → RAG components
│   │   │   └── ui/                 → Reusable UI components
│   │   │
│   │   ├── lib/                    ← Utilities & Helpers
│   │   │   ├── db.ts               → Database client
│   │   │   ├── auth.ts             → Auth helpers
│   │   │   └── ...                 → Other utilities
│   │   │
│   │   ├── services/               ← Business Logic
│   │   │   ├── ChatService.ts
│   │   │   ├── AiService.ts
│   │   │   ├── RagService.ts
│   │   │   ├── UserService.ts
│   │   │   └── FileService.ts
│   │   │
│   │   ├── types/                  ← TypeScript Types
│   │   │   ├── Chat.ts
│   │   │   ├── User.ts
│   │   │   ├── Api.ts
│   │   │   └── ...
│   │   │
│   │   ├── hooks/                  ← React Hooks
│   │   │   ├── useChat.ts
│   │   │   ├── useUser.ts
│   │   │   ├── useAuth.ts
│   │   │   └── ...
│   │   │
│   │   ├── utils/                  ← Helper Functions
│   │   │   ├── formatters/
│   │   │   ├── validators/
│   │   │   └── helpers/
│   │   │
│   │   ├── workers/                ← Background Workers
│   │   │   └── ai.worker.ts
│   │   │
│   │   ├── tools/                  ← AI Tools
│   │   │   ├── calculator.ts
│   │   │   ├── imageGenerator.ts
│   │   │   ├── webSearch.ts
│   │   │   └── webReader.ts
│   │   │
│   │   ├── middleware.ts           → Auth middleware
│   │   └── __tests__/              → Tests
│   │       ├── api/
│   │       ├── components/
│   │       └── services/
│   │
│   └── public/                     ← Static Assets
│       ├── apple-icon.png
│       ├── icon.png
│       └── ...
│
├── 📱 MOBILE APP
│   └── mobile/
│       ├── app/                    ← Expo Router pages
│       ├── src/
│       │   ├── components/         → React Native components
│       │   ├── services/           → API services
│       │   ├── hooks/              → Custom hooks
│       │   ├── types/              → Type definitions
│       │   ├── utils/              → Utilities
│       │   └── context/            → React context
│       └── assets/                 → Images & media
│
├── 🗄️ DATABASE
│   └── prisma/
│       ├── schema.prisma           ← Data model
│       └── migrations/             ← Migration history
│           ├── 20251222082436_init/
│           ├── 20251224172359_phase2_conversations/
│           └── ...
│
├── ⚙️ SCRIPTS
│   └── scripts/
│       ├── setup/                  ← Setup scripts
│       │   ├── setup-admin.js
│       │   └── setup-role-accounts.ts
│       ├── diagnostics/            ← Debug scripts
│       │   ├── diagnose-ai.ts
│       │   ├── check-rag.ts
│       │   └── check-langchain.ts
│       ├── maintenance/            ← Maintenance scripts
│       │   ├── cleanup-sessions.ts
│       │   └── reset_admin_password.ts
│       └── testing/                ← Test scripts
│           ├── test-login-api.ts
│           ├── test-openai-key.ts
│           └── verify-login.ts
│
├── 📚 DOCUMENTATION
│   ├── docs/
│   │   ├── DOCUMENTATION.md        ← Full API docs
│   │   ├── IMPLEMENTATION_GUIDE.md ← Architecture details
│   │   ├── RAG_GUIDE.md            ← RAG documentation
│   │   ├── RAG_QUICKSTART.md       ← Quick RAG setup
│   │   ├── TEST_ACCOUNTS.md        ← Test credentials
│   │   ├── CHANGELOG.md            ← Version history
│   │   ├── admin/                  ← Admin documentation
│   │   └── archive/                ← Old documentation
│   ├── README.md                   ← Project overview
│   ├── PROJECT_STRUCTURE.md        ← Structure guide
│   ├── QUICK_REFERENCE.md          ← Navigation guide
│   ├── SETUP.md                    ← Setup guide
│   ├── CONTRIBUTING.md             ← Code standards
│   └── ORGANIZATION.md             ← Organization summary
│
├── ⚙️ CONFIGURATION
│   ├── config/                     ← Config files
│   ├── .env.local                  ← Environment variables
│   ├── next.config.js              ← Next.js config
│   ├── tsconfig.json               ← TypeScript config
│   ├── jest.config.ts              ← Jest config
│   ├── eslint.config.mjs           ← ESLint config
│   ├── postcss.config.mjs          ← PostCSS config
│   ├── docker-compose.yml          ← Docker config
│   ├── Dockerfile                  ← Docker image
│   ├── package.json                ← Dependencies
│   ├── .gitignore                  ← Git ignore
│   └── .github/                    ← GitHub config
│       └── workflows/              → CI/CD workflows
│
└── 💾 DATA & UPLOADS
    ├── data/
    │   └── lancedb/                ← RAG Vector DB
    └── uploads/                    ← User uploads
```

## 🔄 Data Flow

### Chat Request Flow
```
User Input (Web/Mobile)
        ↓
ChatService (src/services/)
        ↓
OpenRouter API (LLM)
        ↓
RAG/LanceDB (Vector search)
        ↓
Response Processing
        ↓
Store in PostgreSQL
        ↓
Stream to User
```

### Authentication Flow
```
User Login/Register
        ↓
JWT Token Generation
        ↓
Store in HTTP-only Cookie
        ↓
Middleware Validation
        ↓
Protected Routes
        ↓
API Access
```

### Background Job Flow
```
Job Queued (BullMQ)
        ↓
Worker Process (ai.worker.ts)
        ↓
Process (RAG, Search, etc)
        ↓
Store Result
        ↓
Notify Client
```

## 📊 Module Dependencies

```
UI Components (React)
    ↓ uses
Hooks (useChat, useUser)
    ↓ uses
Services (ChatService, UserService)
    ↓ calls
API Routes (src/app/api/)
    ↓ uses
lib/ (Database, Helpers)
    ↓ uses
Prisma Client
    ↓ connects to
PostgreSQL
```

## 🔐 Security Layers

```
┌────────────────────────────────┐
│  Input Validation Layer        │  Regex + Type checking
├────────────────────────────────┤
│  Authentication Layer          │  JWT + Refresh tokens
├────────────────────────────────┤
│  Authorization Layer (RBAC)    │  Role-based access control
├────────────────────────────────┤
│  Encryption Layer              │  AES-256-GCM at rest
├────────────────────────────────┤
│  Rate Limiting Layer           │  Redis-based limiting
├────────────────────────────────┤
│  Output Validation Layer       │  Prevent key leaks
└────────────────────────────────┘
```

## 🚀 Deployment Architecture

```
┌──────────────────────────────────────┐
│      Docker Container (Aegis AI)     │
├──────────────────────────────────────┤
│  ├── Next.js App (Port 3000)         │
│  ├── Worker Process                  │
│  └── Middleware                      │
├──────────────────────────────────────┤
│  External Services:                  │
│  ├── PostgreSQL (Database)           │
│  ├── Redis (Cache/Queue)             │
│  ├── OpenRouter (AI)                 │
│  └── LanceDB (Vector Store)          │
└──────────────────────────────────────┘
```

## 📈 Scaling Considerations

- **Horizontal**: Multiple app instances behind load balancer
- **Vertical**: Optimize database indexes, cache layer
- **Database**: Connection pooling, read replicas
- **Workers**: Separate worker instances for background jobs
- **Storage**: S3 for large file uploads
- **Cache**: Redis cluster for distributed caching
- **Search**: Separate LanceDB instances for vector operations

## 🎯 Performance Optimizations

1. **Database**: 13+ strategic indexes
2. **Caching**: Redis for frequent queries
3. **Async**: BullMQ job queue for long operations
4. **Streaming**: Real-time chat streaming
5. **Workers**: Isolated AI processing
6. **Compression**: Gzip compression for responses
7. **CDN**: Static assets via CDN

---

For more details, see:
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Detailed structure
- [docs/IMPLEMENTATION_GUIDE.md](./docs/IMPLEMENTATION_GUIDE.md) - Implementation details
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Code standards
