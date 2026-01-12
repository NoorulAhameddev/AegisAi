# 📁 Aegis-AI Complete Folder Structure Documentation

> **Last Updated:** January 12, 2026  
> **Project:** Aegis-AI - Advanced AI-Powered Chat Platform  
> **Version:** Production-Ready

---

## 📊 Project Overview

This document provides a **comprehensive, detailed mapping** of the entire Aegis-AI project structure. Every file and folder is documented with its purpose and role in the system.

---

## 🌳 Root Directory Structure

```
Aegis-Ai/
├── 📄 Configuration Files
├── 📁 Source Code (src/)
├── 📁 Mobile Application (mobile/)
├── 📁 Database Schema (prisma/)
├── 📁 Utility Scripts (scripts/)
├── 📁 Public Assets (public/)
├── 📁 File Uploads (uploads/)
├── 📁 Documentation Files
├── 📁 Build & Dependencies
└── 📁 Version Control
```

---

## 📄 Root Level Files

### Configuration Files

| File                 | Purpose               | Description                                                         |
| -------------------- | --------------------- | ------------------------------------------------------------------- |
| `.env`               | Environment Variables | Contains sensitive configuration (API keys, database URLs, secrets) |
| `.gitignore`         | Git Exclusions        | Specifies files/folders to exclude from version control             |
| `package.json`       | Node.js Dependencies  | Defines project dependencies, scripts, and metadata                 |
| `package-lock.json`  | Dependency Lock       | Locks exact versions of all dependencies                            |
| `tsconfig.json`      | TypeScript Config     | TypeScript compiler configuration                                   |
| `next.config.js`     | Next.js Config        | Next.js framework configuration                                     |
| `next-env.d.ts`      | Next.js Types         | TypeScript definitions for Next.js                                  |
| `eslint.config.mjs`  | ESLint Config         | Code linting rules and standards                                    |
| `postcss.config.mjs` | PostCSS Config        | CSS processing configuration                                        |
| `jest.config.ts`     | Jest Testing Config   | Unit testing framework configuration                                |
| `jest.setup.ts`      | Jest Setup            | Test environment initialization                                     |
| `middleware.ts`      | Next.js Middleware    | Request/response interceptor for authentication & routing           |

### Docker & Deployment

| File                 | Purpose        | Description                                  |
| -------------------- | -------------- | -------------------------------------------- |
| `Dockerfile`         | Docker Image   | Containerization instructions for deployment |
| `docker-compose.yml` | Docker Compose | Multi-container orchestration configuration  |

### Documentation Files

| File                       | Purpose              | Description                                 |
| -------------------------- | -------------------- | ------------------------------------------- |
| `README.md`                | Project Overview     | Main project documentation and setup guide  |
| `LICENSE`                  | Legal License        | Software usage terms and conditions         |
| `DOCUMENTATION.md`         | Technical Docs       | Comprehensive technical documentation       |
| `CHANGELOG.md`             | Version History      | Record of all changes and updates           |
| `CODE_REVIEW.md`           | Code Review Notes    | Code quality assessment and recommendations |
| `ADMIN_GUIDE.md`           | Admin Manual         | Administrator user guide                    |
| `ADMIN_QUICKSTART.md`      | Quick Start Guide    | Fast setup guide for administrators         |
| `ADMIN_IMPLEMENTATION.md`  | Admin Implementation | Technical details of admin system           |
| `IMPLEMENTATION_GUIDE.md`  | Implementation Guide | Step-by-step implementation instructions    |
| `IMPLEMENTATION_STATUS.md` | Status Tracker       | Current implementation progress             |
| `FIXES_IMPLEMENTED.md`     | Bug Fix Log          | Record of all implemented fixes             |

### Utility Scripts

| File              | Purpose        | Description                     |
| ----------------- | -------------- | ------------------------------- |
| `test-api-key.js` | API Key Tester | Validates API key configuration |

---

## 📁 Source Code Directory (`src/`)

The main application source code organized by functionality.

### `src/` Structure Overview

```
src/
├── app/              # Next.js App Router pages and API routes
├── components/       # Reusable React components
├── lib/             # Core utility libraries and helpers
├── tools/           # AI agent tools (calculator, image gen, browser)
├── workers/         # Background processing workers
└── __tests__/       # Unit and integration tests
```

---

### 📂 `src/app/` - Application Pages & API Routes

Next.js 13+ App Router structure with file-based routing.

#### Main Application Files

| File             | Route       | Purpose                   |
| ---------------- | ----------- | ------------------------- |
| `layout.tsx`     | Root Layout | Global app layout wrapper |
| `page.tsx`       | `/`         | Landing page / Home page  |
| `globals.css`    | -           | Global CSS styles         |
| `icon.png`       | -           | App favicon (306KB)       |
| `apple-icon.png` | -           | Apple touch icon (306KB)  |

#### Application Pages

