# Aegis AI - AI Coding Agent Instructions

## Project Architecture

**Aegis AI** is a production-ready enterprise AI chat platform built with Next.js 16 (App Router), TypeScript, PostgreSQL, and OpenAI. The system uses a **worker-based async architecture** with BullMQ for AI processing, ensuring the API never blocks on LLM calls.

### Core Architecture Pattern

```
Web Request → API Route → BullMQ Job → Worker Process → Streaming Response
     ↓             ↓            ↓              ↓               ↓
Next.js Edge   Enqueue Job   Redis Queue   AI Worker    SSE/EventStream
```

**Key Principle**: AI processing happens in background workers (`src/workers/*.worker.ts`), NOT in API routes. API routes either enqueue jobs to Redis queues or establish SSE streams for real-time responses.

## Critical File Structure

```
src/
├── app/api/                    # Next.js API routes
│   ├── chat/                   # Chat endpoints
│   │   ├── stream/            # Job-based: enqueues to chatQueue (polling)
│   │   ├── stream-sse/        # Streaming: inline SSE (real-time, no worker)
│   │   ├── status/            # Query job status by jobId
│   │   ├── history/           # Retrieve conversation messages
│   │   ├── create/            # Create new chat
│   │   ├── delete/            # Delete chat (soft delete)
│   │   ├── export/            # Export as PDF/Markdown
│   │   └── regenerate/        # Regenerate last response
│   ├── auth/                   # Login, register, logout, refresh tokens
│   ├── rag/                    # RAG: ingest, search, manage knowledge base
│   ├── admin/                  # Admin: user management, audit logs
│   ├── ai/                     # Model configuration endpoints
│   ├── memory/                 # Long-term memory management
│   ├── ingest/                 # File/web content ingestion triggers
│   ├── search/                 # Cross-project search
│   ├── mcp/                    # Model Context Protocol endpoints
│   └── files/                  # File upload/download
├── services/                   # Business logic
│   ├── auth/                   # JWT creation, token rotation, session mgmt
│   ├── rag/                    # Retrieval, embeddings, chunking, sanitization
│   ├── billing/                # Token budget tracking and rate limiting
│   ├── ingestion/              # Extract text from files/web/YouTube
│   ├── export/                 # PDF/Markdown generation
│   ├── files/                  # File processing (upload, storage, cleanup)
│   └── ai/                     # Prompt building, memory extraction, moderation
├── workers/                    # BullMQ background job processors
│   ├── chat.worker.ts          # Listens to chatQueue, calls processChatJob
│   ├── rag.worker.ts           # Listens to ragQueue (auto-ingest on file upload)
│   ├── processor.ts            # Core chat job processor: RAG, security, safety, LLM call
│   ├── langchain-processor.ts  # Experimental LangChain-based processor (unused)
│   └── cleanup.ts              # Session cleanup and maintenance tasks
├── lib/                        # Shared utilities
│   ├── encryption.ts           # AES-256-GCM (supports key rotation)
│   ├── logger.ts               # Structured: logger.auth, logger.db, logger.security, logger.worker
│   ├── response.ts             # successResponse, errorResponse, forbiddenResponse, withRateLimitHeaders
│   ├── queue.ts                # BullMQ setup: chatQueue, ragQueue, dlqQueue
│   ├── security.ts             # Input validation, leak detection, moderation checks
│   ├── response-safety.ts       # Content validation, boundary detection, redaction
│   ├── rag-retrieval.ts        # Query LanceDB, retrieve context, manage embeddings
│   ├── moderation.ts           # OpenAI moderation API integration
│   └── prisma.ts               # Prisma client singleton
└── tools/                      # AI executable tools (registered for function calling)
    ├── calculator.ts           # Math operations
    ├── image-generator.ts      # DALL-E integration
    ├── web-browser.ts          # Web search + page reading
    ├── code-review.ts          # Static code analysis (SAFE: no execution)
    └── code-formatter.ts       # Code formatting (SAFE: no execution)
```

**CRITICAL SECURITY NOTE**: `CodeCompilerTool` is intentionally EXCLUDED. Reason: prevents arbitrary code execution, ensures students use their IDE, protects against sandbox bypass. Register only safe tools (static analysis, formatting, search).

## Development Workflows

### Running the Application

```bash
npm run dev          # Start Next.js dev server (port 3000)
npm run worker       # Start chat worker (REQUIRED for /api/chat/stream polling)
npm run worker:rag   # Start RAG worker (processes file ingestion async)
npm run migrate      # Run Prisma migrations
npm run studio       # Open Prisma Studio database GUI
npm run clean        # Remove .next, logs, uploads, LanceDB cache
```

**CRITICAL**:

