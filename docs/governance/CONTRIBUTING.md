# Contributing & Code Organization Standards

## 📋 Project Standards

### Code Organization

#### Components
- Location: `src/components/[feature]/ComponentName.tsx`
- Each component should be a single file or a folder with `index.tsx`
- Keep related components together
- Example: `src/components/chat/ChatMessage.tsx`, `src/components/chat/ChatInput.tsx`

#### Services
- Location: `src/services/ServiceName.ts`
- Business logic, API calls, integrations
- Examples: `AiService.ts`, `RagService.ts`, `UserService.ts`

#### Hooks
- Location: `src/hooks/use[HookName].ts`
- Custom React hooks
- Examples: `useChat.ts`, `useUser.ts`, `useAuth.ts`

#### Types
- Location: `src/types/[Domain].ts`
- TypeScript interfaces & types
- Examples: `Chat.ts`, `User.ts`, `Api.ts`

#### Utils
- Location: `src/utils/[Category]/[function].ts`
- Pure utility functions
- Examples: `formatters/`, `validators/`, `helpers/`

#### API Routes
- Location: `src/app/api/[route]/route.ts`
- API endpoint handlers
- Follows Next.js App Router convention

### Naming Conventions

**Files**
- Components: PascalCase (e.g., `ChatMessage.tsx`)
- Services: PascalCase (e.g., `AiService.ts`)
- Hooks: camelCase with 'use' prefix (e.g., `useChat.ts`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Types: PascalCase (e.g., `ChatMessage.ts`)

**Classes & Interfaces**
- PascalCase (e.g., `class UserService {}`)

**Variables & Functions**
- camelCase (e.g., `const getUser = () => {}`)

**Constants**
- UPPER_SNAKE_CASE (e.g., `const MAX_RETRIES = 3`)

### Folder Structure Principles

1. **Feature-First**: Organize by business feature first
   - ✅ `src/components/chat/`
   - ✅ `src/app/chat/`
   - ❌ Avoid generic "forms" or "buttons" at top level

2. **Co-locate Related Code**: Keep related files together
   - ✅ Chat components, hooks, services together
   - ❌ Spreading across multiple folders

3. **Scale-Aware**: Expand as features grow
   - Small feature: Single folder
   - Large feature: Subfolder organization

## 📁 Where to Put Things

### "I'm adding a new feature..."

| Feature | Location | Structure |
|---------|----------|-----------|
| Chat UI component | `src/components/chat/` | `ChatBubble.tsx`, `ChatInput.tsx` |
| Chat page | `src/app/chat/` | `page.tsx`, `layout.tsx` |
| Chat API | `src/app/api/chat/` | `route.ts` or `[action]/route.ts` |
| Chat logic | `src/services/ChatService.ts` | Business logic class |
| Chat types | `src/types/Chat.ts` | Interfaces & types |
| Chat hook | `src/hooks/useChat.ts` | React hook |

### "I'm adding a utility..."

| Utility | Location |
|---------|----------|
| Date formatter | `src/utils/formatters/formatDate.ts` |
| Email validator | `src/utils/validators/validateEmail.ts` |
| String helper | `src/utils/helpers/stringHelpers.ts` |

### "I'm setting up database..."

| Task | Location | Steps |
|------|----------|-------|
| Add schema | `prisma/schema.prisma` | 1. Edit schema 2. Run `npm run migrate` |
| Query data | `src/lib/` or `src/api/` | Use Prisma client |
| Types from DB | `src/types/` | Export from Prisma-generated types |

## 🔄 Development Workflow

### 1. Feature Development

```
1. Create feature branch: git checkout -b feature/chat-improvements
2. Add files to organized locations (see above)
3. Update types in src/types/
4. Create services in src/services/
5. Build components in src/components/
6. Create API routes in src/app/api/
7. Add tests in src/__tests__/
8. Commit with clear messages
```

### 2. Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Run `npm run lint` before committing
- **Prettier**: Auto-format on save
- **Comments**: JSDoc for public APIs

### 3. Testing

- **Unit Tests**: `src/__tests__/[module].test.ts`
- **Integration Tests**: `src/__tests__/integration/`
- **Run**: `npm test`, `npm run test:watch`, `npm run test:coverage`

### 4. Database Changes

```bash
# Modify prisma/schema.prisma
npm run migrate  # Creates migration
git add prisma/migrations/
git commit -m "migrate: descriptive message"
```

## 🚀 Scripts Organization

### Setup Scripts (`scripts/setup/`)
- Initial configuration
- One-time setup tasks
- Role/user creation

### Diagnostic Scripts (`scripts/diagnostics/`)
- Debug issues
- Check system health
- Verify integrations

### Maintenance Scripts (`scripts/maintenance/`)
- Recurring tasks
- Cleanup operations
- Admin operations

### Testing Scripts (`scripts/testing/`)
- Verify functionality
- Integration testing
- Security testing

## 📦 Managing Dependencies

- **Core**: Next.js, React, TypeScript
- **Database**: Prisma, PostgreSQL
- **AI/ML**: LangChain, OpenRouter, LanceDB
- **Styling**: Tailwind CSS
- **Security**: JWT, bcrypt
- **Testing**: Jest
- **Linting**: ESLint

### Adding New Dependencies

1. Determine: Is this npm or peer dependency?
2. Install: `npm install [package]`
3. Add to monorepo if using workspaces
4. Update docs if public API changes

## ✅ Code Review Checklist

Before committing:

- [ ] Code follows naming conventions
- [ ] Files in correct locations
- [ ] Tests written for new code
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] TypeScript types are strict
- [ ] No hardcoded values (use config)
- [ ] No console.logs in production code
- [ ] Comments on complex logic
- [ ] PR description is clear

## 🆘 Troubleshooting

### "Where do I put X?"

1. Is it a UI component? → `src/components/[feature]/`
2. Is it business logic? → `src/services/`
3. Is it a helper function? → `src/utils/`
4. Is it an API endpoint? → `src/app/api/`
5. Is it a type? → `src/types/`
6. Is it a hook? → `src/hooks/`

### "My component is too big"

- Split into smaller components
- Extract logic to a service
- Create custom hooks

### "Where should tests go?"

- `src/__tests__/[matching path]`
- Example: Component at `src/components/chat/ChatMessage.tsx` → Test at `src/__tests__/components/chat/ChatMessage.test.ts`

## 📚 Key Files

- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Detailed structure
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Quick navigation
- [README.md](./README.md) - Project overview
- [docs/DOCUMENTATION.md](./docs/DOCUMENTATION.md) - API docs