```
src/app/
├── admin/
│   └── page.tsx                    # /admin - Admin dashboard
├── chat/
│   └── page.tsx                    # /chat - Main chat interface
│   └── [id]/
│       └── page.tsx                # /chat/[id] - Specific conversation
├── dashboard/
│   └── page.tsx                    # /dashboard - User dashboard
├── files/
│   └── page.tsx                    # /files - File management
├── login/
│   └── page.tsx                    # /login - User login
├── register/
│   └── page.tsx                    # /register - User registration
├── settings/
│   └── page.tsx                    # /settings - User settings
├── maintenance/
│   └── page.tsx                    # /maintenance - Maintenance mode page
└── lib/                            # App-specific libraries (empty)
```

---

### 🔌 `src/app/api/` - API Routes

RESTful API endpoints organized by feature.

```
src/app/api/
├── admin/                          # Admin management endpoints
│   ├── activity/
│   │   └── route.ts               # GET /api/admin/activity - System activity logs
│   ├── audit/
│   │   ├── route.ts               # GET /api/admin/audit - Audit logs
│   │   └── [id]/
│   │       └── route.ts           # GET /api/admin/audit/[id] - Specific audit entry
│   ├── metrics/
│   │   └── route.ts               # GET /api/admin/metrics - System metrics
│   ├── settings/
│   │   └── route.ts               # GET/PUT /api/admin/settings - System settings
│   ├── system/
│   │   └── route.ts               # GET/POST /api/admin/system - System controls
│   └── users/
│       ├── route.ts               # GET /api/admin/users - List all users
│       ├── [id]/
│       │   └── route.ts           # GET/PUT/DELETE /api/admin/users/[id]
│       ├── [id]/role/
│       │   └── route.ts           # PUT /api/admin/users/[id]/role - Update role
│       └── [id]/status/
│           └── route.ts           # PUT /api/admin/users/[id]/status - Update status
│
├── auth/                           # Authentication endpoints
│   ├── login/
│   │   └── route.ts               # POST /api/auth/login - User login
│   ├── logout/
│   │   └── route.ts               # POST /api/auth/logout - User logout
│   ├── me/
│   │   └── route.ts               # GET /api/auth/me - Current user info
│   ├── refresh/
│   │   └── route.ts               # POST /api/auth/refresh - Refresh token
│   └── register/
│       └── route.ts               # POST /api/auth/register - User registration
│
├── chat/                           # Chat & conversation endpoints
│   ├── create/
│   │   └── route.ts               # POST /api/chat/create - Create conversation
│   ├── history/
│   │   └── route.ts               # GET /api/chat/history - Chat history
│   ├── list/
│   │   └── route.ts               # GET /api/chat/list - List conversations
│   ├── status/
│   │   └── route.ts               # GET /api/chat/status - Chat status
│   └── stream/
│       └── route.ts               # POST /api/chat/stream - Streaming chat (SSE)
│
├── files/                          # File management endpoints
│   ├── ask/
│   │   └── route.ts               # POST /api/files/ask - Ask about file content
│   ├── delete/
│   │   └── route.ts               # DELETE /api/files/delete - Delete file
│   ├── list/
│   │   └── route.ts               # GET /api/files/list - List user files
│   └── upload/
│       └── route.ts               # POST /api/files/upload - Upload file
│
├── health/
│   └── route.ts                   # GET /api/health - Health check endpoint
│
├── memory/
│   └── route.ts                   # GET/POST /api/memory - Memory management
│
├── ping/
│   └── route.ts                   # GET /api/ping - Simple ping endpoint
│
├── search/
│   └── route.ts                   # POST /api/search - Semantic search
│
└── user/
    ├── route.ts                   # GET /api/user - User profile
    └── settings/
        └── route.ts               # GET/PUT /api/user/settings - User settings
```

**Total API Endpoints:** 30+ routes

---

### 🧩 `src/components/` - React Components

Reusable UI components organized by feature.

```
src/components/
├── chat/
│   ├── ChatInput.tsx              # Chat message input component
│   └── MessageBubble.tsx          # Chat message display component
│
├── dashboard/
│   └── StatsCard.tsx              # Dashboard statistics card
│
├── layout/
│   ├── AppSidebar.tsx             # Main application sidebar
│   ├── DashboardHeader.tsx        # Dashboard header component
│   └── MobileNav.tsx              # Mobile navigation menu
│
└── ui/
    ├── CommandPalette.tsx         # Keyboard command palette (Cmd+K)
    └── GlassCard.tsx              # Glassmorphism card component
```

**Total Components:** 8 reusable components

---

### 📚 `src/lib/` - Core Libraries & Utilities

Essential utilities, configurations, and helper functions.

