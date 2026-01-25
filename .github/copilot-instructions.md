# Aegis AI - AI Coding Agent Instructions

## Project Architecture

**Aegis AI** is a production-ready enterprise AI chat platform built with Next.js 16 (App Router), TypeScript, PostgreSQL, and OpenAI. The system uses a **worker-based async architecture** with BullMQ for AI processing, ensuring the API never blocks on LLM calls.

### Core Architecture Pattern
```
Web Request → API Route → BullMQ Job → Worker Process → Streaming Response
     ↓             ↓            ↓              ↓               ↓
Next.js Edge   Enqueue Job   Redis Queue   AI Worker    SSE/EventStream
```

**Key Principle**: AI processing happens in `src/workers/ai.worker.ts`, NOT in API routes. API routes only enqueue jobs and return job IDs or establish SSE streams.

## Critical File Structure

```
src/
├── app/api/                    # Next.js API routes (enqueue jobs, light validation)
│   ├── chat/stream-sse/        # SSE endpoint for real-time AI streaming
│   ├── auth/                   # Authentication endpoints
│   ├── rag/                    # RAG knowledge base management
│   └── admin/                  # Admin operations
├── services/                   # Business logic (auth, ingestion, export, RAG)
│   ├── auth/                   # session.ts, auth.ts (JWT, sessions)
│   ├── rag/                    # RAG retrieval, embeddings, chunking
│   └── ingestion/              # File/web/YouTube content processing
├── workers/                    # Background job processors
│   └── ai.worker.ts           # Main AI chat processor (THIS is where LLM calls happen)
├── lib/                       # Shared utilities
│   ├── encryption.ts          # AES-256-GCM with key versioning (v1:iv:authTag:encrypted)
│   ├── logger.ts              # Structured logging (logger.auth, logger.db, logger.security)
│   ├── response.ts            # Standardized API responses (successResponse, errorResponse)
│   └── vector-store-server.ts # LanceDB vector store (server-side only)
└── tools/                     # AI function tools (calculator, web search, image gen)
```

## Development Workflows

### Running the Application
```bash
npm run dev          # Start Next.js dev server (port 3000)
npm run worker       # Start AI worker process (REQUIRED for chat to work)
npm run migrate      # Run Prisma migrations
npm run studio       # Open Prisma Studio (database GUI)
```

**Critical**: The worker MUST be running alongside `npm run dev` for chat functionality. The worker listens on the `chat-queue` and processes AI requests.

### Testing
```bash
npm test              # Run all Jest tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
npm run test:mcp      # Test MCP server integration
```

Tests are in `src/__tests__/` and use Jest with `@testing-library/jest-dom`.

### Database Operations
- **Schema**: `prisma/schema.prisma` (13+ indexes for performance)
- **Migrations**: Always run `npm run migrate` after schema changes
- **Encryption**: Use `encrypt()`/`decrypt()` from `@/lib/encryption` for sensitive fields
- **Audit Logs**: All admin actions MUST create an `AuditLog` entry

## Key Conventions

### 1. Authentication & Authorization
- **Middleware**: `middleware.ts` handles JWT verification for protected routes and sets `x-user-id`, `x-token-version`, `x-request-id` headers
- **Auth Service**: Use `verifyAuth(req)` from `@/services/auth/auth` in API routes
- **Token Format**: Access token (10min) + Refresh token (7 days) stored in HTTP-only cookies
- **Session Management**: 
  - `createSession()` - Create new JWT pair with DB session record
  - `rotateTokens()` - Refresh tokens
  - `revokeAllSessions()` - Force logout (increment user.tokenVersion)
- **Token Version**: User model has `tokenVersion` field - increment it to instantly invalidate all tokens

### 2. API Response Pattern
Always use standardized responses from `@/lib/response`:
```typescript
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse();
    
    // Process request
    return successResponse({ data: result });
  } catch (error) {
    return errorResponse('Something went wrong', { status: 500 });
  }
}
```

Response structure:
```typescript
{ success: boolean, data?: T, error?: string, timestamp: string, requestId?: string }
```

### 3. RAG (Retrieval Augmented Generation)
- **Vector Store**: LanceDB in `data/lancedb/` (server-side only, external in webpack)
- **Ingestion**: `ingestFile(fileId, content, userId)` from `@/services/rag/ingest`
- **Retrieval**: `retrieveContext(userId, query, topK)` from `@/services/rag/rag-retrieval`
- **Auto-ingest**: File uploads automatically trigger RAG ingestion if file type is supported
- **Worker Integration**: `processor.ts` uses `retrieveContext()` to augment AI prompts
- **Query Detection**: `shouldUseRAG(message)` skips RAG for greetings/commands

