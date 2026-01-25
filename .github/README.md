# GitHub Configuration

This document describes the GitHub-specific configuration for Aegis AI.

## 🔧 GitHub Features Enabled

### Repository Settings

1. **Branch Protection (main)**
   - Require pull request reviews: 1
   - Require status checks to pass
   - Require branches to be up to date
   - Require code reviews from code owners
   - Dismiss stale reviews

2. **Branch Protection (develop)**
   - Require pull request reviews: 1
   - Require status checks to pass

### Security Settings

- ✅ Dependabot alerts enabled
- ✅ Secret scanning enabled
- ✅ Push protection enabled
- ✅ Security policy configured

## 📋 Automated Workflows

### 1. **Tests** (.github/workflows/tests.yml)
- Runs on: `push` to main/develop, `pull_request`
- Runs: Unit tests with coverage upload
- Requirements: Node 20, PostgreSQL 16

### 2. **Lint & Type Check** (.github/workflows/lint.yml)
- Runs on: `push` to main/develop, `pull_request`
- Runs: ESLint, TypeScript type checking

### 3. **Security Scan** (.github/workflows/security.yml)
- Runs on: `push` to main/develop, `pull_request`, weekly schedule
- Runs: npm audit, OWASP Dependency Check

### 4. **Docker Build** (.github/workflows/docker.yml)
- Runs on: `push` to main (releases)
- Builds and pushes Docker image to registry
- Requires: Docker Hub credentials

## 👥 CODEOWNERS

File: `.github/CODEOWNERS`

Defines code ownership for automatic reviewer assignment:
- Global: @noorul-ahemed
- Frontend: @noorul-ahemed
- Backend/API: @noorul-ahemed
- Database: @noorul-ahemed
- Documentation: @noorul-ahemed

## 📝 Issue Templates

### Available Templates

1. **Bug Report** - `bug_report.yml`
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
   - Screenshots

2. **Feature Request** - `feature_request.yml`
   - Problem statement
   - Proposed solution
   - Alternative approaches
   - Additional context

3. **Security Issue** - `security.yml`
   - Note: Directs to email instead
   - For documentation post-fix

## 🔄 Pull Request Template

File: `.github/PULL_REQUEST_TEMPLATE.md`

Includes:
- Description
- Related issues
- Type of change
- Testing details
- Checklist

## 🔐 Repository Secrets

The following secrets should be configured in GitHub:

```
DOCKER_USERNAME     # Docker Hub username
DOCKER_PASSWORD     # Docker Hub password
DATABASE_URL        # Test database URL
OPENAI_API_KEY      # OpenRouter API key (if needed for tests)
```

To add secrets:
1. Go to Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add name and value
4. Click "Add secret"

## 🏷️ Labels

Recommended GitHub labels:

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements or additions to documentation
- `security` - Security vulnerability
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `question` - Further information is requested
- `blocked` - Blocked on another issue/PR
- `wontfix` - This will not be worked on
- `duplicate` - This issue or pull request already exists

## 📚 Branch Strategy

### Branching Convention

```
main/               - Production releases only
develop/            - Development / staging
feature/*           - Feature branches
bugfix/*            - Bug fix branches
hotfix/*            - Critical production fixes
docs/*              - Documentation only changes
chore/*             - Chores / dependencies
```

### Example Branches

```
feature/chat-improvements
bugfix/auth-token-expiry
hotfix/security-patch
docs/setup-guide
chore/update-dependencies
```

## ✅ Merge Strategy

- **main**: Squash and merge (one commit per feature)
- **develop**: Create merge commit (preserve history)

## 🚀 Release Process

1. Update `package.json` version
2. Update `docs/CHANGELOG.md`
3. Create tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. Docker workflow automatically builds and pushes image

## 📊 GitHub Pages

To enable GitHub Pages for documentation:

1. Go to Settings → Pages
2. Select Source: Deploy from branch
3. Branch: main
4. Folder: /docs (if available)
5. Click Save

## 🔗 Useful Links

