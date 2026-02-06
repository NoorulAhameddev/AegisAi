# 🛡️ Aegis AI

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white)
![OpenRouter](https://img.shields.io/badge/OpenRouter-GPT--4o-412991?style=for-the-badge&logo=openai&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7.0-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Production-Ready Enterprise AI Chat Platform**

[🚀 Quick Start](#-quick-start) • [📚 Documentation](#-documentation) • [🏗️ Architecture](#-architecture) • [🔒 Security](#-security) • [🤝 Contributing](#-contributing)

</div>

---

## ✨ What is Aegis AI?

**Aegis AI** is a fully production-ready, enterprise-grade AI chat platform built with modern technologies. It combines the power of Large Language Models (LLMs) with Retrieval-Augmented Generation (RAG), worker-based async processing, and comprehensive security features.

Whether you're building an internal knowledge base chatbot, customer support system, or AI-powered enterprise application, Aegis AI provides everything you need out of the box.

---

## 🌟 Key Features

### 🧠 Advanced AI Capabilities
- **Multi-Model Support** - Powered by OpenRouter with access to GPT-4o, Claude, and more
- **RAG System** - Retrieve contextual information from uploaded documents and web content
- **Function Calling** - AI can execute tools like calculator, web search, image generation
- **Streaming Responses** - Real-time token streaming via Server-Sent Events (SSE)
- **Conversation Memory** - Context-aware responses with conversation history
- **Model Configuration** - Switch models, adjust temperature, and control token limits

### 🔒 Enterprise-Grade Security
- **AES-256-GCM Encryption** - All sensitive data encrypted at rest with key versioning
- **JWT Authentication** - Secure token-based auth with refresh token rotation
- **Rate Limiting** - Redis-backed distributed rate limiting to prevent abuse
- **Role-Based Access Control (RBAC)** - 5 roles with granular permission management
- **Audit Logging** - Complete audit trail of all system actions
- **Input Validation** - Multi-layer validation and sanitization
- **Security Headers** - HSTS, CSP, X-Frame-Options, and more

### ⚡ High Performance
- **Async Job Queue** - BullMQ-based background processing (chat doesn't block on AI)
- **Dual Database Indexing** - 13+ database indexes for query optimization
- **Redis Caching** - Rate limiting, sessions, and distributed cache
- **SSE Streaming** - Real-time responses without polling
- **Optimized Pagination** - Cursor-based pagination for large datasets

### 👨‍💼 Admin Dashboard
- **User Management** - Create, edit, ban, and monitor users
- **Usage Analytics** - Track AI requests, token usage, and response times
- **System Settings** - Configure model defaults, rate limits, and security policies
- **Audit Log Viewer** - Full audit trail with filtering and search
- **Database Management** - Prisma Studio integration for schema updates

### 🎨 Modern User Interface
- **Dark Theme** - Eye-friendly interface with glassmorphism design
- **Real-Time Chat** - Streaming responses with typing indicators
- **File Upload & RAG** - Upload documents and images for context retrieval
- **Responsive Design** - Mobile-friendly interface
- **Syntax Highlighting** - Code blocks with proper formatting
- **Export Conversations** - Save chats as PDF or Markdown

### 📱 Mobile Support
- **React Native App** - Expo-based mobile app with same features as web
- **Offline Support** - Messages cache locally while offline
- **Push Notifications** - Real-time notifications for important events
- **Biometric Auth** - Face/Touch ID authentication on mobile

---

## 🛠️ Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4 |
| **Backend** | Node.js, Express (via Next.js API routes), TypeScript |
| **Database** | PostgreSQL 16 with Prisma ORM, LanceDB for vectors |
| **AI/ML** | OpenRouter API, OpenAI Embeddings, LLMs (GPT-4o, Claude, etc) |
| **Message Queue** | BullMQ + Redis 7 for async job processing |
| **Caching** | Redis for rate limiting, sessions, cache |
| **Containerization** | Docker & Docker Compose |
| **Testing** | Jest, React Testing Library, Playwright |
| **Deployment** | Vercel (Web), EAS (Mobile), Docker (Self-hosted) |

---

## 🚀 Quick Start

### 📋 Prerequisites
- **Node.js** 18+ (verify with `node --version`)
- **PostgreSQL** 14+ (local or managed database)
- **Redis** 6+ (local or cloud Redis)
- **OpenRouter API Key** (get one at [openrouter.ai](https://openrouter.ai))

### 1️⃣ Clone Repository

```bash
git clone https://github.com/noorulahamed/aegis-ai.git
cd aegis-ai
npm install --legacy-peer-deps
```

### 2️⃣ Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/aegis_ai

# Redis
REDIS_URL=redis://localhost:6379

# AI/LLM
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Authentication (generate with: openssl rand -base64 32)
JWT_ACCESS_SECRET=your-secret-key-min-32-characters
JWT_REFRESH_SECRET=your-secret-key-min-32-characters

# Encryption (generate with: openssl rand -hex 16)
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef

# Application
SITE_URL=http://localhost:3000
NODE_ENV=development
```

### 3️⃣ Setup Database

```bash
# Create PostgreSQL database
createdb aegis_ai

# Run migrations
npm run migrate

# (Optional) Open Prisma Studio GUI
npm run studio
```

### 4️⃣ Start Development Servers

**Terminal 1 - Next.js Dev Server:**
```bash
npm run dev
```
Open http://localhost:3000

**Terminal 2 - AI Worker (Required for chat to work):**
```bash
npm run worker
```

> ⚠️ **Important**: The worker must be running alongside the dev server. Without it, chat requests will hang.

### ✅ Verify Setup

1. Open http://localhost:3000
2. Sign up or login
3. Try a chat message
4. If it works, you're good to go! 🎉

---

## 🐳 Docker Setup (Alternative)

### Quick Start with Docker Compose

```bash
# Build and start all services
npm run docker:up

# Run migrations
docker-compose exec app npm run migrate

# Open http://localhost:3000
```

### Services Included
- **PostgreSQL 16** - Database
- **Redis 7** - Cache & Queue
- **Aegis AI App** - Web application
- **AI Worker** - Background processor

### View Logs
```bash
docker-compose logs -f app
docker-compose logs -f worker
docker-compose logs -f postgres
```

### Stop Services
```bash
npm run docker:down
```

---

## 📚 Documentation

Comprehensive documentation for every aspect of the project:

| Document | Purpose |
|----------|---------|
| [**QUICKSTART.md**](./docs/QUICKSTART.md) | 5-minute setup guide (local & Docker) |
| [**IMPLEMENTATION_GUIDE.md**](./docs/IMPLEMENTATION_GUIDE.md) | Architecture, patterns, and API conventions |
| [**RAG_IMPLEMENTATION.md**](./docs/RAG_IMPLEMENTATION.md) | RAG system, embeddings, and retrieval |
| [**SECURITY.md**](./docs/SECURITY.md) | Security audit, encryption, and best practices |
| [**DEPLOYMENT_GUIDE.md**](./docs/DEPLOYMENT_GUIDE.md) | Production deployment (Vercel, Docker, VPS) |
| [**CONTRIBUTING.md**](./CONTRIBUTING.md) | How to contribute to the project |

---

## 🏗️ Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer (Browser)                    │
│              React Components + TypeScript                   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/SSE
┌─────────────────────────▼────────────────────────────────────┐
│                    Next.js API Routes                         │
│          (Validation, Auth, Job Enqueuing)                   │
└────────────────────────┬────────────────────────────────────┘
                         │ Enqueue Job
┌─────────────────────────▼────────────────────────────────────┐
│                    BullMQ Job Queue                           │
│                   (Redis Backend)                            │
└────────────────────────┬────────────────────────────────────┘
                         │ Process Job
┌─────────────────────────▼────────────────────────────────────┐
│                  AI Worker Process                            │
│          (LLM Calls, RAG, Function Execution)                │
└────────────────────────┬────────────────────────────────────┘
                         │ Return Result
┌─────────────────────────▼────────────────────────────────────┐
│                   PostgreSQL Database                         │
│          (Users, Conversations, RAG Documents)               │
└──────────────────────────────────────────────────────────────┘
```

**Key Pattern**: API routes never directly call LLMs. They enqueue jobs and return job IDs or establish SSE streams. The worker process handles all AI operations asynchronously.

### Project Structure

```
src/
├── app/                              # Next.js App Router
│   ├── api/
│   │   ├── chat/stream-sse/          # Real-time chat streaming
│   │   ├── auth/                     # Authentication endpoints
│   │   ├── rag/                      # RAG knowledge base
│   │   └── admin/                    # Admin operations
│   ├── (auth)/                       # Auth pages (login, signup)
│   ├── (chat)/                       # Chat pages
│   └── admin/                        # Admin dashboard
│
├── components/                       # React components
│   ├── chat/                         # Chat UI components
│   ├── admin/                        # Admin dashboard components
│   └── common/                       # Shared components
│
├── services/                         # Business logic
│   ├── auth/                         # Auth & session management
│   ├── rag/                          # RAG retrieval & embeddings
│   ├── files/                        # File processing
│   └── ingestion/                    # Document processing
│
├── workers/                          # Background job processors
│   ├── chat.worker.ts               # Main AI chat processor
│   └── rag.worker.ts                # RAG document processor
│
├── lib/                             # Shared utilities
│   ├── encryption.ts                # AES-256-GCM encryption
│   ├── response.ts                  # Standardized API responses
│   ├── session.ts                   # JWT & token management
│   ├── rbac.ts                      # Role-based access control
│   ├── logger.ts                    # Structured logging
│   └── prisma.ts                    # Prisma client
│
├── tools/                           # AI function tools
│   ├── calculator.ts                # Calculator tool
│   ├── web-search.ts                # Web search tool
│   └── image-generator.ts           # Image generation tool
│
└── __tests__/                       # Test suite (150+ tests)

prisma/
├── schema.prisma                   # Database schema (13+ indexes)
└── migrations/                     # Database migrations

docs/                               # Documentation
mobile/                             # React Native app (Expo)
```

---

## 🧠 Understanding Key Features

### RAG System (Retrieval-Augmented Generation)

Upload documents, images, or web content. The AI retrieves relevant context before responding:

```bash
# Supported file types
- PDF, DOCX, TXT (text extraction)
- PNG, JPG, JPEG (OCR via Tesseract)
- MP3 (transcription)
- PPTX (slide extraction)
```

**How it works:**
1. File uploaded → LanceDB vector store
2. Text extracted and chunked
3. OpenAI embeddings generated
4. Query matched against vectors
5. Top-K results returned to AI

### Worker-Based Architecture

Chat requests don't block on AI processing:

```
POST /api/chat/stream-sse
    ├─ Enqueue job to BullMQ
    ├─ Return SSE stream ID
    └─ Client subscribes to SSE
        │
        └─ Worker processes job
            ├─ Retrieve RAG context
            ├─ Call OpenRouter LLM
            ├─ Execute tools if needed
            └─ Stream response back
```

### Authentication & Authorization

- **JWT-based** with 10-min access tokens + 7-day refresh tokens
- **5 Roles**: Admin, Moderator, Team Lead, Member, Guest
- **Permissions**: Fine-grained per action (view, create, edit, delete, ban, etc)
- **Session Management**: Device tracking, token rotation, instant revocation

### Encryption

All sensitive data encrypted with **AES-256-GCM**:
- User messages
- API keys
- File content
- Conversation metadata

Format: `v1:iv:authTag:encrypted` (supports key rotation)

---

## 🚀 Development Workflows

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm test:watch

# Coverage report
npm test:coverage

# MCP integration tests
npm run test:mcp

# Edge function tests
npm run test:edge
```

Tests are in `src/__tests__/` with 150+ test cases covering:
- Authentication & authorization
- RAG retrieval
- Encryption/decryption
- API responses
- Database operations

### Adding New API Routes

1. Create route in `src/app/api/[feature]/route.ts`
2. Verify auth with `verifyAuth(req)`
3. Use standardized responses from `@/lib/response`
4. If AI processing needed, enqueue to BullMQ

```typescript
import { successResponse, errorResponse } from '@/lib/response';
import { verifyAuth } from '@/services/auth/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse();
    
    // Your logic here
    return successResponse({ data: result });
  } catch (error) {
    return errorResponse('Error message', { status: 500 });
  }
}
```

### Adding New AI Tools

1. Create tool in `src/tools/[tool-name].ts`
2. Define OpenAI function schema
3. Register in `src/tools/index.ts`
4. Worker automatically picks it up

```typescript
// src/tools/my-tool.ts
export const myTool = {
  type: 'function',
  function: {
    name: 'my_tool',
    description: 'Does something useful',
    parameters: {
      type: 'object',
      properties: {
        input: { type: 'string', description: 'Tool input' }
      },
      required: ['input']
    }
  }
};
```

### Database Migrations

```bash
# Create migration (after schema change)
npm run migrate

# Dry run deployment migration
npm run migrate:dry-run

# Deploy migration in production
npm run migrate:deploy
```

Always update `prisma/schema.prisma` first, then run migrate.

---

## 🔒 Security

### Implemented Features
✅ **Encryption**: AES-256-GCM with key versioning  
✅ **Authentication**: JWT with refresh tokens  
✅ **Rate Limiting**: Redis-backed, distributed safe  
✅ **RBAC**: 5 roles with granular permissions  
✅ **Input Validation**: Multi-layer validation  
✅ **Audit Logging**: All actions logged  
✅ **Security Headers**: HSTS, CSP, X-Frame-Options  
✅ **Session Management**: Device tracking, token rotation  

### Best Practices

```typescript
// ✅ Always verify auth in API routes
const user = await verifyAuth(req);
if (!user) return unauthorizedResponse();

// ✅ Use role-based checks
import { hasPermission, requirePermission } from '@/lib/rbac';
if (!hasPermission(user.role, 'user:ban')) {
  return forbiddenResponse();
}

// ✅ Encrypt sensitive data
import { encrypt, decrypt } from '@/lib/encryption';
const encrypted = encrypt(sensitiveData);
const plaintext = decrypt(encrypted);

// ✅ Use standardized error responses
return errorResponse('Error message', { status: 400 });
```

For detailed security information, see [SECURITY.md](./docs/SECURITY.md)

---

## 🌐 Deployment

### Vercel (Recommended for Web)
```bash
npm run build
npm run start
```

See [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) for:
- Environment variables setup
- Database connection
- Worker deployment on Vercel Functions
- Domain configuration

### Docker (Self-Hosted)
```bash
npm run docker:build
npm run docker:up
```

### Prerequisites for Production
- PostgreSQL managed database (AWS RDS, Google Cloud SQL)
- Redis (AWS ElastiCache, Upstash)
- OpenRouter API key
- Domain name
- SSL certificate (auto with Vercel)

---

## 🧪 Testing

The project includes 150+ tests covering:

```
src/__tests__/
├── auth/                    # Authentication tests
├── services/                # Service layer tests
├── lib/                     # Utility tests
├── api/                     # API route tests
└── workers/                 # Worker tests
```

Run all tests:
```bash
npm test

# Watch mode for development
npm test:watch

# Coverage report
npm test:coverage
```

---

## 🤝 Contributing

We welcome contributions! Please:

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md)
2. Follow code standards (TypeScript, ESLint, Prettier)
3. Write tests for new features
4. Update documentation
5. Submit pull request

### Development Setup
```bash
git clone https://github.com/noorulahamed/aegis-ai.git
cd aegis-ai
npm install --legacy-peer-deps
npm run migrate
npm run dev      # Terminal 1
npm run worker   # Terminal 2
```

---

## 📊 Admin Dashboard

Access the admin dashboard at `/admin` (admin role required):

- **Users** - Manage users, roles, and permissions
- **Usage** - View AI requests and token usage
- **Settings** - Configure system parameters
- **Audit Log** - View complete audit trail
- **System** - Database health and metrics

---

## 📞 Support

### Getting Help

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/noorulahamed/aegis-ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/noorulahamed/aegis-ai/discussions)

### Common Issues

**Chat not working?**
- Ensure worker is running: `npm run worker`
- Check Redis: `redis-cli ping`
- Verify OpenRouter API key

**Database errors?**
- Run migrations: `npm run migrate`
- Check `DATABASE_URL` in `.env.local`
- View logs: `npm run studio`

**Build fails?**
- Clear cache: `npm run clean`
- Reinstall: `rm -rf node_modules && npm install`
- Check Node version: `node --version` (should be 18+)

---

## 🗺️ Roadmap

Future features:

- [ ] GraphQL API support
- [ ] WebSocket real-time sync
- [ ] Advanced analytics dashboard
- [ ] Multi-tenant support
- [ ] Custom model fine-tuning
- [ ] Mobile PWA app
- [ ] Webhook integrations
- [ ] API rate limit tiers
- [ ] Plugin system

---

## 📝 License

This project is licensed under the **MIT License** - see [LICENSE](./LICENSE) file for details.

You are free to use, modify, and distribute this project for personal, commercial, or educational purposes.

---

## 🙏 Acknowledgments

This project stands on the shoulders of these amazing technologies:

- **[Next.js](https://nextjs.org/)** - React framework for production
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Prisma](https://www.prisma.io/)** - Modern database ORM
- **[PostgreSQL](https://www.postgresql.org/)** - Reliable relational database
- **[Redis](https://redis.io/)** - In-memory data store
- **[OpenRouter](https://openrouter.ai/)** - AI API with model variety
- **[BullMQ](https://docs.bullmq.io/)** - Job queue for Node.js
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS
- **[Tanstack Query](https://tanstack.com/query/)** - Data fetching library
- **[LanceDB](https://lancedb.com/)** - Vector database

---

## 👨‍💼 Author

**Noorul Ahemed**

- GitHub: [@noorulahamed](https://github.com/noorulahamed)
- Email: [contact@aegisai.com](mailto:contact@aegisai.com)

---

## ⭐ Show Your Support

If you find Aegis AI helpful, please give it a star! ⭐

```bash
# Clone and star the project
git clone https://github.com/noorulahamed/aegis-ai.git
```

---

<div align="center">

**Made with ❤️ by Noorul Ahemed**

[Website](https://aegisai.com) • [GitHub](https://github.com/noorulahamed/aegis-ai) • [Twitter](https://twitter.com/noorulahamed) • [Discord](https://discord.gg/aegis-ai)

</div>
