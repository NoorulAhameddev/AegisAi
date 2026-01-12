# 🛡️ Aegis AI

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=for-the-badge&logo=openai&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

> **Production-Ready Enterprise AI Chat Platform**  
> Built with Next.js 15, OpenAI GPT-4o, RAG, and enterprise-grade security.

---

## 🚀 Overview

**Aegis AI** is a fully production-ready AI chat application that goes beyond simple wrappers. It implements a robust, secure, and scalable architecture designed for real-world usage with:

- 🧠 **Advanced AI** - GPT-4o with tool calling, RAG, and contextual memory
- 🔒 **Enterprise Security** - AES-256-GCM encryption, JWT auth, rate limiting
- ⚡ **High Performance** - Async job queue, Redis caching, optimized indexes
- 📊 **Admin Dashboard** - User management, usage metrics, system settings
- 🎨 **Modern UI** - Dark theme, glassmorphism, real-time streaming

---

## ✨ Key Features

### 🧠 **Intelligent AI Core**
- **GPT-4o Integration** - Latest OpenAI models for high-fidelity responses
- **Real-Time Streaming** - Zero-latency token streaming using Edge Runtime
- **Autonomous Web Search** - AI can browse the web for real-time information
- **RAG (Retrieval Augmented Generation)** - Vector store for contextual responses
- **Tool Calling** - Calculator, image generator, web search, web reader
- **Contextual Memory** - Remembers user facts and conversation history

### 🛡️ **Enterprise Security**
- **Bank-Grade Authentication** - JWT with access + refresh tokens, HTTP-only cookies
- **End-to-End Encryption** - AES-256-GCM for all sensitive data at rest
- **Role-Based Access Control (RBAC)** - Fine-grained permission matrix
- **Multi-Layer Input Validation** - Regex + AI-based intent classification
- **Output Leak Detection** - Prevents exposure of API keys and secrets
- **Session Management** - Token versioning for instant revocation
- **Rate Limiting** - Redis-based distributed rate limiting

### ⚙️ **Infrastructure & Scalability**
- **Asynchronous Architecture** - BullMQ job queue ensures 100% uptime
- **Worker Isolation** - AI processing runs in separate process
- **Database Optimization** - 13+ strategic indexes for performance
- **Graceful Degradation** - Fallback mechanisms for all external services
- **Docker Support** - Production-ready containerization
- **Health Checks** - API endpoint for monitoring

### 📊 **Admin & Analytics**
- **Admin Dashboard** - Comprehensive user and system management
- **Usage Tracking** - Per-user token usage for billing/quotas
- **Audit Logging** - Complete audit trail with metadata
- **Request Tracing** - End-to-end `requestId` propagation
- **System Settings** - Runtime configuration without code changes

---

## 🛠️ Technology Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| **Framework** | Next.js 16 (App Router) | React Server Components, Server Actions |
| **Language** | TypeScript 5 | Strict type safety across the stack |
| **Database** | PostgreSQL | Robust relational data storage |
| **ORM** | Prisma 5.17 | Type-safe queries, auto-migrations |
| **Styling** | Tailwind CSS 4 | Utility-first with modern design system |
| **AI** | OpenAI GPT-4o-mini | Chat completions, tool calling |
| **Vector Store** | LanceDB | RAG document storage |
| **Job Queue** | BullMQ | Async task processing with Redis |
| **Cache** | Redis (ioredis) | Rate limiting, caching |
| **Search** | GoogleThis / Cheerio | Web scraping and search |
| **Container** | Docker | Easy deployment |

---

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+
- Docker (optional, for local services)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/aegis-ai.git
cd aegis-ai
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Create a `.env` file in the root directory:

```bash
# App
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/aegis_db"

# Security (CRITICAL: Use strong random values)
JWT_ACCESS_SECRET="your-super-secret-access-key-min-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-chars"
ENCRYPTION_KEY="exactly_32_characters_required"  # MUST be 32 chars

# OpenAI
OPENAI_API_KEY="sk-..."

# Redis (Required for rate limiting and job queue)
REDIS_URL="redis://localhost:6379"

# Optional
QUEUE_NAME="chat-queue"  # Default is fine
```

⚠️ **CRITICAL**: `ENCRYPTION_KEY` must be **exactly 32 characters**. Generate with:
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 4. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Or create migration (recommended for production)
npx prisma migrate dev --name init
```

### 5. Run the Application

**Terminal 1: Next.js Server**
```bash
npm run dev
```

**Terminal 2: Background Worker**
```bash
npm run worker
```

Visit `http://localhost:3000` to start chatting!

---

## 📁 Project Structure

