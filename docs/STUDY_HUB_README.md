# Study Hub - Complete System Documentation

## Overview

The **Study Hub** is a comprehensive AI-powered learning platform that transforms raw study material into structured, actionable learning resources. It's built on Aegis AI's robust backend architecture and provides a modern, intuitive web interface for students and researchers.

### Key Features
- **10 Study Tools** for content transformation
- **RAG (Retrieval Augmented Generation)** for semantic search
- **Multi-format Import** (Files, YouTube, Web, Audio, Images)
- **Multiple Export Formats** (PDF, DOCX, Markdown, JSON)
- **Project-based Organization**
- **User Settings & Preferences**
- **Production-Ready Architecture**

---

## Technology Stack

### Frontend
- **Framework**: Next.js 13+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Icons**: Lucide React
- **State Management**: React Hooks (useState)
- **HTTP Client**: Fetch API

### Backend
- **Runtime**: Node.js 20+ (LTS)
- **Framework**: Next.js API Routes
- **Language**: TypeScript
- **Database**: PostgreSQL 14+
- **Cache/Queue**: Redis 7+
- **Vector DB**: LanceDB
- **AI Provider**: OpenRouter (multiple models)
- **Encryption**: AES-256-GCM
- **Authentication**: JWT (Access + Refresh tokens)

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Deployment**: Vercel, Self-Hosted VPS, Kubernetes
- **ORM**: Prisma
- **Package Manager**: npm
- **Testing**: Jest
- **Linting**: ESLint

---

## Project Structure

```
aegis-ai/
├── src/
│   ├── app/
│   │   ├── api/                    # API endpoints
│   │   │   ├── ai/operate/        # AI operations
│   │   │   ├── files/              # File upload & processing
│   │   │   ├── notes/              # Notes CRUD & export
│   │   │   ├── projects/           # Projects management
│   │   │   ├── rag/                # RAG search & ingestion
│   │   │   ├── user/               # User profile & settings
│   │   │   └── auth/               # Authentication
│   │   ├── study/                  # Study Hub main page
│   │   └── layout.tsx              # App layout
│   ├── services/
│   │   ├── ai/                     # AI operations service
│   │   ├── auth/                   # Authentication service
│   │   ├── export/                 # Export service
│   │   ├── files/                  # File processing
│   │   ├── ingestion/              # Content ingestion
│   │   └── rag/                    # RAG implementation
│   ├── lib/
│   │   ├── encryption.ts           # AES-256-GCM encryption
│   │   ├── logger.ts               # Structured logging
│   │   ├── prisma.ts               # Prisma client
│   │   └── response.ts             # Standardized responses
│   ├── workers/
│   │   └── ai.worker.ts            # Background job processor
│   └── __tests__/                  # Test suites
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── migrations/                 # Database migrations
├── public/                         # Static assets
├── docs/                           # Documentation
├── docker-compose.yml              # Development & production setup
├── Dockerfile                      # Container image
├── .env.example                    # Environment template
├── .env.local                      # Local development config
└── package.json                    # Dependencies & scripts
```

---

## Study Tools (10 Available)

### 1. **Quick Summary** (summary-short)
- Generates 5 key bullet points
- Best for: Quick overview
- Output: Concise bullet list

### 2. **Detailed Summary** (summary-detailed)
- Comprehensive, structured summary
- Best for: Understanding main arguments
- Output: Multi-paragraph summary with structure

### 3. **Structured Notes** (structured-notes)
- Well-organized notes with headers
- Best for: Note-taking and organization
- Output: Markdown with headings and sections

### 4. **Bullet Points** (bullet-points)
- Extract and organize key points
- Best for: Quick reference
- Output: Hierarchical bullet list

### 5. **Key Concepts** (key-concepts)
- Extract and explain key ideas
- Best for: Understanding fundamentals
- Output: Concept explanations

### 6. **Definitions & Glossary** (glossary)
- Create glossary of terms
- Best for: Vocabulary building
- Output: Term definitions

### 7. **Examples** (examples)
- Generate practical examples
- Best for: Application understanding
- Output: Real-world examples

### 8. **Simplified Explanation (ELI5)** (eli5)
- Explain in simple language
- Best for: Complex topics
- Output: Easy-to-understand explanation

### 9. **Q&A Generation** (questions)
- Create question bank
- Best for: Self-testing
- Output: Multiple question types

### 10. **Rewrite Content** (rewrite)
- Transform content style
- Best for: Rephrasing and adaptation
- Output: Content in requested style

---

## Input Methods

### 1. **Text Input**
- Paste or type content directly
- Max 12,000 characters per operation
- Instant processing

### 2. **File Upload**
- Supported formats: PDF, DOCX, TXT, XLSX
- Automatic text extraction
- RAG ingestion enabled

