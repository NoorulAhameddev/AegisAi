# 📘 Aegis AI: Technical Documentation

**Version**: 1.0.0  
**Last Updated**: January 9, 2026, 19:51 IST  
**Status**: Production-Ready

Welcome to the comprehensive technical documentation for **Aegis AI**. This guide covers architecture, installation, configuration, API reference, security, and troubleshooting.

---

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [Installation & Setup](#installation--setup)
3. [Configuration](#configuration)
4. [Core Features](#core-features)
5. [API Reference](#api-reference)
6. [Security](#security)
7. [Database Schema](#database-schema)
8. [Worker System](#worker-system)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     USER BROWSER                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              NEXT.JS 16 (App Router)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Edge Middleware (middleware.ts)                     │   │
│  │  - JWT validation                                    │   │
│  │  - Route protection                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Routes (26 endpoints)                           │   │
│  │  - Authentication (5 routes)                         │   │
│  │  - Chat (5 routes)                                   │   │
│  │  - Files (4 routes)                                  │   │
│  │  - Admin (7 routes)                                  │   │
│  │  - User (2 routes)                                   │   │
│  │  - System (3 routes)                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  BULLMQ JOB QUEUE                            │
│                  (Redis-backed)                              │
│  - Async AI processing                                       │
│  - Retry with exponential backoff                            │
│  - Job deduplication                                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│               WORKER PROCESS                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  AI Processing Pipeline                              │   │
│  │  1. Security validation (Regex + AI Sentinel)        │   │
│  │  2. RAG retrieval (Vector search)                    │   │
│  │  3. OpenAI chat completion                           │   │
│  │  4. Tool execution (Search, Calculator, Images)      │   │
│  │  5. Output validation (Leak detection)               │   │
│  │  6. Encryption & storage                             │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                │
│  ┌─────────────────────┐  ┌─────────────────────────────┐   │
│  │   PostgreSQL        │  │      Redis                  │   │
│  │   (Prisma ORM)      │  │   - Job Queue               │   │
│  │   - 9 models        │  │   - Rate Limiting           │   │
│  │   - 13+ indexes     │  │   - Caching                 │   │
│  └─────────────────────┘  └─────────────────────────────┘   │
│  ┌─────────────────────┐  ┌─────────────────────────────┐   │
│  │   LanceDB           │  │   OpenAI API                │   │
│  │   (Vector Store)    │  │   - GPT-4o-mini             │   │
│  │   - RAG documents   │  │   - Tool calling            │   │
│  └─────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Next.js App Router** - Server-side rendering, API routes, streaming
2. **Edge Middleware** - Fast JWT validation before route handlers
3. **Prisma ORM** - Type-safe database access with auto-migrations
4. **BullMQ Worker** - Isolated AI processing in separate process
5. **Security Layers** - Multi-layer validation (regex, AI, output)
6. **Tool System** - Extensible AI tool calling framework
7. **RAG System** - Vector store for contextual responses

---

## ⚡ Installation & Setup

### Prerequisites

- **Node.js**: v18.17.0+ (LTS recommended)
- **PostgreSQL**: v14+
- **Redis**: v6+ (required for production)
- **Git**

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/your-org/aegis-ai.git
cd aegis-ai

# 2. Install dependencies
npm install

# 3. Configure environment (see Configuration section)
cp .env.example .env
# Edit .env with your values

# 4. Setup database
npx prisma generate
npx prisma db push

# 5. Start development servers
# Terminal 1:
npm run dev

# Terminal 2:
npm run worker
```

Visit `http://localhost:3000`

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# ============================================
# APP CONFIGURATION
# ============================================
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ============================================
# DATABASE (PostgreSQL)
# ============================================
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL="postgresql://postgres:password@localhost:5432/aegis_ai"

# ============================================
# SECURITY (CRITICAL)
# ============================================
# Generate with: openssl rand -hex 32
JWT_ACCESS_SECRET="your-super-secret-access-key-min-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-chars"

# MUST be exactly 32 characters for AES-256
# Generate with: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
ENCRYPTION_KEY="exactly_32_characters_required"

# ============================================
# AI SERVICES
# ============================================
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"  # or gpt-4o

# ============================================
# REDIS (Required for production)
# ============================================
REDIS_URL="redis://localhost:6379"

# ============================================
# OPTIONAL
# ============================================
QUEUE_NAME="chat-queue"  # Default is fine
```

### Critical Configuration Notes

⚠️ **ENCRYPTION_KEY**:

- MUST be exactly 32 characters
- Used for AES-256-GCM encryption
- Changing this will make old data unreadable
- Generate securely: `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`

⚠️ **JWT Secrets**:

- Use strong random values (min 32 characters)
- Never commit to version control
- Different for access and refresh tokens

⚠️ **DATABASE_URL**:

- PostgreSQL 14+ required
- Ensure database exists before running migrations
- Use connection pooling in production

---

## 🎯 Core Features

### 1. Autonomous Web Search

**Location**: `src/tools/web-browser.ts`

The AI can search the web and read web pages autonomously.

**How it works**:

1. User asks: "What's the latest news about AI?"
2. AI decides to use `search_web` tool
3. Worker executes Google search
4. Results injected into context
5. AI generates response with current information

**Tools**:

- `search_web(query)` - Google search
- `read_webpage(url)` - Fetch and parse webpage

### 2. RAG (Retrieval Augmented Generation)

**Location**: `src/lib/vector-store.ts`

Contextual responses using vector similarity search.

**How it works**:

1. User messages stored in LanceDB with embeddings
2. Before AI response, similar past messages retrieved
3. Relevant context injected into system prompt
4. AI generates contextually aware response

**Features**:

- Automatic embedding generation (OpenAI)
- Vector similarity search
- Per-user isolation (UUID validation)
- Configurable result limit

### 3. File Upload & Analysis

**Location**: `src/app/api/files/upload/route.ts`

Multimodal file processing with AI analysis.

**Supported formats**:

- **Images**: JPG, PNG, GIF (GPT-4o Vision)
- **Documents**: PDF, TXT (text extraction)
- **Future**: DOCX, XLSX, CSV

**How it works**:

1. File uploaded via FormData
2. Stored locally in `uploads/` directory
3. Metadata saved to database
4. Images: Base64 encoded for Vision API
5. Documents: Text extracted and indexed

### 4. Long-Term Memory

**Location**: `src/lib/memory.ts`

Persistent user facts and preferences.

**Types**:

- `USER_FACT` - Facts about the user
- `SUMMARY` - Conversation summaries

**How it works**:

1. AI extracts facts during conversation
2. Facts stored in Memory table
3. Retrieved before each response
4. Injected into system prompt

### 5. Admin Dashboard

**Location**: `/admin`

Comprehensive system management.

**Features**:

- User management (ban, role changes)
- Usage metrics (tokens, requests)
- System settings (runtime configuration)
- Activity logs (audit trail)
- Real-time statistics

---

## 🔌 API Reference

### Authentication Endpoints

#### POST `/api/auth/register`

Create new user account.

**Request**:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response**:

```json
{
  "message": "Registered & Logged in"
}
```

**Cookies Set**:

- `auth_access` - Access token (10min)
- `auth_refresh` - Refresh token (7d)

---

#### POST `/api/auth/login`

Authenticate existing user.

**Request**:

```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response**:

```json
{
  "message": "Logged in successfully"
}
```

---

#### POST `/api/auth/refresh`

Refresh access token using refresh token.

**Request**: No body (uses `auth_refresh` cookie)

**Response**:

```json
{
  "message": "Token refreshed"
}
```

**Cookies Updated**: `auth_access`

---

#### POST `/api/auth/logout`

Clear authentication cookies.

**Response**:

```json
{
  "message": "Logged out"
}
```

---

#### GET `/api/auth/me`

Get current user information.

**Response**:

```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "USER",
  "createdAt": "2026-01-09T00:00:00.000Z"
}
```

---

### Chat Endpoints

#### POST `/api/chat/create`

Create new chat session.

**Response**:

```json
{
  "chatId": "uuid"
}
```

---

#### POST `/api/chat/stream`

Send message and queue AI processing.

**Request**:

```json
{
  "chatId": "uuid",
  "message": "Hello, how are you?",
  "fileId": "uuid" // optional
}
```

**Response**:

```json
{
  "jobId": "uuid",
  "status": "queued",
  "message": "Request queued for processing"
}
```

---

#### GET `/api/chat/history?chatId=uuid`

Get chat message history.

**Response**:

```json
[
  {
    "id": "uuid",
    "role": "user",
    "content": "Hello, how are you?",
    "createdAt": "2026-01-09T00:00:00.000Z"
  },
  {
    "id": "uuid",
    "role": "assistant",
    "content": "I'm doing well, thank you!",
    "createdAt": "2026-01-09T00:00:05.000Z"
  }
]
```

---

#### GET `/api/chat/list`

Get user's chat list.

**Response**:

```json
[
  {
    "id": "uuid",
    "title": "Hello, how are you?",
    "createdAt": "2026-01-09T00:00:00.000Z"
  }
]
```

---

#### GET `/api/chat/status?jobId=uuid`

Check AI job processing status.

**Response**:

```json
{
  "status": "completed",
  "content": "I'm doing well, thank you!",
  "chatId": "uuid"
}
```

**Status values**: `queued`, `processing`, `completed`, `failed`

---

### File Endpoints

#### POST `/api/files/upload`

Upload file for analysis.

**Request**: `multipart/form-data`

- `file`: File object

**Response**:

```json
{
  "id": "uuid",
  "name": "document.pdf",
  "type": "application/pdf",
  "size": 102400
}
```

---

### Admin Endpoints (Requires ADMIN role)

#### GET `/api/admin/users`

List all users.

**Response**:

```json
[
  {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "isBanned": false,
    "createdAt": "2026-01-09T00:00:00.000Z"
  }
]
```

---

#### GET `/api/admin/metrics`

Get system metrics.

**Response**:

```json
{
  "totalUsers": 150,
  "totalChats": 1250,
  "totalMessages": 15000,
  "tokensUsed": 5000000,
  "activeUsers": 45
}
```

---

## 🔒 Security

### Authentication & Authorization

**JWT Token System**:

- **Access Token**: Short-lived (10min), used for API requests
- **Refresh Token**: Long-lived (7d), used to get new access tokens
- **HTTP-Only Cookies**: Prevents XSS attacks
- **Token Versioning**: Instant session revocation

**RBAC (Role-Based Access Control)**:

- `USER` - Standard user permissions
- `ADMIN` - Full system access

### Data Protection

**Encryption**:

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Scope**: All chat messages, sensitive user data
- **Key Management**: Environment variable, strict validation

**Password Security**:

- **Algorithm**: Bcrypt
- **Cost Factor**: 12 (2^12 iterations)
- **Salt**: Automatic per-password

### Input Validation

**Multi-Layer Approach**:

1. **Regex Validation** - Basic pattern matching
2. **AI Sentinel** - Intent classification
3. **Length Limits** - Prevent DoS
4. **Type Validation** - Zod schemas

**Blocked Patterns**:

- Jailbreak attempts
- System override commands
- Malicious prompts

### Output Validation

**Leak Detection**:

- API keys (OpenAI, etc.)
- JWT tokens
- Private keys
- Sensitive patterns

**Action**: Redact and log if detected

### Rate Limiting

**Implementation**: Redis-based distributed rate limiting

**Limits**:

- Global: 100 requests/minute
- Chat: 20 requests/minute
- Configurable per-endpoint

---

## 🗄️ Database Schema

### Models

**User** (9 fields, 1 index)

- Auto-generated UUID
- Email uniqueness constraint
- Role enum (USER, ADMIN)
- Token versioning for revocation

**Chat** (5 fields, 1 index)

- Auto-generated UUID
- Title field for display
- Cascade delete on user deletion
- Updated timestamp

**Message** (5 fields, 2 indexes)

- Auto-generated UUID
- Role enum (USER, ASSISTANT, SYSTEM)
- Encrypted content
- Indexed by chatId + createdAt

**Session** (8 fields, 3 indexes)

- Auto-generated UUID
- Hashed refresh token
- Expiration tracking
- User agent & IP logging

**Memory** (6 fields, 2 indexes)

- Auto-generated UUID
- Type enum (USER_FACT, SUMMARY)
- Vector search ready
- Per-user isolation

**File** (7 fields, 1 index)

- Auto-generated UUID
- Type and path storage
- Content for text files
- Indexed by userId + createdAt

**UsageMetric** (5 fields, 1 index)

- Auto-generated UUID
- Token counting
- Model tracking
- Billing/quota support

**AuditLog** (5 fields, 2 indexes)

- Auto-generated UUID
- Action tracking
- JSON metadata
- Indexed by userId + action

**SystemSetting** (3 fields)

- Key-value store
- Runtime configuration
- Updated timestamp

---

## ⚙️ Worker System

### Architecture

**Separation of Concerns**:

- **API**: Fast request handling, job queuing
- **Worker**: Heavy AI processing, tool execution

**Benefits**:

- API never blocks on AI requests
- Worker can be scaled independently
- Retry logic for failed jobs
- Job deduplication

### Job Processing Flow

1. User sends message → API
2. Message encrypted and saved to DB
3. Job queued to BullMQ (Redis)
4. Worker picks up job
5. Security validation
6. RAG retrieval
7. OpenAI API call
8. Tool execution (if needed)
9. Output validation
10. Response encrypted and saved
11. Job marked complete

### Worker Files

- `ai.worker.ts` - Entry point, worker initialization
- `processor.ts` - Main job processing logic
- `cleanup.ts` - Periodic cleanup tasks

---

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV="production"`
- [ ] Use strong random secrets (JWT, encryption)
- [ ] Configure production DATABASE_URL
- [ ] Configure production REDIS_URL
- [ ] Set up SSL/TLS certificates
- [ ] Configure CORS origins
- [ ] Enable monitoring/logging
- [ ] Set up backup strategy
- [ ] Configure auto-scaling
- [ ] Test disaster recovery

### Docker Deployment

```bash
# Build image
docker build -t aegis-ai .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Manual Deployment

```bash
# 1. Build
npm run build

# 2. Run migrations
npx prisma migrate deploy

# 3. Start server (Terminal 1)
npm start

# 4. Start worker (Terminal 2)
npm run worker
```

---

## 🐛 Troubleshooting

### Common Issues

**"Prisma Client not initialized"**

```bash
npx prisma generate
```

**"Database connection failed"**

- Check DATABASE_URL format
- Ensure PostgreSQL is running
- Verify network connectivity

**"ENCRYPTION_KEY must be exactly 32 characters"**

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

**"Chat history shows encrypted text"**

- Server not restarted after fixes
- Decryption code not applied
- Check `src/app/api/chat/history/route.ts`

**"Jobs timeout after 120 seconds"**

- Worker not running
- Redis connection failed
- Check worker logs

**"Rate limit exceeded"**

- Too many requests
- Adjust limits in `src/lib/rate-limit.ts`
- Check Redis connection

---

## 📞 Support

For technical support:

- 📧 Email: support@aegis-ai.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/aegis-ai/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-org/aegis-ai/discussions)
- 📚 Docs: [Full Documentation](./DOCUMENTATION.md)

---

**Maintained by the Aegis AI Team**  
**Last Updated**: January 9, 2026
