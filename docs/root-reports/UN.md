# Aegis AI Implementation Summary (No DB Access Required)

This document summarizes the implementation as visible in the repository files only. It is intended for reviewers who do not have database access. If something is not implemented, it is labeled as **NOT IMPLEMENTED**.

## 1) Architecture & Structure

- **Folder layout**: See root structure and documented overview in `MONOREPO_STRUCTURE.md`.
- **API routes**: `apps/web/src/app/api/**/route.ts`.
- **Workers**: `apps/web/src/workers/*.ts`.
- **Queues**: Initialized in `apps/web/src/lib/queue.ts`.
- **API vs worker separation**: Partially separated. `/api/chat/stream` enqueues jobs to workers, but `/api/chat/stream-sse` processes inline.
- **Redis configuration**: `apps/web/src/lib/queue.ts` and `apps/web/src/lib/rate-limit.ts`.
- **Database connection**: `apps/web/src/lib/prisma.ts`.
- **Env validation**: `apps/web/src/lib/env.ts` (Zod schema) + worker startup checks in `apps/web/src/workers/chat.worker.ts`.
- **Central config**: Env config is centralized in `apps/web/src/lib/env.ts`. RAG config is separate in `apps/web/src/services/rag/config.ts`. No single unified config registry.
- **DI / service layer**: No DI container (**NOT IMPLEMENTED**). Service-layer separation exists under `apps/web/src/services`.

## 2) Authentication & Security

- **JWT generation/verification**: `apps/web/src/services/auth/auth.ts`.
- **Refresh token rotation**: Implemented. Rotation logic in `apps/web/src/app/api/auth/refresh/route.ts` and helpers in `apps/web/src/services/auth/session.ts`.
- **Roles**: Defined in `prisma/schema.prisma` (`Role` enum). Permission matrix in `apps/web/src/services/auth/permissions.ts`.
- **RBAC enforcement**: Middleware checks for admin UI and API routes; API routes enforce permissions (e.g., admin routes use `hasAdminPermission`).
- **Password hashing**: `bcrypt` with 14 rounds in `apps/web/src/services/auth/auth.ts`.
- **Encryption**: AES-256-GCM in `apps/web/src/lib/encryption.ts`.
- **API protection**: Middleware gates `/api/chat`, `/api/files`, `/api/admin` in `apps/web/middleware.ts` + explicit `verifyAuth` in routes.
- **Rate limiting**: Redis-based limiter in `apps/web/src/lib/rate-limit.ts`.
- **Security headers**: Configured in `apps/web/next.config.js`.

## 3) AI Pipeline

- **OpenRouter client**: `apps/web/src/services/ai/openai.ts` (OpenAI SDK with OpenRouter base URL).
- **Model selection**: Hard-coded (e.g., `openai/gpt-4o-mini`) in worker and services. Per-request model choice is **NOT IMPLEMENTED**.
- **Streaming**: SSE in `apps/web/src/app/api/chat/stream-sse/route.ts`.
- **Token counting**: OpenAI usage data in worker; RAG uses char/4 estimate.
- **Token budget enforcement**: `apps/web/src/services/billing/token-budget.ts` with checks in worker.
- **Fallback logic**: No model failover (**NOT IMPLEMENTED**). Error handling returns user-facing errors.
- **Retry logic**: OpenAI client `maxRetries: 2` in `apps/web/src/services/ai/openai.ts`; embeddings have explicit retry/backoff in `apps/web/src/services/rag/embeddings.ts`.
- **Context truncation**: Message history limited to 50. `enforceTokenLimit` exists but is not wired into the pipeline (**NOT IMPLEMENTED** in practice).
- **System prompts**: Central prompt builder in `apps/web/src/services/ai/prompt.ts`, but SSE builds its own prompt inline (partial centralization).

## 4) RAG System

- **LanceDB config**: `apps/web/src/lib/vector-store-server.ts` and provider in `apps/web/src/lib/vector-providers/lancedb-provider.ts`.
- **Embeddings generation**: `apps/web/src/services/rag/embeddings.ts`.
- **Embedding model**: Selected via `EMBEDDING_MODEL` in `apps/web/src/lib/env.ts`, mapped in `apps/web/src/services/rag/embeddings.ts`.
- **Chunking**: `apps/web/src/services/rag/chunker.ts` and `apps/web/src/services/rag/document-chunker.ts`.
- **Chunk size configurable**: Yes, via `apps/web/src/services/rag/config.ts` and `apps/web/src/services/rag/rag-config.ts`.
- **RAG skip for casual chat**: `shouldUseRAG` in `apps/web/src/services/rag/rag-retrieval.ts` (used by worker; SSE does not use it).
- **Context sanitization**: Worker sanitizes in `apps/web/src/workers/processor.ts`; SSE does not sanitize.
- **Top-K selection**: `topK` from `apps/web/src/services/rag/rag-retrieval.ts`.
- **Similarity threshold**: Configured in `apps/web/src/services/rag/rag-config.ts`, but not enforced in retrieval (**NOT IMPLEMENTED** in retrieval logic).
- **Vector index persistence**: LanceDB uses `data/lancedb` directory; pgvector uses Postgres.

