# Plan: Create Local Development Environment File

You need a working `.env` file to run Aegis AI locally with core chat functionality, RAG/vector search, and file uploads. The plan will create a minimal but complete development configuration using your existing PostgreSQL, Redis, and OpenRouter API key.

**Key decisions:**

- Using local storage (not cloud) for file uploads
- Using LanceDB for vector database (included, no extra setup)
- Development-grade security settings (simplified for local dev)
- Docker Compose can provide PostgreSQL & Redis if needed

## Steps

### 1. Verify existing template and validation

- Check `.env.example` file contents
- Review validation schema in `src/lib/env.ts` to understand required format and constraints

### 2. Generate secure secrets for development

- Create JWT access secret (32+ chars): `openssl rand -base64 32`
- Create JWT refresh secret (32+ chars): `openssl rand -base64 32`
- Create encryption key (32 hex chars): `openssl rand -hex 16`
- Create audit signing key (32+ chars, optional but recommended): `openssl rand -base64 32`

### 3. Create `.env` file in workspace root

Include these sections:

- **Database & Cache**: `DATABASE_URL` (PostgreSQL connection string), `REDIS_URL` (Redis connection)
- **Security**: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, optional `AUDIT_SIGNING_KEY`
- **AI Configuration**: `OPENROUTER_API_KEY` (your existing key), `LLM_MODEL` (default: `openai/gpt-4o-mini`)
- **Application Config**: `NODE_ENV=development`, `APP_ENV=development`, `SITE_URL=http://localhost:3000`, `SITE_NAME=Aegis AI`
- **RAG Settings**: `ENABLE_RAG=true`, `RAG_TOP_K=5`, `RAG_CHUNK_SIZE=1000`, `RAG_CHUNK_OVERLAP=200`, `RAG_RERANK_ENABLED=true`, `EMBEDDING_MODEL=text-embedding-3-small`, `VECTOR_DB_PROVIDER=lancedb`
- **File Uploads**: `ENABLE_FILE_UPLOAD=true`, `STORAGE_TYPE=local`, `STORAGE_PATH=uploads`, `UPLOAD_DIR=./uploads`, `MAX_FILE_SIZE=52428800` (50MB)
- **Feature Flags**: `ENABLE_ENCRYPTION=true`, `ENABLE_IMAGE_OCR=true`, `ENABLE_BATCH_PROCESSING=true`
- **Queue Configuration**: `QUEUE_NAME=chat-queue`, `MAX_UPLOADS_PER_MINUTE=20`
- **Logging**: `LOG_LEVEL=info`, `LOG_FORMAT=json`
- **Chat Defaults**: `MAX_TOKENS=2000`, `CHAT_HISTORY_LIMIT=10`
- **Admin Credentials**: `ADMIN_EMAIL=admin@localhost`, `ADMIN_PASSWORD=dev_password_change_me` (for seeding admin user)

### 4. Optional: Use Docker Compose for services

If PostgreSQL/Redis not installed locally:

- Review `docker-compose.yml` configuration
- Set Docker-specific variables: `DB_USER=postgres`, `DB_PASSWORD=postgres`, `DB_NAME=aegis_ai`, `REDIS_PASSWORD=` (empty for dev)
- Run `docker-compose up -d postgres redis` to start services
- Update `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aegis_ai` and `REDIS_URL=redis://localhost:6379`

### 5. Create upload directory

- Run command: `mkdir uploads` (or `New-Item -ItemType Directory -Path uploads` on Windows)
- Ensure it's writable

### 6. Create data directory for LanceDB

- Run command: `mkdir -p data/lancedb` (or `New-Item -ItemType Directory -Path data/lancedb -Force` on Windows)
- This is where vector embeddings will be stored

## Verification

After creating the `.env` file:

1. **Validate environment variables**: Run `npm run dev` - it will validate all variables on startup via `src/lib/env.ts`
2. **Check database connection**: Run `npm run migrate` to apply Prisma migrations (creates tables)
3. **Verify Redis**: Connection test happens on app startup
4. **Check OpenRouter API**: Visit logs when sending first chat message
5. **Test file upload**: Try uploading a document via UI to verify `uploads/` directory works
6. **Test RAG**: Upload a document and ask questions about it to verify vector search
7. **Expected success**: No validation errors, migrations complete, app starts on `http://localhost:3000`

## Decisions

- **Local storage over cloud**: Simpler for development, no AWS/Azure setup needed
- **LanceDB over pgvector**: Included in project, zero-config vector database
- **Development security**: Using generated secrets (not production-grade key management)
- **Minimal required variables only**: Excludes MCP, mobile, cloud storage, external services not needed for core functionality
