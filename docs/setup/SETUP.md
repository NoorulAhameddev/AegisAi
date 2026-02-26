# Development Environment Setup

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for database)
- Git

### Setup Steps

```bash
# 1. Clone repository
git clone <repo-url>
cd Aegis-Ai

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local
# Edit .env.local with your API keys and database URL

# 4. Setup database
npm run migrate

# 5. (Optional) Setup admin account
npm run setup-admin

# 6. Start development server
npm run dev
```

The app will be available at: `http://localhost:3000`

## 🐳 Docker Setup

### Using Docker Compose

```bash
# Build and start all services
npm run docker:up

# View logs
docker-compose logs -f

# Stop services
npm run docker:down
```

Services running:

- App: `http://localhost:3000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379` (if configured)

## 📱 Mobile Development

```bash
# Navigate to mobile folder
cd mobile

# Install dependencies
npm install

# Start Expo development server
npx expo start

# Run on iOS/Android simulator or scan QR code with Expo Go
```

## 🔧 Available Commands

### Development

```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Build for production
npm run start            # Start production server
```

### Database

```bash
npm run migrate          # Create migration & apply changes
npm run migrate:deploy   # Deploy migrations (production)
npm run studio           # Open Prisma Studio (visual DB tool)
```

### Scripts

```bash
npm run setup-admin                    # Create admin account
npm run cleanup:sessions               # Clean old sessions
npm run worker                         # Start AI worker
```

### Quality

```bash
npm run lint                           # Run ESLint
npm test                              # Run tests once
npm run test:watch                    # Watch mode
npm run test:coverage                 # Coverage report
```

### Docker

```bash
npm run docker:build                  # Build Docker image
npm run docker:up                     # Start Docker containers
npm run docker:down                   # Stop Docker containers
```

## 🔑 Environment Variables

### Required

```env
OPENAI_API_KEY=sk_xxx                # OpenRouter API key
DATABASE_URL=postgres://user:pass@localhost:5432/aegis
JWT_SECRET=your-secret-key
NEXTAUTH_SECRET=your-secret
```

### Optional

```env
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

See [TEST_ACCOUNTS.md](./docs/TEST_ACCOUNTS.md) for test credentials.

## 📂 File Organization at a Glance

```
Aegis-Ai/
├── src/
│   ├── app/              ← Next.js pages
│   ├── components/       ← React components
│   ├── services/         ← Business logic
│   ├── api/              ← Internal API logic
│   ├── lib/              ← Utilities & helpers
│   ├── types/            ← TypeScript types
│   ├── hooks/            ← React hooks
│   ├── workers/          ← Background jobs
│   └── __tests__/        ← Tests
├── mobile/               ← Expo app
├── prisma/               ← Database
├── scripts/              ← Utilities
├── docs/                 ← Documentation
├── config/               ← Configuration
└── public/               ← Static files
```

See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for detailed info.

## 🛠️ VS Code Setup

### Recommended Extensions

- ESLint
- Prettier - Code formatter
- TypeScript Vue Plugin
- Prisma
- Thunder Client (API testing)

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "eslint.validate": ["typescript", "typescriptreact"],
  "files.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/dist": true
  }
}
```

## 🐛 Debugging

### VS Code Debugger

Add `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

Start with: `NODE_OPTIONS='--inspect' npm run dev`

### Browser DevTools

- Open `http://localhost:3000`
- F12 or Cmd+Option+I for DevTools
- Network tab for API debugging
- Console for errors

## 🧪 Testing

### Run Tests

```bash
# Single run
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test File Structure

```
src/__tests__/
├── api/                 ← API tests
├── components/          ← Component tests
├── services/            ← Service tests
├── lib/                 ← Utility tests
└── integration/         ← Integration tests
```

## 🚀 Deployment

### To Production

1. **Build**: `npm run build`
2. **Test build**: `npm run start`
3. **Deploy**: Use Docker or platform-specific deployments
4. **Database**: `npm run migrate:deploy`

### Docker Deployment

```bash
npm run docker:build
# Push to registry
docker tag aegis-ai myregistry/aegis-ai:latest
docker push myregistry/aegis-ai:latest
```

## 📖 Documentation

- [README.md](./README.md) - Project overview
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Detailed structure
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Navigation guide
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Code standards
- [docs/DOCUMENTATION.md](./docs/DOCUMENTATION.md) - Full API docs
- [docs/RAG_QUICKSTART.md](./docs/RAG_QUICKSTART.md) - RAG setup
- [docs/admin/ADMIN_QUICKSTART.md](./docs/admin/ADMIN_QUICKSTART.md) - Admin guide

## 🆘 Troubleshooting

### Database Connection Issues

```bash
# Check DATABASE_URL in .env.local
# Reset database
npm run migrate -- --force-reset
# Or reset with Docker
docker-compose down -v
```

### Port Already in Use

```bash
# Find process on port 3000
netstat -ano | findstr :3000
# Kill process (Windows)
taskkill /PID <PID> /F
# Or change port
npm run dev -- -p 3001
```

### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### API Key Issues

```bash
# Verify your keys in .env.local
# Test API connection
npm run test-openai-key
# Check diagnostics
npm run diagnose-ai
```

## 📞 Getting Help

1. Check [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for file locations
2. See [docs/DOCUMENTATION.md](./docs/DOCUMENTATION.md) for API reference
3. Review [CONTRIBUTING.md](./CONTRIBUTING.md) for code standards
4. Check [docs/IMPLEMENTATION_GUIDE.md](./docs/IMPLEMENTATION_GUIDE.md) for architecture
5. Run diagnostic scripts: `npm run diagnose-ai`

## 🎯 Next Steps

1. ✅ Setup environment (see above)
2. ✅ Read [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
3. ✅ Check [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
4. ✅ Review [CONTRIBUTING.md](./CONTRIBUTING.md) for code standards
5. ✅ Start developing!

Happy coding! 🚀
