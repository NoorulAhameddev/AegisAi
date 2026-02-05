# 🛡️ Aegis AI

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white)
![OpenRouter](https://img.shields.io/badge/OpenRouter-GPT--4o-412991?style=for-the-badge&logo=openai&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

> **Production-Ready Enterprise AI Chat Platform**  
> Built with Next.js 16, OpenRouter AI, RAG, and enterprise-grade security.

---

## 🚀 Quick Links

- **[Full Documentation](./docs/README.md)** - Complete guide with all features
- **[Setup Instructions](./docs/QUICKSTART.md)** - Get started in 5 minutes
- **[Architecture](./docs/IMPLEMENTATION_GUIDE.md)** - System design & patterns
- **[Security Guide](./docs/SECURITY.md)** - Security features & best practices
- **[API Documentation](./docs/RAG_IMPLEMENTATION.md)** - API reference & examples
- **[Contributing](./CONTRIBUTING.md)** - How to contribute to this project
- **[License](./LICENSE)** - MIT License

---

## ✨ Overview

**Aegis AI** is a fully production-ready AI chat application with:

- 🧠 **Advanced AI** - GPT-4o with tool calling, RAG, and contextual memory
- 🔒 **Enterprise Security** - AES-256-GCM encryption, JWT auth, rate limiting
- ⚡ **High Performance** - Async job queue, Redis caching, optimized indexes
- 📊 **Admin Dashboard** - User management, usage metrics, system settings
- 🎨 **Modern UI** - Dark theme, glassmorphism, real-time streaming

---

## 🛠️ Technology Stack

| Component | Technology |
|-----------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Database** | PostgreSQL 16 |
| **ORM** | Prisma 5.17 |
| **Styling** | Tailwind CSS 4 |
| **AI** | OpenAI GPT-4o-mini |
| **Vector Store** | LanceDB |
| **Job Queue** | BullMQ + Redis |
| **Container** | Docker |

---

## 🚦 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### 1. Clone & Setup

```bash
git clone https://github.com/your-username/aegis-ai.git
cd aegis-ai
npm install
```

### 2. Configure Environment

```bash
# Copy example environment variables
cp .env.example .env.local

# Edit .env.local with your configuration:
# - DATABASE_URL: PostgreSQL connection string
# - REDIS_URL: Redis connection URL
# - OPENROUTER_API_KEY: Your OpenRouter API key
# - JWT_ACCESS_SECRET & JWT_REFRESH_SECRET: Generate with `openssl rand -base64 32`
# - ENCRYPTION_KEY: Generate with `openssl rand -hex 16`
```

### 3. Initialize Database

```bash
npm run migrate
```

### 4. Start Development

```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Start AI worker (required for chat)
npm run worker
```

Access the app at **http://localhost:3000**

---

## 📚 Documentation

Comprehensive documentation is available in the [docs](./docs) directory:

- **[README.md](./docs/README.md)** - Full feature documentation
- **[QUICKSTART.md](./docs/QUICKSTART.md)** - Setup guide
- **[IMPLEMENTATION_GUIDE.md](./docs/IMPLEMENTATION_GUIDE.md)** - Architecture & patterns
- **[RAG_IMPLEMENTATION.md](./docs/RAG_IMPLEMENTATION.md)** - RAG system
- **[SECURITY.md](./docs/SECURITY.md)** - Security audit & features
- **[DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)** - Production deployment

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm test:watch

# Coverage report
npm test:coverage

# Test MCP integration
npm run test:mcp
```

---

## 🐳 Docker Support

```bash
# Build image
npm run docker:build

# Start with docker-compose
npm run docker:up

# Stop services
npm run docker:down
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Code of Conduct
- Development setup
- Pull request process
- Coding standards

---

## 📋 Project Structure

```
src/
├── app/api/              # API routes
├── components/           # React components
├── services/             # Business logic
├── workers/              # Background job processors
├── lib/                  # Shared utilities & encryption
├── tools/                # AI function tools
└── __tests__/            # Test suite

docs/                     # Complete documentation
mobile/                   # React Native/Expo app
prisma/                   # Database schema & migrations
scripts/                  # Utility scripts
```

---

## 🔒 Security

This project implements enterprise-grade security:

- **Encryption**: AES-256-GCM for sensitive data
- **Authentication**: JWT with refresh tokens
- **Rate Limiting**: Redis-based distributed rate limiting
- **RBAC**: Fine-grained role-based access control
- **Input Validation**: Multi-layer validation & sanitization
- **Audit Logging**: Complete audit trail

For details, see [SECURITY.md](./docs/SECURITY.md)

---

## 📊 Status & Monitoring

- **Health Check**: `GET /api/health`
- **Admin Dashboard**: `/admin` (requires admin role)
- **Database**: Prisma Studio with `npm run studio`

---

## 📝 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.

---

## 👨‍💻 Author

**Noorul Ahemed**  
- GitHub: [@noorulahamed](https://github.com/noorulahamed)

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - ORM
- [OpenRouter](https://openrouter.ai/) - AI API
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [BullMQ](https://docs.bullmq.io/) - Job queue

---

## 📞 Support

For issues, questions, or suggestions:
- Open an [Issue](https://github.com/noorulahamed/aegis-ai/issues)
- Check [Documentation](./docs)
- Review [FAQ](./docs/FAQ.md) (if available)

---

## 🗺️ Roadmap

- [ ] GraphQL API support
- [ ] WebSocket support for real-time chat
- [ ] Advanced analytics dashboard
- [ ] Multi-tenant support
- [ ] Custom model fine-tuning
- [ ] Mobile PWA support

---

**Made with ❤️ by Noorul Ahemed**