## 5) Workers & Queues

- **Queues**: `chat-queue` (env `QUEUE_NAME`), `rag-queue`, `dlq-queue` in `apps/web/src/lib/queue.ts`.
- **Workers instantiated**: `apps/web/src/workers/chat.worker.ts`, `rag.worker.ts`, `websocket.worker.ts`, `ai.worker.ts`.
- **Concurrency**: Not configured explicitly (**NOT IMPLEMENTED**).
- **Backoff/retry**: Default job options in `apps/web/src/lib/queue.ts`.
- **Dead-letter queue**: Implemented via `dlqQueue` and used in worker failure handlers.
- **Cleanup worker**: Implemented in `apps/web/src/workers/cleanup.ts` and started by chat worker.
- **Job failures logged**: `logger.error` in worker `failed` events.
- **Idempotency**: Chat jobs dedupe by jobId in `apps/web/src/app/api/chat/stream/route.ts`; RAG jobs do not.
- **Job timeout**: **NOT IMPLEMENTED**.

## 6) Database & Prisma

- **Schema**: Full schema in `prisma/schema.prisma`.
- **Soft delete models**: `Chat`, `File`, `Message`, `GeneratedImage`, `ImageFile` (have `deletedAt`).
- **Indexes**: Extensive `@@index` usage across models.
- **Foreign keys**: Prisma relations with `@relation` used throughout.
- **Cascade delete**: `onDelete: Cascade` on many relations.
- **Transactions**: Used in API routes (chat delete, refresh, delete account).
- **Audit logging**: `apps/web/src/lib/audit.ts` writes `AuditLog` in Prisma.
- **Request ID stored**: **NOT IMPLEMENTED** (no requestId column).
- **Query optimization**: Limited to Prisma-level usage (no explicit query plan tuning).
- **Connection pooling**: **NOT IMPLEMENTED** in Prisma client instantiation (relies on DB URL parameters).

## 7) Logging & Monitoring

- **Structured logging**: JSON logs in `apps/web/src/lib/logger.ts`.
- **Logging library**: Custom logger wrapper (no external library).
- **Log categories**: `logger.auth`, `logger.security`, `logger.worker`, `logger.db`, etc.
- **Request correlation**: `x-request-id` set in `apps/web/middleware.ts` and used in worker logs.
- **Health check**: `/api/health` in `apps/web/src/app/api/health/route.ts`.
- **Uptime monitoring**: **NOT IMPLEMENTED** (no external integration).
- **Error standardization**: Response helpers in `apps/web/src/lib/response.ts`.
- **Central error handler**: Exists in `apps/web/src/lib/error-handler.ts` but not used by routes (**NOT IMPLEMENTED** in practice).
- **Unhandled rejections**: **NOT IMPLEMENTED** (no process handlers found).

## 8) Testing & Validation

- **Unit tests**: `apps/web/src/__tests__/**`.
- **Integration test**: `apps/web/src/__tests__/study-hub.integration.test.ts`.
- **Input validation**: Zod via `apps/web/src/lib/request-validation.ts` and `apps/web/src/lib/validations.ts`.
- **File upload validation**: Extension allowlist, magic bytes, size limits in `apps/web/src/app/api/files/upload/route.ts`.
- **MIME checks**: Magic bytes + extension-based validation in upload route.
- **Size limits**: `MAX_FILE_SIZE` in `apps/web/src/lib/env.ts` enforced in upload routes.
- **Rate limit tests**: **NOT IMPLEMENTED** (no tests found).
- **Error path tests**: **NOT IMPLEMENTED** (no explicit error-path test coverage found).

## 9) Deployment & DevOps