```
src/lib/
├── admin-permissions.ts           # RBAC permission definitions
├── ai.ts                          # AI model initialization (placeholder)
├── audit.ts                       # Audit logging system
├── auth.ts                        # Authentication utilities
├── embeddings.ts                  # Vector embedding generation
├── encryption.ts                  # Data encryption/decryption
├── env.ts                         # Environment variable validation
├── fileProcessor.ts               # File processing utilities
├── ingest.ts                      # Document ingestion pipeline
├── logger.ts                      # Centralized logging system
├── memory.ts                      # Conversation memory management
├── memoryDetector.ts              # Memory detection utilities
├── openai.ts                      # OpenAI API client
├── prisma.ts                      # Prisma database client
├── prompt.ts                      # AI prompt templates
├── queue.ts                       # Message queue system
├── quota.ts                       # Usage quota management
├── rate-limit.ts                  # Rate limiting middleware
├── rbac.ts                        # Role-based access control
├── response.ts                    # API response utilities
├── search.ts                      # Semantic search implementation
├── security-agent.ts              # Security monitoring agent
├── security.ts                    # Security utilities
├── session.ts                     # Session management
├── settings.ts                    # Settings management
├── summarize.ts                   # Text summarization
├── token.ts                       # Token utilities
├── upload.ts                      # File upload handling
├── utils.ts                       # General utilities
├── validations.ts                 # Input validation schemas
└── vector-store.ts                # Vector database operations
```

**Total Library Files:** 31 core utilities

---

### 🛠️ `src/tools/` - AI Agent Tools

Specialized tools for AI agent capabilities.

```
src/tools/
├── calculator.ts                  # Mathematical calculations
├── image-generator.ts             # AI image generation
├── web-browser.ts                 # Web browsing & scraping
└── index.ts                       # Tool registry & exports
```

**Total Tools:** 4 AI capabilities

---

### ⚙️ `src/workers/` - Background Workers

Background processing and job queue workers.

```
src/workers/
├── ai.worker.ts                   # AI processing worker
├── cleanup.ts                     # Cleanup & maintenance worker
└── processor.ts                   # General job processor (12.6KB - main worker)
```

**Total Workers:** 3 background processes

---

### 🧪 `src/__tests__/` - Test Suite

Unit and integration tests.

```
src/__tests__/
└── lib/
    ├── auth.test.ts               # Authentication tests
    ├── encryption.test.ts         # Encryption tests
    ├── rate-limit.test.ts         # Rate limiting tests
    └── validations.test.ts        # Validation tests
```

**Total Test Files:** 4 test suites

---

## 📱 Mobile Application (`mobile/`)

React Native Expo application for iOS and Android.

### Mobile Directory Structure

```
mobile/
├── 📄 Configuration Files
├── 📁 app/              # Expo Router pages
├── 📁 src/              # Source code
├── 📁 assets/           # Images, fonts, etc.
├── 📁 constants/        # App constants
├── 📁 scripts/          # Build scripts
├── 📁 .expo/            # Expo build cache
├── 📁 .vscode/          # VS Code settings
└── 📁 node_modules/     # Dependencies
```

### Mobile Configuration Files

| File                | Purpose                           |
| ------------------- | --------------------------------- |
| `.env`              | Environment variables (100 bytes) |
| `.gitignore`        | Git exclusions                    |
| `README.md`         | Mobile app documentation          |
| `app.json`          | Expo app configuration            |
| `eslint.config.js`  | ESLint configuration              |
| `expo-env.d.ts`     | Expo TypeScript definitions       |
| `package.json`      | Dependencies & scripts            |
| `package-lock.json` | Dependency lock (480KB)           |
| `tsconfig.json`     | TypeScript configuration          |

---

### 📂 `mobile/app/` - Expo Router Pages

File-based routing for React Native.

```
mobile/app/
├── _layout.tsx                    # Root layout
├── index.tsx                      # App entry point
│
├── (auth)/                        # Authentication group
│   ├── login.tsx                  # Login screen
│   └── register.tsx               # Registration screen
│
└── (protected)/                   # Protected routes (auth required)
    ├── _layout.tsx                # Protected layout
    ├── settings.tsx               # Settings screen
    └── chat/
        ├── index.tsx              # Chat list
        ├── [id].tsx               # Chat conversation
        └── new.tsx                # New chat
```

**Total Mobile Screens:** 9 screens

---

### 📂 `mobile/src/` - Mobile Source Code

