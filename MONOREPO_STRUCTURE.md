# Aegis AI - Monorepo Structure

This repository has been restructured as a monorepo for better scalability and organization.

## 📁 Directory Structure

```
/
├── apps/                # Application entrypoints
│   ├── web/            # Next.js web application
│   └── mobile/         # React Native mobile app (Expo)
│
├── packages/           # Shared libraries and modules
│   ├── shared/         # Shared utilities and types
│   └── ui/             # Shared UI components
│
├── services/           # Microservices and background workers
│   ├── api/            # API server (if separated)
│   ├── worker/         # Chat worker
│   └── rag-worker/     # RAG worker
│
├── infra/              # Infrastructure as code
│   ├── docker/         # Docker configurations
│   │   ├── Dockerfile
│   │   └── docker-compose.yml
│   ├── scripts/        # DevOps and utility scripts
│   └── vercel.json     # Vercel deployment config
│
├── config/             # Centralized configuration
│   ├── tsconfig.json   # Base TypeScript config
│   ├── eslint.config.mjs
│   ├── jest.config.ts
│   ├── jest.setup.ts
│   ├── prisma.config.ts
│   └── mcp-servers.json
│
├── docs/               # Documentation
├── prisma/             # Database schema and migrations
├── uploads/            # User-uploaded files (runtime only)
├── data/               # Vector DB and external data stores
├── .github/            # GitHub workflows and templates
└── .vscode/            # VS Code workspace settings
```

## 🚀 Getting Started

### Installation

```bash
# Install all workspace dependencies
npm install

# Install dependencies for specific workspace
npm install --workspace=apps/web
```

### Development

```bash
# Start web app
npm run dev

# Start mobile app
npm run dev:mobile

# Start workers
npm run worker          # Chat worker
npm run worker:rag      # RAG worker
```

### Building

```bash
# Build web app only
npm run build

# Build all workspaces
npm run build:all
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Test coverage
npm run test:coverage
```

## 📦 Workspace Structure

### Apps

Each application in `apps/` is an independently deployable unit:

- **web**: Next.js 16 web application with App Router
- **mobile**: React Native mobile app with Expo

### Packages

Shared code that can be used across apps and services:

- **shared**: Common utilities, types, and business logic
- **ui**: Reusable React components

### Services

Background services and workers:

- **worker**: Chat processing worker (BullMQ)
- **rag-worker**: RAG document ingestion worker

## 🔧 Configuration

All configuration files are centralized in the `/config` directory:

- `tsconfig.json` - Base TypeScript configuration
- `eslint.config.mjs` - ESLint rules
- `jest.config.ts` - Jest testing configuration
- `prisma.config.ts` - Prisma ORM configuration
- `mcp-servers.json` - Model Context Protocol servers

Each app/service extends these base configurations.

## 📖 Documentation

Comprehensive documentation is available in the `/docs` directory:

- Architecture guides
- API documentation
- Setup instructions
- Security guidelines
- Deployment guides

## 🐳 Docker Support

Docker configurations are in `/infra/docker`:

```bash
# Build image
npm run docker:build

# Start services
npm run docker:up

# Stop services
npm run docker:down
```

## 🔐 Environment Variables

Create `.env` files in each app/service directory:

```
apps/web/.env
apps/mobile/.env
services/worker/.env
```

See `.env.example` in each directory for required variables.

## 📝 Scripts

Common scripts are available at the root level:

- `npm run dev` - Start development server
- `npm run build` - Build production assets
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run migrate` - Run database migrations
- `npm run studio` - Open Prisma Studio

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

See [LICENSE](./LICENSE) file for details.

---

**Version**: 1.0.0  
**Last Updated**: February 10, 2026  
**Structure Type**: Monorepo with npm workspaces
