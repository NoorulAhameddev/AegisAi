# 🛡️ Aegis AI

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20_LTS-green?style=for-the-badge&logo=node.js&logoColor=white)
![OpenRouter](https://img.shields.io/badge/OpenRouter-GPT--4o-412991?style=for-the-badge&logo=openai&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7.0-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-75%2F75%20Passing-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Production-Hardened Enterprise AI Chat Platform**

[🚀 Quick Start](#-quick-start) • [📚 Documentation](#-documentation) • [🏗️ Architecture](#-architecture) • [🔒 Security](#-security) • [🧪 Testing](#-testing) • [🤝 Contributing](#-contributing)

> **📦 Monorepo Structure**: This platform is organized as an enterprise monorepo (`apps/web`, `apps/dashboard`, `apps/mobile`, `packages/`, `services/`, `scripts/`, `infra/`). See [MONOREPO_STRUCTURE.md](docs/architecture/MONOREPO_STRUCTURE.md) and [MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md) for details.

</div>

---

## ✨ What is Aegis AI?

**Aegis AI** is a fully production-ready, enterprise-grade AI chat platform built with modern technologies. It combines the power of Large Language Models (LLMs) with Retrieval-Augmented Generation (RAG), a reconciled dual-mode streaming architecture, atomic session concurrency controls, and comprehensive, verified perimeter security.

Whether you're building an internal knowledge base assistant, customer support platform, or high-throughput enterprise AI agent system, Aegis AI delivers production-grade reliability, security, and performance out of the box.

---

## 🌟 Key Features

### 🧠 Advanced AI & Streaming Architecture
- **Multi-Model Support** — Powered by OpenRouter with access to GPT-4o, Claude 3.5 Sonnet, and custom models.
- **Reconciled Dual-Mode Execution** — Direct low-latency Server-Sent Events (SSE) streaming (`/api/chat/stream-sse`) for interactive web users, alongside BullMQ distributed background queues for heavy ingestion, tools, and mobile clients.
- **Quota & Budget Enforcement** — Real-time token budgeting, plan usage limits, and rate limiting before inference.
- **Disconnect Resilience** — Automatic client abort signal detection with partial response persistence (`isPartial: true`).
- **Contextual Memory & RAG** — Vector store integration for contextual responses across documents, code, and web content.
- **Autonomous Tools** — Web browsing with socket-level SSRF guards, calculator, image generation, and document readers.

### 🔒 Enterprise-Grade Security
- **Atomic Refresh-Token Rotation** — Optimistic concurrency locking (`updateMany` with `replacedAt: null`) and a 5-second fingerprint-bound grace window to prevent session invalidation race conditions across browser tabs.
- **Deterministic Replay Detection** — Automatic revocation of entire session families upon stale token reuse, with immediate rejection of revoked or banned accounts.
- **Socket-Level SSRF Guard** — Pre-connect IP literal validation, custom HTTP/HTTPS agent `createConnection` overrides, IPv4/IPv6 private/cloud-metadata CIDR blocking, and 3-hop redirect inspection (`ssrf-guard.ts`).
- **Production Environment Lockdown** — Strict runtime validation permanently banning `SKIP_PROD_VALIDATION=1`, removing development fallback secrets, requiring 64-character entropy keys, and decoupling build-time static evaluation (`NEXT_PHASE === 'phase-production-build'`).
- **Cryptographic & Log Safety** — AES-256-GCM encryption at rest with key versioning, constant-time HMAC audit log verification with buffer-length guards, and 100% PII masking (`[REDACTED]`) in structured logs.
- **Genuinely Blocking CI/CD** — All fail-open statements (`continue-on-error: true`, `npm audit || true`) eliminated; blocking Gitleaks secret scanning and strict `audit-ci.json` dependency vulnerability policies enforced across all workflows.

### ⚡ High Performance & Reliability
- **Dual-Path Scalability** — Real-time interactive requests bypass queue bottlenecks; async pipelines manage bulk batch tasks with worker heartbeat leases.
- **Durable Database Fallback Queue** — Resilient PostgreSQL fallback queue (`FallbackQueue`) automatically captures jobs during Redis downtime.
- **Optimized Database Layer** — Strategic Prisma schema indexes, pgvector support, and cursor-based pagination.
- **Edge-Ready Middleware** — Edge Runtime compatible security middleware with strict CSRF protection and CSP headers.

### 📊 Admin Dashboard & Multi-Platform
- **Admin Management** — User administration, role-based access control (RBAC), and instantaneous user banning with immediate session eviction.
- **Audit Log Viewer** — Cryptographically verifiable audit trail with HMAC integrity checks.
- **Cross-Platform Support** — Full-featured React 19 web application and Expo-based mobile application (`apps/mobile`).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend (Web)** | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4 |
| **Dashboard** | Next.js 16 (Turbopack), React 19, Radix UI, Lucide Icons |
| **Mobile** | React Native, Expo SDK, TypeScript |
| **Backend API** | Next.js API Routes, Node.js 20 LTS, Edge Runtime Middleware |
| **Database & ORM** | PostgreSQL 16, Prisma ORM 5.22, pgvector |
| **Caching & Queues** | Redis 7, BullMQ, In-Memory Rate Limiting |
| **AI / Inference** | OpenRouter API, OpenAI Embeddings, GPT-4o |
| **Security & CI/CD** | Gitleaks, audit-ci, GitHub Actions, custom SSRF socket guard |
| **Testing** | Jest 29, React Testing Library, Monorepo Scoped Harness |

---

## 🚀 Quick Start

### 📋 Prerequisites
- **Node.js**: v20 LTS (verify with `node --version`)
- **npm**: v10+ (verify with `npm --version`)
- **PostgreSQL**: v14+ (local or managed instance)
- **Redis**: v6+ (local or managed instance)
- **OpenRouter API Key**: Obtain from [openrouter.ai](https://openrouter.ai)

### 1️⃣ Clone & Install

```bash
git clone https://github.com/NoorulAhameddev/AegisAi.git
cd AegisAi
npm install --legacy-peer-deps
```

### 2️⃣ Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database & Cache
DATABASE_URL="postgresql://postgres:password@localhost:5432/aegis_ai"
REDIS_URL="redis://localhost:6379"

# AI Provider
OPENROUTER_API_KEY="sk-or-v1-your-key-here"

# Authentication Secrets (generate 64-char keys for production)
JWT_ACCESS_SECRET="your-access-secret-minimum-32-chars-long-64-for-production"
JWT_REFRESH_SECRET="your-refresh-secret-minimum-32-chars-long-64-for-production"

# Encryption & Audit
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef"
AUDIT_SIGNING_KEY="your-audit-signing-key-minimum-32-chars-long-here"

# Application Settings
SITE_URL="http://localhost:3000"
APP_ENV="development"
NODE_ENV="development"
```

### 3️⃣ Initialize Database & Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Apply Database Migrations
npm run migrate

# (Optional) Launch Prisma Studio GUI
npm run studio
```

### 4️⃣ Start Development Services

```bash
# Terminal 1: Start Web Application (Next.js)
npm run dev

# Terminal 2: Start Background Worker (For Async Pipelines & RAG)
npm run worker
```

Open [http://localhost:3000](http://localhost:3000) to start chatting!

---

## 🧪 Testing & Verification

Aegis AI includes a comprehensive, verified automated regression and security test suite:

```bash
# Run Monorepo TypeScript Typecheck (0 errors across all workspaces)
npx tsc --noEmit

# Run Security & Concurrency Regression Suites (75/75 passing, 100% pass rate)
npm --workspace=@aegis-ai/web test

# Run Specific Workstream Test Suites
npm --workspace=@aegis-ai/web test -- src/__tests__/env.test.ts
npm --workspace=@aegis-ai/web test -- src/__tests__/auth-refresh.test.ts
npm --workspace=@aegis-ai/web test -- src/__tests__/chat-sse.test.ts
npm --workspace=@aegis-ai/web test -- src/__tests__/security-remediation.test.ts

# Execute Genuinely Blocking Dependency Security Audit
npm run audit:ci

# Build All Workspaces for Production
npm run build:all
```

### Verified Empirical Evidence

| Target | Command | Result | Status |
|---|---|---|---|
| **Type Safety** | `npx tsc --noEmit` | **0 errors** | 🟢 PASS |
| **Security Tests** | `npm --workspace=@aegis-ai/web test` | **75/75 passed** (100% in 7.6s) | 🟢 PASS |
| **CVE Audit Policy** | `npm run audit:ci` | **Passed security audit** | 🟢 PASS |
| **Production Builds** | `npm run build:all` | **Exit Code 0** (Web 88/88 static pages, Dashboard compiled) | 🟢 PASS |

---

## 🏗️ Architecture & Request Lifecycle

```text
Interactive Chat Request (Web)
        │
        ▼
POST /api/chat/stream-sse
        ├── 1. Authenticate JWT & Token Version
        ├── 2. Verify Client Quota & Token Budget
        ├── 3. Sanitize RAG Documents & Prompt Injection
        ├── 4. Direct Real-Time Streaming (OpenRouter / SSE)
        ├── 5. Handle Client Abort (AbortSignal)
        └── 6. Persist Message & Status (isPartial on disconnect)

Background / Async Pipeline (Mobile, Bulk Ingestion, Heavy Tools)
        │
        ▼
POST /api/chat/stream ──► BullMQ Job Queue (Redis) ──► Background Worker ──► DB Fallback
```

For the complete architectural specification, see [CHAT_EXECUTION_ARCHITECTURE.md](docs/architecture/CHAT_EXECUTION_ARCHITECTURE.md).

---

## 📁 Repository Structure

```text
AegisAi/
├── apps/
│   ├── web/                    # Main Next.js 16 Web Application & API routes
│   │   ├── src/__tests__/      # Security, Auth, Chat, and Env regression test suites
│   │   ├── src/app/api/        # Reconciled chat SSE, auth, files, and admin endpoints
│   │   ├── src/lib/            # SSRF guard, encryption, logger, rate-limiting, env validation
│   │   └── src/services/       # Atomic session rotation, RAG ingestion, billing
│   ├── dashboard/              # Next.js 16 Enterprise Admin Analytics Dashboard
│   └── mobile/                 # React Native / Expo Mobile Client Application
├── docs/                       # Architectural specifications, setup guides, and manuals
│   ├── architecture/           # System design & chat execution architecture deep dives
│   ├── reports/                # Historical task and transformation reports
│   └── setup/                  # Database setup guides & onboarding references
├── infra/                      # Docker Compose, AWS Terraform, and container manifests
├── prisma/                     # Database schema, PostgreSQL migrations, and client models
├── scripts/                    # Consolidated diagnostic, database, and maintenance utilities
│   ├── database/               # Database initialization and vector extensions
│   ├── dev/                    # Development verification and repair tools
│   └── testing/                # Manual endpoint diagnostic testers
└── audit-ci.json               # Blocking CI dependency vulnerability allowlist policy
```

---

## 📚 Documentation Index

- 📖 [**Getting Started Guide**](docs/setup/GETTING_STARTED.md) — Onboarding and environment setup.
- 🗄️ [**Database Setup Guide**](docs/setup/DATABASE_SETUP_GUIDE.md) — PostgreSQL, pgvector, and connection pool configuration.
- 🏗️ [**Chat Architecture Deep Dive**](docs/architecture/CHAT_EXECUTION_ARCHITECTURE.md) — Reconciled SSE vs BullMQ execution model.
- 🔒 [**Security Policy & Best Practices**](docs/SECURITY.md) — Enterprise security controls and reporting.
- 🚀 [**Production Deployment Guide**](docs/DEPLOYMENT_GUIDE.md) — Docker, Vercel, and self-hosted deployments.
- 🏆 [**Final Production Readiness Assessment**](.agents/teamwork/FINAL_PRODUCTION_READINESS_ASSESSMENT.md) — Independent auditor sign-off.
- 📊 [**Verification Evidence Report**](.agents/teamwork/VERIFICATION_RESULTS_AND_EVIDENCE.md) — Command outputs and empirical test runs.

---

## 🤝 Contributing

We welcome contributions! Please review [CONTRIBUTING.md](CONTRIBUTING.md) and adhere to:
- TypeScript strict typing (`npx tsc --noEmit` must pass with 0 errors).
- Authoring unit and regression tests for any modified logic.
- Preserving backwards-compatible Prisma database migrations.
- Running `npm run audit:ci` before submitting pull requests.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

<div align="center">

**Built with ❤️ for High-Reliability Enterprise AI**  
[GitHub Repository](https://github.com/NoorulAhameddev/AegisAi) • [Report Issues](https://github.com/NoorulAhameddev/AegisAi/issues)

</div>