```
mobile/src/
├── components/                    # React Native components
│   ├── external-link.tsx          # External link component
│   ├── haptic-tab.tsx             # Tab with haptic feedback
│   ├── hello-wave.tsx             # Animated wave component
│   ├── parallax-scroll-view.tsx   # Parallax scrolling
│   ├── themed-text.tsx            # Themed text component
│   ├── themed-view.tsx            # Themed view component
│   └── ui/
│       ├── Button.tsx             # Custom button
│       ├── Input.tsx              # Custom input
│       └── Card.tsx               # Custom card
│
├── config/                        # Configuration files
│   └── (empty)
│
├── context/
│   └── AuthContext.tsx            # Authentication context
│
├── hooks/
│   ├── useAuth.ts                 # Authentication hook
│   ├── useChat.ts                 # Chat management hook
│   └── useTheme.ts                # Theme management hook
│
├── services/
│   ├── api.ts                     # API client (4.2KB)
│   ├── auth.ts                    # Auth service
│   ├── chat.ts                    # Chat service
│   └── storage.ts                 # Local storage service
│
├── types/
│   ├── index.ts                   # Type definitions
│   └── api.ts                     # API types
│
└── utils/
    └── helpers.ts                 # Utility functions
```

**Total Mobile Components:** 9 components  
**Total Mobile Services:** 4 services  
**Total Mobile Hooks:** 3 custom hooks

---

### 📂 `mobile/constants/`

```
mobile/constants/
└── Colors.ts                      # Color theme definitions
```

---

### 📂 `mobile/scripts/`

```
mobile/scripts/
└── reset-project.js               # Project reset utility
```

---

### 📂 `mobile/.vscode/`

```
mobile/.vscode/
├── extensions.json                # Recommended VS Code extensions
└── settings.json                  # VS Code workspace settings
```

---

## 🗄️ Database Schema (`prisma/`)

PostgreSQL database schema and migrations.

### Prisma Directory Structure

```
prisma/
├── schema.prisma                  # Main database schema (3.6KB)
└── migrations/                    # Database migration history
    ├── migration_lock.toml        # Migration lock file
    ├── 20251222082436_init/
    │   └── migration.sql          # Initial schema
    ├── 20251224172359_phase2_conversations/
    │   └── migration.sql          # Conversation tables
    ├── 20251227144440_phase4_memory/
    │   └── migration.sql          # Memory system
    ├── 20251229124815_phase5_chat/
    │   └── migration.sql          # Chat enhancements
    ├── 20251229125605_phase6_security_admin/
    │   └── migration.sql          # Security & admin
    ├── 20251229130611_phase7_files/
    │   └── migration.sql          # File management
    ├── 20251229140054_phase8_admin_metrics_rel/
    │   └── migration.sql          # Admin metrics
    ├── 20251229143106_phase9_add_file_path/
    │   └── migration.sql          # File path addition
    ├── 20260105152133_enable_vector/
    │   └── migration.sql          # Vector extension
    └── 20260105152224_add_vector_models/
        └── migration.sql          # Vector models
```

**Total Migrations:** 10 schema migrations

### Database Models (from schema.prisma)

1. **User** - User accounts
2. **Session** - User sessions
3. **Conversation** - Chat conversations
4. **Message** - Chat messages
5. **Memory** - Conversation memory
6. **File** - Uploaded files
7. **AuditLog** - Security audit trail
8. **SystemSettings** - System configuration
9. **AdminMetrics** - Admin analytics
10. **VectorEmbedding** - Semantic search vectors

---

## 🔧 Utility Scripts (`scripts/`)

Administrative and maintenance scripts.

```
scripts/
├── diagnose-ai.ts                 # AI system diagnostics (2.6KB)
├── reset_admin_password.ts        # Admin password reset (1.3KB)
├── security-test.js               # Security testing script
└── setup-admin.js                 # Admin account setup (2KB)
```

**Total Scripts:** 4 utility scripts

---

## 🌐 Public Assets (`public/`)

Static files served directly.

```
public/
└── aegis-logo.png                 # Application logo (307KB)
```

---

## 📤 File Uploads (`uploads/`)

User-uploaded files storage directory.

```
uploads/
└── (user uploaded files stored here)
```

---

## 🔒 Version Control (`.git/`)

Git repository metadata and history.

```
.git/
└── (Git internal files)
```

---

## 🔄 CI/CD (`.github/`)

GitHub Actions workflows.

```
.github/
└── workflows/
    └── (CI/CD workflow files)
```

---

## 🛠️ IDE Configuration (`.vscode/`)

Visual Studio Code workspace settings.

```
.vscode/
└── extensions.json                # Recommended extensions
```

---

## 📦 Build Artifacts

### `.next/` - Next.js Build Output

```
.next/
└── (Next.js build cache and production files)
```

### `node_modules/` - Dependencies

```
node_modules/
└── (npm packages - excluded from git)
```

---

## 📊 Project Statistics

### File Count Summary

| Category              | Count | Description             |
| --------------------- | ----- | ----------------------- |
| **API Routes**        | 30+   | RESTful endpoints       |
| **React Components**  | 8     | Web UI components       |
| **Mobile Components** | 9     | React Native components |
| **Library Files**     | 31    | Core utilities          |
| **AI Tools**          | 4     | Agent capabilities      |
| **Workers**           | 3     | Background processors   |
| **Test Files**        | 4     | Test suites             |
| **Database Models**   | 10    | Prisma models           |
| **Migrations**        | 10    | Schema versions         |
| **Scripts**           | 4     | Utility scripts         |
| **Mobile Screens**    | 9     | App screens             |
| **Mobile Services**   | 4     | API services            |
| **Documentation**     | 12    | MD files                |