- **For SSE streaming** (`/api/chat/stream-sse`): Worker NOT needed; processes inline
- **For polling** (`/api/chat/stream`): Worker MUST run or jobs stack in Redis queue
- Both endpoints exist; prefer SSE for real-time interactivity

### Testing

```bash
npm test              # Run all Jest tests in src/__tests__/
npm run test:watch    # Watch mode for development
npm run test:coverage # Generate coverage report
npm run test:mcp      # Validate MCP server connectivity
npm run test:edge     # Test Edge Runtime compatibility
```

### Database Operations

- **Schema**: `prisma/schema.prisma` (complex: 13+ indexes, soft deletes, encryption fields)
- **Migrations**: Always run `npm run migrate` after schema changes
- **Encryption**: Sensitive data encrypted with `encrypt()/decrypt()` from `@/lib/encryption`
- **Audit Logging**: Admin actions create `AuditLog` entries (includes `integrityHash`, `mfaVerified`)
- **Soft Deletes**: Chat and File models use `deletedAt` field (indexed for fast filtering)

## Key Conventions

### 1. Authentication & Authorization

- **Middleware**: `middleware.ts` validates JWT, sets `x-user-id`, `x-token-version`, `x-request-id` headers
- **Verification**: Import `verifyAuth(req)` from `@/services/auth/auth` in protected routes
- **Tokens**:
  - Access: 10 minutes (JWT in Authorization header or cookie)
  - Refresh: 7 days (HTTP-only cookie)
- **Session Management**:
  - `createSession()` → Create JWT pair + DB record
  - `rotateTokens()` → Issue fresh pair
  - `revokeAllSessions()` → Increment `user.tokenVersion` to invalidate all sessions instantly
- **Password Hashing**: bcrypt with 14 rounds (standard 12 + 2 for 2026+ security)

### 2. API Response Pattern

Always return standardized responses from `@/lib/response`:

```typescript
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from "@/lib/response";

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user)
      return unauthorizedResponse({
        requestId: req.headers.get("x-request-id"),
      });

    // Process business logic
    return successResponse(result, {
      requestId: req.headers.get("x-request-id"),
    });
  } catch (error) {
    logger.error("Route handler failed", error as Error);
    return errorResponse("Operation failed", { status: 500 });
  }
}
```

Response envelope:

```typescript
{
  success: boolean,
  data?: T,
  error?: string,
  message?: string,
  timestamp: string,
  requestId?: string
}
```

### 3. Chat Processing Paths

**Two different architectures** - choose based on use case:

**Path A: `/api/chat/stream-sse` (Preferred for real-time)**

- Server-Sent Events (SSE) streaming
- No BullMQ queuing; processes inline
- Immediate token-by-token response
- Built into `processor.ts` with:
  - RAG context retrieval via `retrieveContext(userId, query, topK)`
  - OpenAI moderation check via `checkModeration(text)`
  - Response content validation via `validateResponseContent()`
  - Memory extraction via `extractAndSaveMemory()`
  - Boundary detection via `detectBoundaryBreaks()`

**Path B: `/api/chat/stream` (For async/polling)**

- Enqueues job to `chatQueue`
- Returns `{ success, jobId }` immediately
- Client polls `GET /api/chat/status/{jobId}` for updates
- Worker processes via `processChatJob(job)` in `processor.ts`
- Use when: long operations, batching, or client-side polling preferred

Example decision tree:

```
Real-time interactive chat? → Use /stream-sse
Long-running processing? → Use /stream, client polls /status
Batch operations? → Use /stream, queue can accumulate jobs
```

### 4. RAG (Retrieval Augmented Generation)

- **Vector Store**: LanceDB in `data/lancedb/` (server-side only; marked external in Next.js config)
- **Retrieval**: `retrieveContext(userId, query, topK)` from `@/lib/rag-retrieval`
  - Queries LanceDB for semantic similarity
  - Returns top-K documents with scores
- **Ingestion**: Two paths:
  - Auto: File upload → triggers `ragQueue` worker
  - Manual: Call `ingestFile(fileId, content, userId)` from `@/services/rag/ingest`
- **Prompt Injection Prevention**: `processor.ts` sanitizes RAG context by removing instruction-like patterns (ignore/override/act-as/roleplay)
- **Query Detection**: `shouldUseRAG(message)` returns false for greetings/chitchat to save embeddings quota

### 5. Encryption & Security

- **Format**: `v1:iv:authTag:encrypted` (version prefix allows key rotation without downtime)
- **Algorithm**: AES-256-GCM (authenticated encryption; built-in tamper detection)
- **Functions**:
  ```typescript
  import { encrypt, decrypt } from "@/lib/encryption";
  const ciphertext = encrypt(sensitiveData); // Returns v1:...
  const plaintext = decrypt(ciphertext); // Auto-detects version
  ```
