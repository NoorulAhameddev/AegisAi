# Migration Guide - Monorepo Structure

This guide helps you adapt to the new monorepo structure.

## 🔄 What Changed

Aegis AI has been restructured from a single-app repository to a monorepo for better scalability and organization.

### Old Structure → New Structure

| Old Path | New Path | Notes |
|----------|----------|-------|
| `/src/` | `/apps/web/src/` | Web app source code |
| `/public/` | `/apps/web/public/` | Static assets |
| `/mobile/` | `/apps/mobile/` | Mobile app |
| `/scripts/` | `/infra/scripts/` | Utility scripts |
| `/tests/` | `/apps/web/tests/` | Web app tests |
| `/prisma/` | `/prisma/` | Database (unchanged) |
| `/docs/` | `/docs/` | Documentation (unchanged) |
| `/archive/` | `/docs/archive-root/` | Archived files |
| `tsconfig.json` | `/config/tsconfig.json` | Base config |
| `eslint.config.mjs` | `/config/eslint.config.mjs` | Linting config |
| `jest.config.ts` | `/config/jest.config.ts` | Test config |
| `Dockerfile` | `/infra/docker/Dockerfile` | Docker image |
| `docker-compose.yml` | `/infra/docker/docker-compose.yml` | Docker compose |
| `middleware.ts` | `/apps/web/middleware.ts` | Next.js middleware |

## 📦 Package Changes

### Root `package.json`

The root `package.json` now manages workspaces:

```json
{
  "workspaces": [
    "apps/*",
    "packages/*",
    "services/*"
  ]
}
```

### New Package Files

- `/apps/web/package.json` - Web app dependencies
- `/apps/mobile/package.json` - Mobile app dependencies (existing)
- `/packages/shared/package.json` - Shared utilities (to be created)
- `/packages/ui/package.json` - Shared UI components (to be created)

## 🛠️ Command Changes

### Before

```bash
npm run dev
npm run build
npm test
npm run worker
```

### After

```bash
npm run dev              # Still works - runs web app
npm run build           # Still works - builds web app
npm test                # Runs tests in all workspaces
npm run worker          # Still works - runs chat worker
```

### New Commands

```bash
npm run build:all       # Build all workspaces
npm run dev:mobile      # Start mobile app
npm install --workspace=apps/web  # Install for specific workspace
```

## 🔧 Configuration Updates

### TypeScript Paths

If you have absolute imports, update `tsconfig.json` paths:

**apps/web/tsconfig.json:**
```json
{
  "extends": "../../config/tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Environment Variables

No changes needed - `.env` files work the same way.

### Import Paths

**Before:**
```typescript
import { auth } from '@/lib/auth';
```

**After:** (unchanged)
```typescript
import { auth } from '@/lib/auth';
```

The `@/` alias still points to `src/` within each app. No code changes needed!

## 🚀 Developer Workflow

### 1. Fresh Install

```bash
# Delete old node_modules
rm -rf node_modules

# Install all dependencies
npm install
```

### 2. Running the App

```bash
# Web app (from root)
npm run dev

# Or from web directory
cd apps/web
npm run dev
```

### 3. Running Workers

```bash
# From root (paths updated automatically)
npm run worker
npm run worker:rag
```

### 4. Database Operations

```bash
# No changes - prisma commands work the same
npm run migrate
npm run studio
```

### 5. Testing

```bash
# Run all tests
npm test

# Run tests for web app only
cd apps/web
npm test
```

## 🐛 Common Issues

### Issue: Module not found

**Solution:** Run `npm install` from the root directory.

### Issue: TypeScript errors about paths

**Solution:** Update your IDE/editor to use the workspace root. In VS Code, open the root folder, not a subfolder.

### Issue: Scripts not found

**Solution:** Make sure you're running scripts from the root directory, or use `npm run <script> --workspace=<workspace-name>`.

### Issue: Docker build fails

**Solution:** Update Docker context:
```bash
# Build from infra/docker directory
cd infra/docker
docker build -f Dockerfile -t aegis-ai ../..
```

Or use the npm script:
```bash
npm run docker:build
```

## 📝 Code Changes Needed

### Minimal Changes Required

Most code doesn't need changes because:

1. ✅ Import paths (`@/`) still work
2. ✅ Environment variables still work
3. ✅ API routes unchanged
4. ✅ Component structure unchanged

### Optional Improvements

You may want to:

1. Extract shared utilities to `/packages/shared`
2. Extract shared UI components to `/packages/ui`
3. Create workspace-specific configurations

## 🎯 Next Steps

1. **Test your development environment:**
   ```bash
   npm install
   npm run dev
   ```

2. **Verify workers:**
   ```bash
   npm run worker
   npm run worker:rag
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

4. **Check builds:**
   ```bash
   npm run build:all
   ```

## 💡 Benefits of New Structure

1. **Clear Separation**: Apps, services, and infrastructure are clearly separated
2. **Scalability**: Easy to add new apps or services
3. **Shared Code**: Packages can be shared across apps
4. **Better Organization**: Configuration centralized, easier to maintain
5. **Monorepo Ready**: Can use tools like Turborepo, Lerna, or Nx if needed

## 📚 Additional Resources

- [MONOREPO_STRUCTURE.md](./MONOREPO_STRUCTURE.md) - Detailed structure documentation
- [docs/](./docs/) - Architecture and API documentation
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines

## ❓ Questions?

If you encounter issues:

1. Check this migration guide
2. Review [MONOREPO_STRUCTURE.md](./MONOREPO_STRUCTURE.md)
3. Open an issue on GitHub
4. Contact the development team

---

**Migration Date**: February 10, 2026  
**Structure Version**: 1.0.0  
**Breaking Changes**: None (backwards compatible)
