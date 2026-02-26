# Quick Navigation Guide

## 📍 Find Things Quickly

### I need to...

**Work on Chat Features**

- Chat pages: `src/app/chat/`
- Chat components: `src/components/chat/`
- Chat services: `src/services/` (look for chat-related)
- Chat API: `src/app/api/chat/`

**Work on Admin Panel**

- Admin pages: `src/app/admin/`
- Admin dashboard: `src/components/dashboard/`
- Admin API: `src/app/api/admin/`

**Work on RAG/Knowledge Base**

- RAG pages: `src/app/knowledge/`
- RAG components: `src/components/rag/`
- RAG services: `src/services/` (look for rag-related)
- RAG files: `src/app/files/`

**Work on Authentication**

- Login page: `src/app/login/`
- Register page: `src/app/register/`
- Auth API: `src/app/api/auth/`
- Auth middleware: `middleware.ts`

**Work on Database**

- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`
- Database queries: `src/api/` or `src/lib/`

**Run Diagnostics**

- Check AI: `scripts/diagnostics/diagnose-ai.ts`
- Check RAG: `scripts/diagnostics/check-rag.ts`
- Check LangChain: `scripts/diagnostics/check-langchain.ts`

**Setup/Configure**

- Setup admin: `scripts/setup/setup-admin.js`
- Setup roles: `scripts/setup/setup-role-accounts.ts`

**Maintain System**

- Cleanup sessions: `scripts/maintenance/cleanup-sessions.ts`
- Reset admin password: `scripts/maintenance/reset_admin_password.ts`

**Test Functionality**

- Test login: `scripts/testing/test-login-api.ts`
- Test OpenAI: `scripts/testing/test-openai-key.ts`
- Verify login: `scripts/testing/verify-login.ts`

**Mobile App**

- Mobile pages: `mobile/app/`
- Mobile components: `mobile/src/components/`
- Mobile services: `mobile/src/services/`

**View Documentation**

- API docs: `docs/DOCUMENTATION.md`
- RAG guide: `docs/RAG_QUICKSTART.md`
- Admin guide: `docs/admin/ADMIN_QUICKSTART.md`
- Implementation: `docs/IMPLEMENTATION_GUIDE.md`

### Configuration

**Environment Files**

- Main: `.env.local`
- Config reference: `config/` folder

**Build/Dev Config**

- Next.js: `next.config.js`
- TypeScript: `tsconfig.json`
- Jest: `jest.config.ts`
- ESLint: `eslint.config.mjs`

**Database Config**

- ORM: `prisma/schema.prisma`
- Docker: `docker-compose.yml`

## 🔍 File Organization Summary

```
ROOT/
├── src/               ← Main app code
│   ├── app/          ← Pages & routes
│   ├── components/   ← React components
│   ├── services/     ← Business logic
│   ├── api/          ← API logic
│   ├── lib/          ← Utilities
│   ├── types/        ← TypeScript types
│   ├── hooks/        ← Custom hooks
│   ├── utils/        ← Helpers
│   └── workers/      ← Background jobs
├── mobile/            ← Expo mobile app
├── prisma/            ← Database
├── scripts/           ← Utilities
│   ├── setup/
│   ├── diagnostics/
│   ├── maintenance/
│   └── testing/
├── docs/              ← Documentation
├── config/            ← Config files
└── public/            ← Static assets
```

## 🎯 Common Tasks

### "Where do I add a new API endpoint?"

→ `src/app/api/[route].ts`

### "Where do I add a new React component?"

→ `src/components/[feature]/ComponentName.tsx`

### "Where do I add a new service/integration?"

→ `src/services/[ServiceName].ts`

### "Where do I add database types?"

→ `src/types/` or reference `prisma/schema.prisma`

### "Where do I add utility functions?"

→ `src/utils/[category]/`

### "Where do I add custom hooks?"

→ `src/hooks/use[HookName].ts`

### "How do I create a new database migration?"

→ Modify `prisma/schema.prisma`, then run `npm run migrate`

### "Where are the test files?"

→ `src/__tests__/` (follow the same structure as `/src`)

### "Where do I run setup scripts?"

→ `scripts/setup/` - follow README for execution

### "Where are debug/diagnostic scripts?"

→ `scripts/diagnostics/`

## 📚 Documentation Structure

- **Getting Started**: `README.md`
- **Full API Docs**: `docs/DOCUMENTATION.md`
- **RAG Setup**: `docs/RAG_QUICKSTART.md` or `docs/RAG_GUIDE.md`
- **Admin Setup**: `docs/admin/ADMIN_QUICKSTART.md`
- **Test Accounts**: `docs/TEST_ACCOUNTS.md`
- **Implementation Details**: `docs/IMPLEMENTATION_GUIDE.md`
- **Changes**: `docs/CHANGELOG.md`