### 4. Encryption & Security
- **Encryption Format**: `v1:iv:authTag:encrypted` (supports key rotation)
- **Functions**: `encrypt(text)`, `decrypt(text)` from `@/lib/encryption`
- **Environment**: `ENCRYPTION_KEY` must be exactly 32 characters
- **Use Cases**: User messages, file content, sensitive metadata
- **Security Headers**: `next.config.js` sets HSTS, CSP, X-Frame-Options, etc.

### 5. Worker Job Processing
When creating AI-related features:
1. **API Route**: Enqueue job with BullMQ (`await chatQueue.add(...)`)
2. **Worker**: Process in `src/workers/processor.ts` or similar
3. **Error Handling**: Jobs return `{ success, error, data }` - worker logs failures
4. **Streaming**: Use SSE endpoint (`/api/chat/stream-sse`) for real-time responses

Example job structure:
```typescript
const job = await chatQueue.add('process-chat', {
  chatId, userId, message, projectId, requestId
});
```

### 6. Logging Standards
Use structured logger from `@/lib/logger`:
```typescript
logger.auth('User logged in', { userId });
logger.db('SELECT', 'users', duration);
logger.security('Unauthorized access attempt', { ip, path });
logger.error('Operation failed', error, { context });
```

### 7. File Handling
- **Uploads**: Stored in `uploads/` directory with UUID filenames
- **Processing**: Use `extractText(filePath, mimeType)` from `@/services/files/fileProcessor`
- **Supported Types**: PDF, DOCX, TXT, images (OCR via Tesseract), audio transcription
- **Size Limits**: Configured in RAG config (default 50MB)

## Integration Points

### MCP (Model Context Protocol)
- **Config**: `mcp-servers.json` defines available MCP servers (filesystem, github, puppeteer)
- **Testing**: `npm run test:mcp` validates MCP server connectivity
- **Usage**: MCP servers provide additional context/tools to AI agents

### External Services
- **OpenRouter**: AI model provider (requires `OPENROUTER_API_KEY`)
- **Redis**: Required for BullMQ job queue and rate limiting (`REDIS_URL`)
- **PostgreSQL**: Primary database (`DATABASE_URL`)

## Common Patterns

### Adding a New API Route
1. Create route in `src/app/api/[feature]/route.ts`
2. Use `verifyAuth(req)` for authentication
3. Return standardized responses from `@/lib/response`
4. Add middleware matcher if route needs JWT verification
5. If AI processing needed, enqueue to BullMQ instead of direct LLM call

### Adding a New AI Tool
1. Create tool in `src/tools/[tool-name].ts`
2. Export tool definition with OpenAI function schema
3. Register in `src/tools/index.ts` with `registerTool()`
4. Worker automatically picks up registered tools via `getOpenAITools()`

### Adding Database Models
1. Update `prisma/schema.prisma`
2. Run `npm run migrate` (creates migration)
3. Use `prisma` client imported from `@/lib/prisma`
4. Add indexes for commonly queried fields
5. Consider encryption for sensitive fields

## Project-Specific Notes

- **LanceDB External**: Vector store is marked `serverExternalPackages: ["@lancedb/lancedb"]` in Next.js config to prevent bundling issues
- **Dual Processor**: `processor.ts` (working) vs `langchain-processor.ts` (experimental) - default uses OpenAI SDK directly
- **Mobile Support**: `mobile/` directory contains React Native/Expo app (separate package.json)
- **Docker**: `docker-compose.yml` includes PostgreSQL, Redis, and app services
- **Security**: All sensitive data at rest is AES-256-GCM encrypted, JWT secrets required, rate limiting via Redis
- **TypeScript Paths**: Use `@/*` alias for `src/*` imports (configured in tsconfig.json)

## Troubleshooting

### Chat Not Working
- Verify worker is running (`npm run worker`)
- Check Redis connection (`REDIS_URL` in .env)
- Check OpenRouter API key validity
- Review worker logs for errors

### Database Errors
- Run migrations: `npm run migrate`
- Check `DATABASE_URL` format: `postgresql://user:pass@host:port/dbname`
- Verify 13+ indexes exist in schema

### Vector Store Issues
- LanceDB data in `data/lancedb/` (create if missing)
- Server-side only - don't import in client components
- Check OpenAI embeddings API key

## Documentation
- `docs/IMPLEMENTATION_GUIDE.md` - Quick reference for fixes and patterns
- `docs/RAG_IMPLEMENTATION.md` - RAG system architecture
- `docs/ADMIN_GUIDE.md` - Admin dashboard usage
- `README.md` - Setup and deployment instructions