### 3. **YouTube**
- Extract transcript
- Auto-detect language
- Process as text

### 4. **Web Page**
- Fetch and clean content
- Remove HTML/styling
- Extract main content

### 5. **Audio File**
- Transcribe using OpenAI Whisper
- Supported formats: MP3, WAV, M4A, OGG
- Process transcription

### 6. **Image (OCR)**
- Extract text from images
- Tesseract OCR engine
- Support multiple languages

### 7. **Batch Upload**
- Upload multiple files at once
- Parallel processing
- Progress tracking

---

## API Endpoints Reference

### AI Operations
```
POST /api/ai/operate
Body: { operation, text, projectId, style }
Response: { content, noteId, tokensUsed }
```

### File Upload
```
POST /api/files/batch-upload
Body: FormData with files
Response: { results, successful, total }
```

### Notes CRUD
```
GET /api/notes
POST /api/notes
PATCH /api/notes
DELETE /api/notes
POST /api/notes/export
```

### Projects
```
GET /api/projects
POST /api/projects
DELETE /api/projects
```

### RAG Search
```
POST /api/rag/search
Body: { query, limit, filters }
Response: { success, results, count }
```

### Settings
```
GET /api/user/settings
PUT /api/user/settings
DELETE /api/user/settings
```

---

## Database Schema

### Core Models
- **User**: Authentication and profile
- **Project**: Organize studies by project
- **Note**: Generated study materials
- **File**: Uploaded documents
- **Chat**: Conversation history
- **Message**: Individual messages
- **Session**: User sessions and tokens
- **Memory**: User facts and summaries
- **AuditLog**: Admin actions tracking
- **SystemSetting**: Application configuration

### Key Relationships
- User → Projects, Notes, Files, Chats, Sessions
- Project → Notes, Files, Chats
- Chat → Messages
- File → embedded in Vectorization for RAG

---

## Authentication Flow

### 1. **Registration**
```
POST /api/auth/register
Body: { email, password, name }
Response: { user, tokens }
```

### 2. **Login**
```
POST /api/auth/login
Body: { email, password }
Response: { user, accessToken, refreshToken }
```

### 3. **Token Management**
- **Access Token**: 10 minute expiry
- **Refresh Token**: 7 day expiry
- Stored in HTTP-only cookies
- Automatic refresh on expiry

### 4. **Logout**
```
POST /api/auth/logout
Response: { success: true }
```

---

## Setup & Configuration

### Prerequisites
```bash
# Check versions
node --version    # 20+
npm --version     # 10+
psql --version    # 14+
redis-cli --version  # 7+
```

### Quick Start (Development)

#### 1. Clone & Install
```bash
git clone <repo>
cd aegis-ai
npm install --legacy-peer-deps
```

#### 2. Setup Environment
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

#### 3. Database Setup
```bash
# Create database
createdb aegis_ai

# Run migrations
npm run migrate

# Optional: seed data
npm run prisma db seed
```

#### 4. Start Services

Terminal 1:
```bash
npm run dev
# Starts on http://localhost:3000
```

Terminal 2:
```bash
npm run worker
# Required for chat functionality
```

#### 5. Access Application
- Frontend: http://localhost:3000
- Database UI: http://localhost:5555 (Prisma Studio)

### Docker Setup (Production-Ready)

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# Check services
docker-compose ps

# Run migrations
docker-compose exec app npx prisma migrate deploy

# View logs
docker-compose logs -f app
```

---

## Configuration Variables

### Critical (Must Set)
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_ACCESS_SECRET` - 32+ character secret
- `JWT_REFRESH_SECRET` - 32+ character secret
- `ENCRYPTION_KEY` - 32 character hex string
- `OPENROUTER_API_KEY` - AI model access

### Important
- `NODE_ENV` - 'development' or 'production'
- `SITE_URL` - Application URL
- `SITE_NAME` - Application name

### Optional
- `MAX_FILE_SIZE` - Upload limit (default: 50MB)
- `RAG_CHUNK_SIZE` - Document chunking (default: 1000)
- `MAX_TOKENS` - LLM response limit (default: 2000)
- `LOG_LEVEL` - Logging verbosity (default: 'info')

---

## Running Tests

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:study-hub
```

### Test Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

---

## Building for Production

### Build Next.js Application
```bash
npm run build
```

### Generate Prisma Client
```bash
npx prisma generate
```

### Run Production Build Locally
```bash
npm run build
npm start
```

### Docker Build
```bash
docker-compose build --no-cache
```

---

## Deployment Options

### 1. **Vercel (Easiest)**
1. Push to GitHub
2. Connect to Vercel
3. Set environment variables
4. Deploy automatically on push

### 2. **Docker (Self-Hosted)**
1. VPS or cloud server
2. Install Docker
3. Clone repository
4. Run `docker-compose up -d`
5. Configure domain/SSL

### 3. **Kubernetes (Scale)**
Use provided Kubernetes manifests or Helm charts

### 4. **Traditional VPS**
1. Install Node.js, PostgreSQL, Redis
2. Clone repository
3. `npm install && npm run build`
4. Use PM2 or systemd for process management
5. Configure Nginx reverse proxy

---

## Monitoring & Maintenance

### Health Checks
```bash
# API health
curl http://localhost:3000/api/ping