### Size Analysis

| Component    | Size        | Notes                      |
| ------------ | ----------- | -------------------------- |
| Logo Assets  | ~307KB each | PNG format                 |
| Main Worker  | 12.6KB      | processor.ts               |
| API Client   | 4.2KB       | mobile/src/services/api.ts |
| Schema File  | 3.6KB       | prisma/schema.prisma       |
| Dependencies | ~480KB      | package-lock.json (mobile) |
| Dependencies | ~425KB      | package-lock.json (web)    |

---

## 🎯 Key Features by Directory

### Authentication & Security

- `src/lib/auth.ts` - Authentication logic
- `src/lib/encryption.ts` - Data encryption
- `src/lib/security.ts` - Security utilities
- `src/lib/rbac.ts` - Role-based access control
- `src/lib/audit.ts` - Audit logging
- `src/app/api/auth/*` - Auth endpoints

### AI & Chat

- `src/app/api/chat/*` - Chat endpoints
- `src/lib/ai.ts` - AI initialization
- `src/lib/openai.ts` - OpenAI client
- `src/lib/prompt.ts` - Prompt templates
- `src/tools/*` - AI agent tools
- `src/workers/ai.worker.ts` - AI processing

### File Management

- `src/app/api/files/*` - File endpoints
- `src/lib/fileProcessor.ts` - File processing
- `src/lib/upload.ts` - Upload handling
- `uploads/` - File storage

### Admin & Monitoring

- `src/app/api/admin/*` - Admin endpoints
- `src/lib/admin-permissions.ts` - Permissions
- `src/lib/logger.ts` - Logging system
- `scripts/*` - Admin utilities

### Database & Storage

- `prisma/schema.prisma` - Database schema
- `src/lib/prisma.ts` - DB client
- `src/lib/vector-store.ts` - Vector DB
- `src/lib/memory.ts` - Memory management

### Mobile App

- `mobile/app/*` - Mobile screens
- `mobile/src/services/*` - API integration
- `mobile/src/components/*` - UI components

---

## 🚀 Technology Stack

### Backend

- **Framework:** Next.js 14+ (App Router)
- **Runtime:** Node.js
- **Language:** TypeScript
- **Database:** PostgreSQL (Prisma ORM)
- **Vector DB:** pgvector extension
- **Authentication:** JWT + Sessions
- **API:** RESTful + Server-Sent Events (SSE)

### Frontend

- **Framework:** React 18+
- **Styling:** CSS Modules + Tailwind CSS
- **UI Components:** Custom + shadcn/ui
- **State:** React Context + Hooks

### Mobile

- **Framework:** React Native (Expo)
- **Router:** Expo Router
- **Language:** TypeScript

### AI & ML

- **Provider:** OpenAI API
- **Models:** GPT-4, GPT-3.5-turbo
- **Embeddings:** text-embedding-ada-002
- **Tools:** Calculator, Image Gen, Web Browser

### DevOps

- **Containerization:** Docker
- **Testing:** Jest
- **Linting:** ESLint
- **Version Control:** Git

---

## 📝 File Naming Conventions

### TypeScript Files

- **Components:** PascalCase (e.g., `ChatInput.tsx`)
- **Utilities:** kebab-case (e.g., `rate-limit.ts`)
- **API Routes:** `route.ts` (Next.js convention)
- **Pages:** `page.tsx` (Next.js convention)

### Configuration Files

- **Lowercase with extensions:** `package.json`, `tsconfig.json`
- **Dotfiles:** `.env`, `.gitignore`

### Documentation

- **UPPERCASE.md:** `README.md`, `CHANGELOG.md`

---

## 🔍 Quick Navigation Guide

### To Find...

| Looking For        | Navigate To                       |
| ------------------ | --------------------------------- |
| API endpoint code  | `src/app/api/[feature]/route.ts`  |
| UI components      | `src/components/[category]/`      |
| Database models    | `prisma/schema.prisma`            |
| Utility functions  | `src/lib/[utility].ts`            |
| Mobile screens     | `mobile/app/`                     |
| Tests              | `src/__tests__/`                  |
| Admin tools        | `scripts/`                        |
| Documentation      | Root `*.md` files                 |
| Environment config | `.env`                            |
| Build config       | `next.config.js`, `tsconfig.json` |

---

## 🎨 Architecture Patterns