- [Repository](https://github.com/your-org/aegis-ai)
- [Issues](https://github.com/your-org/aegis-ai/issues)
- [Pull Requests](https://github.com/your-org/aegis-ai/pulls)
- [Discussions](https://github.com/your-org/aegis-ai/discussions)
- [Security](https://github.com/your-org/aegis-ai/security)
- [Actions](https://github.com/your-org/aegis-ai/actions)

## 📖 Related Files

- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [SECURITY.md](../SECURITY.md) - Security policy
- [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) - Community guidelines

---

**Note**: Some settings require repository administrator access. Adjust based on your team's needs.

---

## 📘 Feature Coverage Matrix

Status legend: ✔️ Present • ⚠️ Partial • ❌ Missing

### 🧩 A. Input & Ingestion
- Text input: ✔️ Chat messages via API
- File upload — PDF: ✔️ Extracts text on upload
- File upload — DOCX: ⚠️ Libraries present, processor missing branch
- File upload — TXT/Markdown: ⚠️ MIME supported, extraction not implemented
- YouTube URL ingestion: ❌ No route/service
- Web page URL ingestion: ✔️ Tools to search/read (not auto-RAG)
- Audio file upload (MP3/WAV): ❌ No endpoints/transcription
- Image upload (OCR): ✔️ Tesseract OCR for images
- Batch upload (multi-file): ❌ Single-file form handled

### 🔍 B. Extraction & Preprocessing
- PDF text extraction: ✔️ Implemented
- OCR for scanned PDFs: ⚠️ Image OCR only; scanned PDFs not routed
- YouTube transcript extraction: ❌ Missing
- Audio → text transcription: ❌ Missing
- Timestamp cleaning: ❌ Missing
- Language detection: ❌ Missing
- Text normalization: ✔️ Basic whitespace normalization
- Metadata extraction: ⚠️ File/chunk metadata saved; no author/duration

### ✂️ C. Chunking & Token Management
- Fixed-size chunking: ✔️ Implemented
- Recursive/semantic chunking: ⚠️ Sentence/paragraph aware, no semantic recursion
- Overlapping chunks: ✔️ Implemented
- Token limit enforcement: ✔️ Max context + token estimate
- Chunk metadata tagging: ✔️ Indexes and char ranges
- Chunk preview/debug: ❌ Missing

### 🧠 D. Core AI Capabilities
- Summarization (short): ✔️ Bullet summary function
- Summarization (detailed): ⚠️ Achievable via prompt; no dedicated fn
- Structured notes / bullets / key concepts / glossary / examples / ELI5: ⚠️ Achievable via chat; no specific APIs
- Question answering from content: ✔️ Document-scoped QA endpoint
- Content rewriting/transformation: ⚠️ Via chat; no dedicated API

### 📚 E. RAG (Retrieval-Augmented Generation)
- Vector embeddings: ✔️ OpenAI embeddings
- Vector storage (per document): ✔️ LanceDB
- Per-user namespace isolation: ✔️ Filtered by `userId`
- Per-project namespace: ❌ Missing
- Semantic search: ✔️ API route to search
- Top-K retrieval: ✔️ Configurable
- Context-only answering: ⚠️ Enforced for file QA; general chat not strict
- Source citation in answers: ⚠️ Metadata injected into RAG context
- Document-scoped chat: ✔️ File QA
- Multi-document chat: ✔️ RAG context injection in workers

### 🗂️ F. Memory & Storage
- Save generated notes: ⚠️ `Memory` model; not auto-saved
- Save summaries: ⚠️ Summarize exists; no persistence hook
- Save chat history: ✔️ Persisted messages
- Versioning of notes: ❌ Missing
- Re-run pipeline with updated prompts: ❌ Missing
- Tagging & labeling documents: ❌ Generic metadata only
- Delete/purge data: ⚠️ File delete; RAG purge helper exists (not wired)

### 💬 G. Chat & Interaction
- Chat with uploaded document: ✔️ Present
- Chat with multiple documents: ✔️ RAG-assisted
- Follow-up question support: ✔️ History included
- Regenerate response: ❌ Missing explicit endpoint
- Streaming responses: ⚠️ Queue-based; no SSE token stream
- Prompt preview (advanced): ❌ Missing

### 🎓 H. Study / Learning
- Flashcards / Quiz (MCQ) / Question bank / Study-mode / Exam notes / Difficulty-based explanation: ❌ Missing

### 📊 I. Output & Export
- Export to PDF/Markdown/DOCX: ❌ Missing
- Copy clean text: ⚠️ Likely UI; no API
- Structured JSON export: ⚠️ Audit export JSON (notes/export missing)
- Highlight important sections: ❌ Missing

### 🎨 J. Presentation & Media
- Slide outlines / Presentations / Diagrams / Image generation / TTS: ❌ Not implemented (general image tool exists)

### ⚙️ K. System & Platform
- Pipeline registry: ❌ Missing
- Prompt versioning: ❌ Missing
- Prompt templates per task: ⚠️ System prompt builder only
- Error handling & retries: ✔️ Queue retries/backoff; try/catch
- Rate limiting: ✔️ Redis-backed rate limit
- Usage tracking: ✔️ `UsageMetric` writes in workers
- Logging & observability: ✔️ Structured logger
- Secure API key handling: ✔️ Validation in OpenAI client
- Per-user quotas: ✔️ Daily token quota check
- Background job processing: ✔️ BullMQ workers
- Caching (Redis): ⚠️ Rate limit only; no general cache

### 🔐 L. Security & Control
- User authentication: ✔️ JWT access/refresh + sessions
- Project-based isolation: ❌ Missing
- Data encryption at rest: ⚠️ Message encryption; file storage unencrypted
- Secure file storage: ⚠️ Basic uploads; no encrypted storage class
- Role-based access: ⚠️ Roles exist; route enforcement incomplete
- Audit logs: ✔️ Immutable audit trail

---

### 🔧 Recommended Next Actions
- Add DOCX/TXT/Markdown extraction in `fileProcessor`.
- Wire RAG purge into file delete flow.
- Implement YouTube/audio ingestion with transcripts.
- Add export endpoints (Markdown/PDF/DOCX) and regenerate support.
- Enforce RBAC across API routes and encrypt file storage.
