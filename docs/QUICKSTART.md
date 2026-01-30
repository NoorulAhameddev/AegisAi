# Study Hub - Quick Start Guide for Developers

Get the Study Hub running in minutes with this quick start guide.

## 5-Minute Local Setup

### 1. Install Prerequisites
```bash
# Required: Node.js 20+, PostgreSQL 14+, Redis 7+
node --version  # Should be v20.x or higher
npm --version   # Should be v10.x or higher
```

### 2. Clone & Setup
```bash
git clone <repository-url>
cd aegis-ai
npm install --legacy-peer-deps
```

### 3. Configure Environment
```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in these critical values:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/aegis_ai
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your-secret-key-min-32-characters-long-here
JWT_REFRESH_SECRET=your-secret-key-min-32-characters-long-here
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
SITE_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Setup Database
```bash
# Create database
createdb aegis_ai

# Run migrations
npm run migrate

# (Optional) Open Prisma Studio
npm run studio
```

### 5. Start Services

**Terminal 1 - Start Next.js Dev Server:**
```bash
npm run dev
```
Then open http://localhost:3000

**Terminal 2 - Start AI Worker (Required for Chat):**
```bash
npm run worker
```

## 5-Minute Docker Setup

### 1. Build & Start
```bash
docker-compose up -d
```

### 2. Run Migrations
```bash
docker-compose exec app npx prisma migrate deploy
```

### 3. Verify
```bash
# Check services running
docker-compose ps

# View logs
docker-compose logs -f app

# Test API
curl http://localhost:3000/api/ping
```

## Available Commands

### Development
```bash
npm run dev          # Start Next.js dev server
npm run worker       # Start AI worker (in separate terminal)
npm run studio       # Open Prisma Studio (database UI)
```

### Database
```bash
npm run migrate      # Run Prisma migrations
npm run db:seed      # Seed test data
npm run db:reset     # Reset database (dev only)
```

### Testing
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
npm run test:study-hub # Study Hub integration tests
```

### Build
```bash
npm run build         # Build for production
npm start            # Run production build
```

### Linting
```bash
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run format       # Format code with Prettier
```

### Docker
```bash
docker-compose up -d          # Start all services
docker-compose down           # Stop all services
docker-compose logs -f app    # View app logs
docker-compose exec app bash  # Shell into app
```

## Project Structure Walkthrough

```
src/
├── app/
│   ├── study/page.tsx         ← 🎯 Study Hub UI (what users see)
│   ├── api/
│   │   ├── ai/operate/route.ts      ← AI operations endpoint
│   │   ├── files/batch-upload/      ← File upload endpoint
│   │   ├── notes/                   ← Notes CRUD endpoints
│   │   ├── projects/                ← Projects endpoint
│   │   └── rag/search/              ← RAG search endpoint
│   └── api/user/settings/route.ts    ← Settings endpoint (NEW)
├── services/                  ← Business logic
│   ├── ai/operations.service.ts      ← AI operations logic
│   ├── ingestion/              ← File processing
│   └── rag/                    ← Vector search
├── lib/
│   ├── prisma.ts             ← Database client
│   ├── encryption.ts         ← AES-256-GCM encryption
│   └── logger.ts             ← Structured logging
└── workers/
    └── ai.worker.ts          ← Background job processor
```

## Key Features & How They Work

### Study Hub Page (`src/app/study/page.tsx`)
- 7 tabs for different functionalities
- 10 study tools for content transformation
- Integrated with all backend APIs

### AI Operations (`/api/ai/operate`)
- Processes text through OpenRouter AI models
- Supports 10 different operations (summary, notes, flashcards, etc.)
- Saves results to database as notes

### File Upload (`/api/files/batch-upload`)
- Accepts multiple files at once
- Extracts text from PDF, DOCX, TXT, XLSX
- Automatically creates vector embeddings for RAG

### RAG Search (`/api/rag/search`)
- Searches vector database for similar documents
- Returns relevant snippets with sources
- Used in "RAG Chat" tab

### Export (`/api/notes/export`)
- Converts notes to PDF, DOCX, or Markdown
- Generates downloadable files
- Includes metadata and formatting

## Testing the Application

### Manual Testing
1. Go to http://localhost:3000
2. Navigate to Study Hub
3. Try each tab:
   - Upload: Upload a PDF or text file
   - AI Operations: Generate a summary
   - RAG Chat: Search uploaded documents
   - Export: Download generated content
   - Projects: Create and manage projects
   - Settings: Adjust preferences

### API Testing with curl
```bash
# Test AI operation
curl -X POST http://localhost:3000/api/ai/operate \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "summary-short",
    "text": "Machine learning is a subset of AI..."
  }'

# Test RAG search
curl -X POST http://localhost:3000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning",
    "limit": 5
  }'
```

### Automated Testing
```bash
# Run integration tests
npm run test:study-hub

# Watch tests as you code
npm run test:watch
```

## Database Operations

### View Data in Studio
```bash
npm run studio
# Opens GUI at http://localhost:5555
```

### Access Database Directly
```bash
# psql prompt
psql -U postgres -d aegis_ai

# Useful queries:
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Note";
SELECT COUNT(*) FROM "Project";
```