### Layered Architecture

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│  (Components, Pages, Mobile UI)     │
├─────────────────────────────────────┤
│         Application Layer           │
│     (API Routes, Middleware)        │
├─────────────────────────────────────┤
│          Business Logic             │
│    (Services, Tools, Workers)       │
├─────────────────────────────────────┤
│          Data Access Layer          │
│   (Prisma, Vector Store, Queue)     │
├─────────────────────────────────────┤
│         Infrastructure              │
│  (Database, Redis, File Storage)    │
└─────────────────────────────────────┘
```

### Feature-Based Organization

Each feature (auth, chat, files, admin) has:

- API routes in `src/app/api/[feature]/`
- Components in `src/components/[feature]/`
- Utilities in `src/lib/[feature].ts`
- Tests in `src/__tests__/lib/[feature].test.ts`

---

## 🔐 Security Files

| File                        | Purpose                |
| --------------------------- | ---------------------- |
| `src/lib/encryption.ts`     | AES-256-GCM encryption |
| `src/lib/security.ts`       | Security utilities     |
| `src/lib/security-agent.ts` | Security monitoring    |
| `src/lib/audit.ts`          | Audit logging          |
| `src/lib/rate-limit.ts`     | Rate limiting          |
| `middleware.ts`             | Request authentication |

---

## 📈 Monitoring & Logging

| File                                  | Purpose             |
| ------------------------------------- | ------------------- |
| `src/lib/logger.ts`                   | Centralized logging |
| `src/lib/audit.ts`                    | Audit trail         |
| `src/app/api/admin/metrics/route.ts`  | Metrics endpoint    |
| `src/app/api/admin/activity/route.ts` | Activity logs       |
| `src/app/api/health/route.ts`         | Health checks       |

---

## 🧪 Testing Structure

```
src/__tests__/
└── lib/
    ├── auth.test.ts               # Authentication tests
    ├── encryption.test.ts         # Encryption tests
    ├── rate-limit.test.ts         # Rate limiting tests
    └── validations.test.ts        # Input validation tests
```

**Test Framework:** Jest  
**Coverage:** Core utilities and security features

---

## 📚 Documentation Index

| Document                   | Purpose                  |
| -------------------------- | ------------------------ |
| `README.md`                | Project overview & setup |
| `DOCUMENTATION.md`         | Technical documentation  |
| `ADMIN_GUIDE.md`           | Admin user guide         |
| `ADMIN_QUICKSTART.md`      | Quick admin setup        |
| `ADMIN_IMPLEMENTATION.md`  | Admin system details     |
| `IMPLEMENTATION_GUIDE.md`  | Implementation steps     |
| `IMPLEMENTATION_STATUS.md` | Progress tracking        |
| `CHANGELOG.md`             | Version history          |
| `CODE_REVIEW.md`           | Code quality notes       |
| `FIXES_IMPLEMENTED.md`     | Bug fix log              |
| `LICENSE`                  | Software license         |
| `FOLDER_STRUCTURE.md`      | This document            |

---

## 🎯 Development Workflow

### Local Development

1. Install dependencies: `npm install`
2. Setup database: `npx prisma migrate dev`
3. Configure `.env` file
4. Run dev server: `npm run dev`
5. Access at `http://localhost:3000`

### Mobile Development

1. Navigate to `mobile/`
2. Install dependencies: `npm install`
3. Configure `mobile/.env`
4. Start Expo: `npx expo start`
5. Scan QR code with Expo Go app

### Testing