- **Environment**:
  - `ENCRYPTION_KEY_CIPHERTEXT` (AWS KMS encrypted for production)
  - Regular `ENCRYPTION_KEY` for local dev (must be 32 chars)
- **Use Cases**: User messages, file paths, API keys, credit cards, personally identifiable information
- **Security Headers** (set in `next.config.js`):
  - HSTS: 2 years, includeSubDomains, preload
  - CSP: Strict (no unsafe-inline)
  - X-Frame-Options: DENY
  - X-XSS-Protection: enabled
  - X-DNS-Prefetch-Control: on
- **Audit Integrity**: `AuditLog.integrityHash` computed via SHA-256 of log data + secret; verify before trusting logs

### 6. Worker Job Processing

Creating a new background job type:

1. **Define Queue** in `src/lib/queue.ts`:
   ```typescript
   export const myQueue = new Queue("my-queue-name", { connection });
   ```
2. **Create Worker** at `src/workers/my.worker.ts`:
   ```typescript
   const worker = new Worker(myQueue.name, async (job) => processMyJob(job), {
     connection,
   });
   ```
3. **Implement Processor** (e.g., `processor.ts`):
   ```typescript
   export async function processMyJob(job: Job) {
     const { data } = job;
     // Long-running logic here
     return { success: true, data: result };
   }
   ```
4. **Enqueue from API**:
   ```typescript
   const job = await myQueue.add(
     "my-job-type",
     { param1, param2 },
     { jobId: uniqueId }, // Deduplicates by jobId
   );
   return successResponse({ jobId: job.id });
   ```
5. **Error Handling**: Failed jobs automatically move to `dlqQueue`; worker logs via `logger.worker(jobId, 'failed', { error })`

### 7. Logging Standards

Structured logging from `@/lib/logger`:

```typescript
logger.auth("User login", { userId, ipAddress }); // Auth events
logger.db("Query", tableName, durationMs); // Database operations
logger.security("Suspicious behavior", { userId, reason }); // Security incidents
logger.error("Operation failed", error as Error, { context }); // Errors
logger.worker(jobId, "completed", { status, duration }); // Worker events
logger.warn("Deprecated API used", { endpoint, user }); // Warnings
```

All logs include timestamp, request ID (if available), and structured context.

### 8. File Handling & Content Extraction

- **Upload Flow**: POST `/api/files` → Save to `uploads/UUID.ext` → Encrypt path → Create DB record → Trigger `ragQueue` (if RAG enabled)
- **Supported Formats** via `extractText(filePath, mimeType)`:
  - PDF: pdf-parse library
  - DOCX: mammoth library
  - TXT: plain text
  - Images: tesseract.js (OCR)
  - Audio/Video: youtube-transcript (transcripts only)
- **Size Limits**: Configured per type; default 50MB
- **Encryption**: File paths stored encrypted in DB (`File.encryptedPath`)
- **Lifecycle**: Soft delete via `deletedAt` timestamp (GDPR compliance)

### 9. Tool Development & Registration

Creating an AI tool:

```typescript
// src/tools/my-tool.ts
import { Tool } from "./index";

export const MyTool: Tool = {
  name: "my-tool",
  description: "Does something useful safely",
  parameters: {
    type: "object",
    properties: {
      input: { type: "string", description: "..." },
    },
    required: ["input"],
  },
  execute: async (args) => {
    // MUST be safe: no arbitrary code execution
    // Only static analysis, formatting, lookups allowed
    return { result: "..." };
  },
};
```

Register in `src/tools/index.ts`:

```typescript
export function registerAllTools() {
  registerTool(MyTool); // Automatically picked up by worker
}
```

**Safety Constraints**:

- ✅ Static analysis (code review, linting)
- ✅ Formatting and transformation
- ✅ Data lookups and searches
- ⛔ Code execution (removed CodeCompilerTool deliberately)
- ⛔ System commands
- ⛔ Arbitrary file writes

## Integration Points

### MCP (Model Context Protocol)

- **Config**: `mcp-servers.json` lists available MCP servers
- **Current Servers**:
  - `@modelcontextprotocol/server-filesystem` - File system access
  - `@modelcontextprotocol/server-github` - GitHub integration
  - `@modelcontextprotocol/server-puppeteer` - Web automation
- **Testing**: `npm run test:mcp` validates connectivity
- **Extension**: Add new servers to `mcp-servers.json`; they auto-register

### External Services

- **OpenRouter API**: AI models via OpenAI SDK
  - Config: `OPENROUTER_API_KEY` in `.env`
  - Models: GPT-4o, Claude, etc.
- **Redis**: Queue processing + caching + sessions
  - Config: `REDIS_URL` (e.g., `redis://localhost:6379`)
  - Queues: chatQueue, ragQueue, dlqQueue
- **PostgreSQL**: Primary application database
  - Config: `DATABASE_URL` (e.g., `postgresql://user:pass@localhost/aegis`)
  - ORM: Prisma