### Make Changes to Schema
1. Edit `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name description`
3. Migration auto-applied

## Environment Variables Explained

### Critical (MUST SET)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_ACCESS_SECRET` - Random 32+ character string
- `JWT_REFRESH_SECRET` - Random 32+ character string
- `ENCRYPTION_KEY` - Hex string (openssl rand -hex 16)
- `OPENROUTER_API_KEY` - From https://openrouter.ai/keys

### Important
- `NODE_ENV` - 'development' or 'production'
- `SITE_URL` - Your application URL

### Optional
- `MAX_FILE_SIZE` - Upload limit (default: 50MB)
- `MAX_TOKENS` - LLM response tokens (default: 2000)
- `LOG_LEVEL` - 'info', 'warn', 'error', 'debug' (default: 'info')

## Common Issues & Quick Fixes

### "Database connection refused"
```bash
# Start PostgreSQL
brew services start postgresql  # macOS
sudo service postgresql start   # Linux
```

### "Redis connection timeout"
```bash
# Start Redis
redis-server              # Foreground
brew services start redis # macOS
sudo service redis start  # Linux
```

### "Worker not processing jobs"
Make sure you're running both:
```bash
npm run dev      # Terminal 1
npm run worker   # Terminal 2 (separate)
```

### "Port 3000 already in use"
```bash
# Kill process on port 3000
lsof -i :3000        # Find process ID
kill -9 <PID>        # Kill it
```

### "Module not found errors"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

## Architecture Overview

### Request Flow
```
User Click
    ↓
Frontend API Call
    ↓
Next.js API Route (/api/*)
    ↓
Verify Authentication
    ↓
Call Service Layer
    ↓
Database Query (Prisma)
    ↓
Return Response
    ↓
Display in UI
```

### Study Operation Flow
```
User Selects Tool + Enters Text
    ↓
Frontend calls /api/ai/operate
    ↓
Backend validates input
    ↓
Call OpenRouter AI API
    ↓
Save result as Note in database
    ↓
Return to frontend
    ↓
Display generated content
    ↓
User can export or search
```

### RAG Flow
```
User Uploads File
    ↓
File text extracted
    ↓
Vector embeddings created
    ↓
Stored in LanceDB
    ↓
User searches query
    ↓
Query vector created
    ↓
Similarity search in LanceDB
    ↓
Results ranked
    ↓
Return snippets to user
```

## File Organization by Feature

### Study Hub Frontend
- `src/app/study/page.tsx` - Main page with all tabs

### AI Operations
- `src/app/api/ai/operate/route.ts` - API endpoint
- `src/services/ai/operations.service.ts` - Business logic

### File Upload & RAG
- `src/app/api/files/batch-upload/route.ts` - Upload endpoint
- `src/services/ingestion/ingestion.service.ts` - Ingestion logic
- `src/services/rag/rag-retrieval.ts` - RAG search logic

### Notes & Export
- `src/app/api/notes/route.ts` - Notes CRUD
- `src/app/api/notes/export/route.ts` - Export endpoint
- `src/services/export/export.service.ts` - Export logic

### Projects
- `src/app/api/projects/route.ts` - Projects endpoint

### Settings (NEW)
- `src/app/api/user/settings/route.ts` - Settings endpoint

## Next Steps

1. **Start Application**: Follow "5-Minute Setup" above
2. **Explore Frontend**: Go to http://localhost:3000
3. **Try Features**: Test each tab and tool
4. **Review Code**: Study the implementation
5. **Run Tests**: Execute integration tests
6. **Deploy**: Follow deployment guide

## Learning Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **TypeScript Docs**: https://www.typescriptlang.org/docs
- **React Docs**: https://react.dev
- **PostgreSQL Docs**: https://www.postgresql.org/docs

## Getting Help

- **Stuck?** Check `TROUBLESHOOTING.md`
- **Questions?** See `STUDY_HUB_README.md`
- **Deploy?** See `docs/DEPLOYMENT_GUIDE.md`
- **Test?** See `PRODUCTION_AUDIT_CHECKLIST.md`

## Tips & Tricks

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* npm run dev
```

### Test with Real Files
```bash
# Create test file
echo "Machine learning is a subset of AI" > test.txt

# Upload via API using curl
curl -F "file-0=@test.txt" http://localhost:3000/api/files/batch-upload
```

### Monitor Database
```bash
# Watch database in real-time
watch -n 1 'psql -U postgres -d aegis_ai -c "SELECT COUNT(*) as notes FROM \"Note\"; SELECT COUNT(*) as projects FROM \"Project\";"'
```

### Performance Testing
```bash
# Load test with Apache Bench
ab -n 100 -c 10 http://localhost:3000/api/ping
```

---

**Ready to get started? Follow the 5-minute setup above and you'll be running in no time!**

For detailed information, see:
- `STUDY_HUB_README.md` - Complete documentation
- `docs/DEPLOYMENT_GUIDE.md` - Deployment instructions
- `PRODUCTION_AUDIT_CHECKLIST.md` - Pre-launch checklist