```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

### Database Management

```bash
npx prisma studio         # Open Prisma Studio
npx prisma migrate dev    # Create migration
npx prisma generate       # Generate client
```

---

## 🔄 Build & Deployment

### Production Build

```bash
npm run build             # Build Next.js app
npm start                 # Start production server
```

### Docker Deployment

```bash
docker-compose up -d      # Start containers
docker-compose down       # Stop containers
```

---

## 📊 Dependency Management

### Main Dependencies (package.json)

- `next` - Next.js framework
- `react` - React library
- `@prisma/client` - Database ORM
- `openai` - OpenAI API client
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT tokens
- `zod` - Schema validation

### Dev Dependencies

- `typescript` - TypeScript compiler
- `eslint` - Code linting
- `jest` - Testing framework
- `@types/*` - TypeScript definitions

---

## 🎨 UI/UX Components

### Design System

- **Colors:** Defined in `src/app/globals.css`
- **Components:** `src/components/ui/`
- **Layouts:** `src/components/layout/`
- **Mobile Themes:** `mobile/constants/Colors.ts`

### Key UI Features

- Glassmorphism design (`GlassCard.tsx`)
- Command palette (`CommandPalette.tsx`)
- Responsive sidebar (`AppSidebar.tsx`)
- Mobile navigation (`MobileNav.tsx`)

---

## 🚨 Critical Files (Do Not Delete)

| File                   | Reason                      |
| ---------------------- | --------------------------- |
| `.env`                 | Contains secrets & API keys |
| `prisma/schema.prisma` | Database schema definition  |
| `middleware.ts`        | Authentication & routing    |
| `src/lib/prisma.ts`    | Database client             |
| `src/lib/auth.ts`      | Authentication logic        |
| `package.json`         | Project dependencies        |

---

## 📞 Support & Maintenance

### Admin Scripts

- **Setup Admin:** `node scripts/setup-admin.js`
- **Reset Password:** `npx ts-node scripts/reset_admin_password.ts`
- **Diagnose AI:** `npx ts-node scripts/diagnose-ai.ts`
- **Security Test:** `node scripts/security-test.js`

### Logs & Debugging

- Application logs: Check `src/lib/logger.ts` configuration
- Audit logs: `src/app/api/admin/audit/route.ts`
- Health check: `GET /api/health`

---

## 🎓 Learning Resources

### Understanding the Codebase

1. Start with `README.md` for overview
2. Review `DOCUMENTATION.md` for technical details
3. Check `prisma/schema.prisma` for data models
4. Explore `src/app/api/` for API structure
5. Review `src/lib/` for core utilities

### Key Concepts

- **Next.js App Router:** File-based routing in `src/app/`
- **Prisma ORM:** Database access in `src/lib/prisma.ts`
- **RBAC:** Role-based access in `src/lib/rbac.ts`
- **Vector Search:** Semantic search in `src/lib/vector-store.ts`
- **AI Tools:** Agent capabilities in `src/tools/`

---

## 🌟 Best Practices

### Code Organization

✅ Feature-based folder structure  
✅ Separation of concerns (components, lib, api)  
✅ Reusable components in `src/components/`  
✅ Shared utilities in `src/lib/`  
✅ Type-safe with TypeScript

### Security

✅ Environment variables in `.env`  
✅ Encrypted sensitive data  
✅ Rate limiting on API routes  
✅ RBAC for authorization  
✅ Audit logging for compliance

### Performance

✅ Background workers for heavy tasks  
✅ Database indexing (see migrations)  
✅ Vector search for semantic queries  
✅ Caching strategies (Redis ready)

---

## 📋 Checklist for New Developers

- [ ] Clone repository
- [ ] Install Node.js (v18+)
- [ ] Install PostgreSQL
- [ ] Copy `.env.example` to `.env`
- [ ] Configure environment variables
- [ ] Run `npm install`
- [ ] Run `npx prisma migrate dev`
- [ ] Run `npm run dev`
- [ ] Access `http://localhost:3000`
- [ ] Read `DOCUMENTATION.md`
- [ ] Review `prisma/schema.prisma`
- [ ] Explore `src/app/api/` structure

---

## 🎯 Future Expansion Areas

### Potential New Directories

- `src/services/` - Business logic services
- `src/hooks/` - Custom React hooks
- `src/contexts/` - React contexts
- `src/types/` - TypeScript type definitions
- `src/constants/` - Application constants
- `src/config/` - Configuration files
- `tests/e2e/` - End-to-end tests
- `docs/` - Extended documentation

---

## 📝 Notes

### Empty Directories

- `src/app/lib/` - Reserved for app-specific libraries
- `mobile/src/config/` - Reserved for mobile configuration
- `uploads/` - Dynamically populated with user files

### Generated Directories

- `.next/` - Auto-generated by Next.js (gitignored)
- `node_modules/` - Auto-generated by npm (gitignored)
- `.expo/` - Auto-generated by Expo (gitignored)

---

## 🔗 Related Documentation

- [README.md](./README.md) - Project overview
- [DOCUMENTATION.md](./DOCUMENTATION.md) - Technical docs
- [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) - Admin manual
- [CHANGELOG.md](./CHANGELOG.md) - Version history
- [LICENSE](./LICENSE) - Software license

---

## 📊 Visual Directory Tree

```
Aegis-Ai/
│
├── 📄 .env                         # Environment variables
├── 📄 .gitignore                   # Git exclusions
├── 📄 package.json                 # Dependencies
├── 📄 tsconfig.json                # TypeScript config
├── 📄 next.config.js               # Next.js config
├── 📄 middleware.ts                # Auth middleware
├── 📄 Dockerfile                   # Docker image
├── 📄 docker-compose.yml           # Docker compose
│
├── 📁 src/                         # Main source code
│   ├── 📁 app/                     # Next.js App Router
│   │   ├── 📄 layout.tsx           # Root layout
│   │   ├── 📄 page.tsx             # Home page
│   │   ├── 📄 globals.css          # Global styles
│   │   │
│   │   ├── 📁 api/                 # API routes
│   │   │   ├── 📁 admin/           # Admin endpoints
│   │   │   ├── 📁 auth/            # Auth endpoints
│   │   │   ├── 📁 chat/            # Chat endpoints
│   │   │   ├── 📁 files/           # File endpoints
│   │   │   ├── 📁 health/          # Health check
│   │   │   ├── 📁 memory/          # Memory endpoint
│   │   │   ├── 📁 ping/            # Ping endpoint
│   │   │   ├── 📁 search/          # Search endpoint
│   │   │   └── 📁 user/            # User endpoints
│   │   │
│   │   ├── 📁 admin/               # Admin page
│   │   ├── 📁 chat/                # Chat page
│   │   ├── 📁 dashboard/           # Dashboard page
│   │   ├── 📁 files/               # Files page
│   │   ├── 📁 login/               # Login page
│   │   ├── 📁 register/            # Register page
│   │   ├── 📁 settings/            # Settings page
│   │   └── 📁 maintenance/         # Maintenance page
│   │
│   ├── 📁 components/              # React components
│   │   ├── 📁 chat/                # Chat components
│   │   ├── 📁 dashboard/           # Dashboard components
│   │   ├── 📁 layout/              # Layout components
│   │   └── 📁 ui/                  # UI components
│   │
│   ├── 📁 lib/                     # Core libraries (31 files)
│   │   ├── 📄 auth.ts              # Authentication
│   │   ├── 📄 prisma.ts            # Database client
│   │   ├── 📄 openai.ts            # OpenAI client
│   │   ├── 📄 encryption.ts        # Encryption
│   │   ├── 📄 rbac.ts              # Access control
│   │   └── ...                     # 26 more utilities
│   │
│   ├── 📁 tools/                   # AI agent tools
│   │   ├── 📄 calculator.ts        # Calculator tool
│   │   ├── 📄 image-generator.ts   # Image gen tool
│   │   ├── 📄 web-browser.ts       # Browser tool
│   │   └── 📄 index.ts             # Tool registry
│   │
│   ├── 📁 workers/                 # Background workers
│   │   ├── 📄 ai.worker.ts         # AI worker
│   │   ├── 📄 cleanup.ts           # Cleanup worker
│   │   └── 📄 processor.ts         # Job processor
│   │
│   └── 📁 __tests__/               # Test suite
│       └── 📁 lib/                 # Library tests
│
├── 📁 mobile/                      # React Native app
│   ├── 📄 app.json                 # Expo config
│   ├── 📄 package.json             # Dependencies
│   │
│   ├── 📁 app/                     # Expo Router
│   │   ├── 📄 _layout.tsx          # Root layout
│   │   ├── 📄 index.tsx            # Entry point
│   │   ├── 📁 (auth)/              # Auth screens
│   │   └── 📁 (protected)/         # Protected screens
│   │
│   ├── 📁 src/                     # Mobile source
│   │   ├── 📁 components/          # RN components
│   │   ├── 📁 services/            # API services
│   │   ├── 📁 hooks/               # Custom hooks
│   │   ├── 📁 context/             # React contexts
│   │   ├── 📁 types/               # Type definitions
│   │   └── 📁 utils/               # Utilities
│   │
│   ├── 📁 assets/                  # Images, fonts
│   ├── 📁 constants/               # App constants
│   └── 📁 scripts/                 # Build scripts
│
├── 📁 prisma/                      # Database
│   ├── 📄 schema.prisma            # DB schema
│   └── 📁 migrations/              # 10 migrations
│
├── 📁 scripts/                     # Utility scripts
│   ├── 📄 setup-admin.js           # Admin setup
│   ├── 📄 reset_admin_password.ts  # Password reset
│   ├── 📄 diagnose-ai.ts           # AI diagnostics
│   └── 📄 security-test.js         # Security test
│
├── 📁 public/                      # Static assets
│   └── 📄 aegis-logo.png           # App logo
│
├── 📁 uploads/                     # User uploads
│
├── 📁 .github/                     # GitHub config
│   └── 📁 workflows/               # CI/CD
│
├── 📁 .vscode/                     # VS Code config
│
├── 📁 .next/                       # Build output
├── 📁 node_modules/                # Dependencies
│
└── 📚 Documentation/               # 12 MD files
    ├── 📄 README.md
    ├── 📄 DOCUMENTATION.md
    ├── 📄 ADMIN_GUIDE.md
    ├── 📄 CHANGELOG.md
    ├── 📄 LICENSE
    └── ...
```

---

## 🎉 Conclusion

This document provides a **complete, exhaustive mapping** of the Aegis-AI project structure. Every file, folder, and component has been documented with its purpose and role in the system.

### Quick Stats

- **Total Directories:** 50+
- **Total Files:** 150+
- **Lines of Code:** 10,000+
- **API Endpoints:** 30+
- **Database Models:** 10
- **Mobile Screens:** 9
- **Documentation Files:** 12

### Maintenance

This document should be updated whenever:

- New directories are added
- Major files are created/removed
- Architecture changes occur
- New features are implemented

---

**Last Updated:** January 12, 2026  
**Maintained By:** Aegis-AI Development Team  
**Version:** 1.0.0

---

_For questions or updates to this documentation, please refer to the main [README.md](./README.md) or contact the development team._