```bash
aegis-ai/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes (26 endpoints)
│   │   │   ├── auth/       # Authentication (login, register, refresh)
│   │   │   ├── chat/       # Chat operations (create, stream, history)
│   │   │   ├── files/      # File upload and processing
│   │   │   ├── admin/      # Admin dashboard APIs
│   │   │   └── user/       # User profile management
│   │   ├── chat/           # Chat interface
│   │   ├── dashboard/      # User dashboard
│   │   ├── admin/          # Admin panel
│   │   └── page.tsx        # Landing page
│   ├── lib/                # Core libraries (27 files)
│   │   ├── auth.ts         # JWT authentication
│   │   ├── encryption.ts   # AES-256-GCM encryption
│   │   ├── prisma.ts       # Database client
│   │   ├── queue.ts        # BullMQ job queue
│   │   ├── rate-limit.ts   # Redis rate limiting
│   │   ├── security.ts     # Input/output validation
│   │   └── vector-store.ts # RAG vector storage
│   ├── tools/              # AI tool implementations
│   │   ├── calculator.ts   # Math calculations
│   │   ├── image-generator.ts  # DALL-E integration
│   │   └── web-browser.ts  # Web search & scraping
│   └── workers/            # Background job processors
│       ├── ai.worker.ts    # Worker entry point
│       ├── processor.ts    # Chat job processing
│       └── cleanup.ts      # Periodic cleanup tasks
├── prisma/
│   └── schema.prisma       # Database schema (9 models)
├── public/                 # Static assets
├── mobile/                 # React Native mobile app
└── Configuration files
```

---

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens** - Separate access (10min) and refresh (7d) tokens
- **HTTP-Only Cookies** - Prevents XSS attacks
- **Token Versioning** - Instant session revocation ("nuclear option")
- **RBAC** - Role-based access control with permission matrix

### Data Protection
- **Encryption at Rest** - AES-256-GCM for all sensitive data
- **Secure Password Storage** - Bcrypt with cost factor 12
- **SQL Injection Prevention** - UUID validation, parameterized queries
- **XSS Protection** - Input sanitization, CSP headers

### Request Security
- **Rate Limiting** - Redis-based distributed rate limiting
- **Input Validation** - Multi-layer (regex + AI sentinel)
- **Output Validation** - Leak detection for secrets
- **CORS** - Configurable origin restrictions

### Infrastructure Security
- **Security Headers** - HSTS, CSP, X-Frame-Options, etc.
- **Environment Validation** - Strict checks on startup
- **Audit Logging** - Complete audit trail
- **Worker Isolation** - AI processing in separate process

---

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Chat
- `POST /api/chat/create` - Create new chat
- `POST /api/chat/stream` - Send message (queues AI job)
- `GET /api/chat/history?chatId=...` - Get chat messages
- `GET /api/chat/list` - Get user's chats
- `GET /api/chat/status?jobId=...` - Check job status

### Files
- `POST /api/files/upload` - Upload file
- `POST /api/files/ask` - Ask question about file
- `GET /api/files/list` - List user's files
- `DELETE /api/files/delete?id=...` - Delete file

### Admin (Requires ADMIN role)
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/[id]` - Get user details
- `PUT /api/admin/users/[id]/ban` - Ban/unban user
- `PUT /api/admin/users/[id]/role` - Change user role
- `GET /api/admin/metrics` - System metrics
- `GET /api/admin/activity` - Recent activity
- `GET /api/admin/settings` - System settings

### User
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/password` - Change password

### System
- `GET /api/health` - Health check
- `GET /api/ping` - Simple ping

---

## 🚀 Deployment

### Docker Deployment

```bash
# Build image
npm run docker:build

# Run with docker-compose
npm run docker:up

# Stop services
npm run docker:down
```

### Manual Deployment

1. **Build for production**
```bash
npm run build
```

2. **Run migrations**
```bash
npx prisma migrate deploy
```

3. **Start server**
```bash
npm start
```

4. **Start worker** (separate process)
```bash
npm run worker
```

### Environment Variables (Production)

Ensure these are set in production:
- `NODE_ENV="production"`
- `DATABASE_URL` - Production PostgreSQL URL
- `REDIS_URL` - Production Redis URL
- `JWT_ACCESS_SECRET` - Strong random value (min 32 chars)
- `JWT_REFRESH_SECRET` - Different strong random value
- `ENCRYPTION_KEY` - Exactly 32 random characters
- `OPENAI_API_KEY` - Your OpenAI API key

---

## 📚 Documentation

- **[DOCUMENTATION.md](./DOCUMENTATION.md)** - Technical documentation
- **[COMPLETE_ANALYSIS_AND_IMPROVEMENTS.md](./COMPLETE_ANALYSIS_AND_IMPROVEMENTS.md)** - Full system analysis
- **[SYSTEM_CHECK_REPORT.md](./SYSTEM_CHECK_REPORT.md)** - Latest system status
- **[IMPROVEMENTS_APPLIED.md](./IMPROVEMENTS_APPLIED.md)** - Change log

---

## 🧪 Testing

```bash
# Run linter
npm run lint

# View database in browser
npm run studio

# Check database status
npx prisma db pull
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 🙏 Acknowledgments

- **OpenAI** - GPT-4o API
- **Vercel** - Next.js framework
- **Prisma** - Database ORM
- **BullMQ** - Job queue system
- **LanceDB** - Vector database

---

## 📞 Support

For issues and questions:
- 📧 Email: noorulahamed07@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/aegis-ai/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-username/aegis-ai/discussions)

---

## 🎯 Roadmap

- [ ] Add integration tests
- [ ] Implement caching layer
- [ ] Add more AI tools (code execution, data analysis)
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Mobile app (React Native)
- [ ] Cloud file storage (S3/Cloudinary)
- [ ] Monitoring & observability (Sentry, DataDog)

---

**Built with ❤️ by [Noorul Ahemed](https://github.com/your-username)**

**Last Updated**: January 9, 2026