- **AWS KMS**: Optional encryption key management (production)
  - Config: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

## Common Patterns

### Adding a New API Route

1. Create file: `src/app/api/[feature]/route.ts`
2. Import auth helper:
   ```typescript
   import { verifyAuth } from "@/services/auth/auth";
   ```
3. Implement handler with auth + responses:

   ```typescript
   export async function POST(req: NextRequest) {
     try {
       const user = await verifyAuth(req);
       if (!user) return unauthorizedResponse();

       // Business logic
       return successResponse({ ... });
     } catch (error) {
       return errorResponse('Failed', { status: 500 });
     }
   }
   ```

4. Add middleware matcher if auth-required (in `middleware.ts`)
5. If heavy processing: enqueue to appropriate queue instead of blocking

### Adding a New Database Model

1. Update `prisma/schema.prisma`:

   ```typescript
   model MyEntity {
     id String @id @default(uuid())
     userId String
     data String @db.Text
     createdAt DateTime @default(now())

     @@index([userId, createdAt])  // Index query patterns
   }
   ```

2. Run `npm run migrate` (creates migration file auto)
3. For sensitive fields, encrypt in service layer before storing
4. If admin action, create corresponding `AuditLog` entry

### Adding a New AI Tool

1. Create tool file: `src/tools/my-tool.ts`
2. Define and export `Tool` interface
3. Register in `src/tools/index.ts` via `registerTool()`
4. Tool auto-loads in worker via `getOpenAITools()`
5. OpenAI API receives tool definition + calls `execute()` when selected

## Project-Specific Notes

- **LanceDB Integration**: Marked external in webpack config (`serverExternalPackages`) to prevent bundling issues
- **Dual Processors**: `processor.ts` (production OpenAI SDK) vs `langchain-processor.ts` (experimental); default uses direct SDK
- **Mobile App**: `mobile/` contains separate React Native/Expo project (own `package.json`, build pipeline)
- **Docker Support**: `docker-compose.yml` orchestrates PostgreSQL + Redis + app; `Dockerfile` for containerization
- **GDPR Compliance**: Soft deletes via `deletedAt` field (indexed); never hard-delete user data
- **TypeScript Aliases**: Use `@/` prefix for `src/` imports (configured in `tsconfig.json`)
- **Response Safety**: `processor.ts` validates response content (redaction), checks boundaries (prompt leakage), runs moderation
- **Token Budget**: `tokenBudgetManager` tracks usage per user; enforces rate limits via Redis

## Troubleshooting

### Chat Not Streaming

- If using `/api/chat/stream-sse`:
  - Check browser network tab for SSE connection
  - Verify OpenRouter API key is valid
  - Check logs: `logger.error` for stream failures
- If using `/api/chat/stream`:
  - Verify worker is running: `npm run worker`
  - Check Redis queue: `redis-cli LLEN chat-queue`
  - Check job status: `GET /api/chat/status/{jobId}`

### RAG Not Retrieving Documents

- Check file was ingested:
  - Verify `File` record exists in database
  - Check `data/lancedb/` directory has vector data
  - Run `npm run worker:rag` for auto-ingestion
- Check RAG query detection:
  - Log shows `shouldUseRAG() = false` for small queries
  - Context retrieval may return empty if no semantic match
- Sanitization filtering context:
  - Logs show "[DOCUMENT TEXT FILTERED - POTENTIAL INSTRUCTION]" if injection attempt detected

### Database Connection Issues

- Run migrations: `npm run migrate`
- Verify `DATABASE_URL`: `postgresql://[user]:[pass]@[host]:[port]/[db]`
- Check Prisma Studio: `npm run studio`
- Ensure 13+ indexes exist (check schema)

### Redis/Queue Issues

- Verify Redis running: `redis-cli ping`
- Check `REDIS_URL` format and connection
- Clear queue if stuck: `redis-cli DEL chat-queue rag-queue dlq-queue`
- Monitor queue: `redis-cli LLEN chat-queue`

### Vector Store Issues

- Create `data/lancedb/` if missing
- LanceDB is server-side only; don't import in client components
- Check OpenAI embeddings API quota
- Verify LanceDB marked external in Next.js config

## Documentation References

- **[README.md](../README.md)** - Setup, features, deployment
- **[docs/IMPLEMENTATION_GUIDE.md](../docs/IMPLEMENTATION_GUIDE.md)** - Common patterns and quick fixes
- **[docs/RAG_IMPLEMENTATION.md](../docs/RAG_IMPLEMENTATION.md)** - RAG architecture and ingestion
- **[docs/ADMIN_GUIDE.md](../docs/admin/ADMIN_GUIDE.md)** - Admin dashboard features
- **[docs/SECURITY.md](../docs/SECURITY.md)** - Security architecture