- **Dockerfile**: Multi-stage build in `infra/docker/Dockerfile`.
- **Docker Compose**: `infra/docker/docker-compose.yml` with Postgres, Redis, app, healthchecks.
- **CI/CD**: GitHub Actions workflows in `.github/workflows/*.yml` (tests, lint, build, security, docker).
- **Env configs separated**: Partially via `NODE_ENV` and `APP_ENV` in `apps/web/src/lib/env.ts`.
- **Staging separate**: Web staging config **NOT IMPLEMENTED**; mobile has staging in `apps/mobile/eas.json`.
- **Secrets management**: Env + KMS key usage in `apps/web/src/lib/encryption.ts` and `apps/web/src/lib/env.ts`.
- **Backup strategy**: **NOT IMPLEMENTED** in code.
- **Migration strategy**: Prisma migrations in Docker CMD and CI workflow.
- **Build optimization**: Standard `next build`.
- **Mobile EAS config**: `apps/mobile/eas.json`.

## 10) Code Quality & Maintainability

- **Modularity**: Services and libs separated under `apps/web/src/services` and `apps/web/src/lib`.
- **Duplication**: Model name strings are duplicated across services (no centralized model config).
- **Business logic separation**: Partial; SSE route embeds AI pipeline logic instead of using worker pipeline.
- **Service reuse**: Many helpers are reusable (`tokenBudgetManager`, RAG helpers, logger).
- **Tight coupling**: Hard-coded model IDs and duplicated RAG logic between worker and SSE.
- **Type enforcement**: TypeScript used, but some `any` usage indicates partial strictness.
- **ESLint**: Root config in `config/eslint.config.mjs`.
- **Documentation**: Present in code comments and docs, but not uniform.

## Top 5 Architectural Weaknesses (Evidence-Based)

1. **Partial API/worker split**: `/api/chat/stream-sse` bypasses worker safety/budget logic.
2. **No centralized model configuration**: Model IDs hard-coded across multiple files.
3. **Similarity threshold defined but unused**: RAG retrieval does not enforce configured threshold.
4. **Refresh token flow mismatch**: `rotateTokens` in session service does not validate the specific refresh token hash; the refresh route does.
5. **Central error handler unused**: Error handler exists but is not applied to routes; no global rejection handlers.

---

If you want this document tailored to a specific audience (e.g., external audit, customer-facing, or engineering onboarding), tell me the target audience and I will adjust the language and depth.

## Model Mapping Guidance

This section records the requested model-to-task mapping for development workflows.

### Functional Layers

- Thinking
- Building
- Fixing
- Auditing

### System Thinking (Architecture / Refactor / Design)

- Model: Claude Sonnet 4.5
- Use for: new module design, SSE to worker unification planning, model routing logic design, security architecture, queue design changes, RAG threshold enforcement design, fallback strategy planning, tradeoff evaluation
- Avoid: using Codex for high-level architecture planning

### Heavy Implementation (Multi-file Coding)

- Model: GPT-5.1-Codex (primary)
- Use for: writing new worker logic, rewriting API routes, implementing fallback logic, centralized model config, timeout and queue options, refactoring duplicated RAG logic, complex auth flow changes
- Large context: GPT-5.2-Codex only when necessary

### Debugging (Async / Prisma / Redis / Streaming)

- Model: GPT-4o
- Use for: stack traces, Redis errors, Prisma relation issues, streaming SSE bugs, queue job failures, BullMQ misconfig

### Small Fixes / Quick Questions

- Model: Claude Haiku 4.5
- Use for: explaining a function, rewriting a small block, optimizing a small query, quick validation question, minor TypeScript fix

### Security Review / Crypto / JWT

- Model: Claude Sonnet 4.5
- Use for: JWT flow validation, refresh token logic, RBAC audit, encryption validation, input validation review, attack surface analysis

### Performance Optimization

- Strategy: Claude Sonnet 4.5
- Code changes: GPT-5.1-Codex
- Example: Codex to optimize Prisma query; Sonnet to redesign caching architecture

### Test Writing

- Model: GPT-5.1-Codex
- Use for: unit tests, integration tests, edge case coverage

### Decision Table

| Task                    | Model             |
| ----------------------- | ----------------- |
| Architecture planning   | Claude Sonnet 4.5 |
| Major refactor          | GPT-5.1-Codex     |
| Complex implementation  | GPT-5.1-Codex     |
| Debugging               | GPT-4o            |
| Small fixes             | Claude Haiku 4.5  |
| Security audit          | Claude Sonnet 4.5 |
| Performance strategy    | Claude Sonnet 4.5 |
| Performance code change | GPT-5.1-Codex     |
| Writing tests           | GPT-5.1-Codex     |