# Database
docker-compose exec postgres psql -U postgres -d aegis_ai -c "SELECT 1"

# Redis
docker-compose exec redis redis-cli ping
```

### Backups
```bash
# Database backup
docker-compose exec postgres pg_dump -U postgres aegis_ai > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres aegis_ai < backup.sql
```

### Logs
```bash
# Real-time logs
docker-compose logs -f app

# Database logs
docker-compose logs -f postgres

# Redis logs
docker-compose logs -f redis
```

### Updates
```bash
# Pull latest code
git pull origin main

# Update dependencies
npm install

# Run migrations
npm run migrate

# Rebuild Docker
docker-compose build --no-cache
docker-compose up -d
```

---

## Troubleshooting

### Issue: "Database connection failed"
**Solution:**
- Check PostgreSQL is running
- Verify `DATABASE_URL` is correct
- Run: `psql -U postgres -d aegis_ai -c "SELECT 1"`

### Issue: "Redis connection timeout"
**Solution:**
- Check Redis is running: `redis-cli ping`
- Verify `REDIS_URL` is correct
- Check firewall port 6379

### Issue: "Worker not processing jobs"
**Solution:**
- Ensure `npm run worker` is running
- Check Redis connection
- Verify `OPENROUTER_API_KEY` is valid
- Check worker logs for errors

### Issue: "File uploads failing"
**Solution:**
- Verify `/uploads` directory exists
- Check disk space: `df -h`
- Verify `MAX_FILE_SIZE` setting
- Check file permissions

### Issue: "AI operations returning empty results"
**Solution:**
- Check `OPENROUTER_API_KEY` is valid
- Verify input text is not empty
- Check token usage limits
- Review API response in browser dev tools

For more solutions, see `docs/TROUBLESHOOTING.md`

---

## Performance Optimization

### Database
- 13+ indexes for common queries
- Connection pooling via Prisma
- Query result caching via Redis

### File Uploads
- Parallel file processing
- Automatic compression
- Chunked upload support

### Vector Store
- LanceDB for fast semantic search
- Optimized embeddings
- Batch vectorization

### Frontend
- Code splitting
- Image optimization
- Lazy loading

---

## Security Features

### Authentication
- JWT-based with refresh tokens
- HTTP-only secure cookies
- Session management
- Token versioning for instant logout

### Encryption
- AES-256-GCM at rest
- HTTPS in transit
- Key rotation support
- Encrypted file storage

### Validation
- Input sanitization
- File type validation
- Content length limits
- SQL injection prevention (Prisma ORM)

### Infrastructure
- Firewall restrictions
- Rate limiting
- CORS configuration
- Security headers (CSP, HSTS, X-Frame-Options)

---

## API Rate Limiting

Default rate limits (per user per minute):
- AI Operations: 10 requests
- File Upload: 5 requests
- RAG Search: 20 requests
- General API: 60 requests

Configurable via Redis

---

## Support & Resources

### Documentation
- `docs/DEPLOYMENT_GUIDE.md` - Detailed deployment
- `docs/RAG_IMPLEMENTATION.md` - Vector search details
- `docs/API.md` - Complete API reference (if available)
- `PRODUCTION_AUDIT_CHECKLIST.md` - Pre-launch checks

### Getting Help
- Check `docs/TROUBLESHOOTING.md`
- Review GitHub Issues
- Contact support via email
- Community discussions

---

## License

[Insert License Information]

---

## Version History

### v1.0.0 (Current)
- Complete Study Hub implementation
- 10 study tools
- RAG system
- Multi-format import/export
- Production-ready infrastructure
- Docker deployment
- Comprehensive testing

---

## Future Enhancements

### Planned Features
- [ ] Collaborative study sessions
- [ ] Spaced repetition algorithm
- [ ] Mobile app (React Native)
- [ ] Voice-based interactions
- [ ] Advanced AI models (GPT-4, Claude)
- [ ] Learning analytics dashboard
- [ ] Study group features
- [ ] Integration with learning platforms

### Performance Improvements
- [ ] Database query optimization
- [ ] Caching layer enhancement
- [ ] CDN for static files
- [ ] Edge function deployment
- [ ] Batch processing optimization

---

**Last Updated**: [Current Date]
**Maintained By**: [Team Name]
**Status**: Production Ready ✅
