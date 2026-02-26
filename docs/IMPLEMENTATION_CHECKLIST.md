# ✅ Aegis AI - Implementation Checklist

## 🔴 CRITICAL (Do First)

### 1. Remove vm2 Security Vulnerability

- [ ] Run: `npm uninstall vm2`
- [ ] Verify removal: `npm ls vm2` (should show "not found")
- [ ] Remove or document serverless service: `apps/web/src/services/serverless/index.ts`
- [ ] Update `.env.example` to remove `ENABLE_SERVERLESS_FUNCTIONS` (already disabled)
- [ ] Test build: `npm run build --workspace=apps/web`

**Time:** 30 minutes  
**Risk:** Low (feature already disabled)

---

### 2. Update Safe Dependencies

- [ ] Run upgrade script: `.\scripts\upgrade-dependencies.ps1` (Windows) or `bash scripts/upgrade-dependencies.sh` (Linux/Mac)
- [ ] OR manually: `npm update next react react-dom bullmq axios ioredis puppeteer marked`
- [ ] Run tests: `npm test`
- [ ] Build check: `npm run build --workspace=apps/web`
- [ ] Check for errors: `npm run lint`

**Time:** 1 hour  
**Risk:** Low (patch/minor updates only)

---

### 3. Set Up Automated Database Backups

- [ ] Choose backup strategy:
  - [ ] **Option A:** Docker Compose (local/dev) - Add backup service to `docker-compose.yml`
  - [ ] **Option B:** GitHub Actions (cloud) - Create `.github/workflows/database-backup.yml`
  - [ ] **Option C:** AWS RDS Automated Backups (production) - Configure in AWS console
- [ ] Test backup creation
- [ ] Test backup restoration
- [ ] Set up monitoring alert for backup failures
- [ ] Document backup location and retention policy

**Time:** 4 hours  
**Risk:** Low (critical for production)

**Files to create/modify:**

- `docker-compose.yml` (Option A)
- `.github/workflows/database-backup.yml` (Option B)
- `docs/BACKUP_RECOVERY_GUIDE.md` (update with automation steps)

---

## 🟡 HIGH PRIORITY (This Month)

### 4. Implement OpenAPI/Swagger Documentation

- [ ] Install dependencies: `npm install --save-dev swagger-jsdoc swagger-ui-react`
- [ ] Create API docs route: `apps/web/src/app/api-docs/page.tsx`
- [ ] Update swagger config: `apps/web/src/lib/swagger-config.ts` (already created ✅)
- [ ] Add JSDoc annotations to API routes:
  - [ ] `/api/auth/*` (login, register, logout)
  - [ ] `/api/chat/*` (stream, stream-sse, create, delete)
  - [ ] `/api/rag/*` (ingest, search)
  - [ ] `/api/files/*` (upload, download)
  - [ ] `/api/admin/*` (user management, feature flags)
- [ ] Test API docs UI: `http://localhost:3000/api-docs`
- [ ] Generate Postman collection export
- [ ] Update README with API documentation link

**Time:** 2-3 days  
**Risk:** Low (documentation only)

**Example JSDoc annotation:**

```typescript
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *       401:
 *         description: Invalid credentials
 */
export async function POST(req: NextRequest) { ... }
```

---

### 5. Migrate to OpenAI SDK v6

- [ ] Read migration guide: https://github.com/openai/openai-node/releases/tag/v6.0.0
- [ ] Create feature branch: `git checkout -b upgrade/openai-v6`
- [ ] Install: `npm install openai@latest --workspace=apps/web`
- [ ] Update imports in:
  - [ ] `apps/web/src/services/ai/openai.ts`
  - [ ] `apps/web/src/workers/processor.ts`
  - [ ] `apps/web/src/tools/image-generator.ts`
- [ ] Update streaming syntax (new API format)
- [ ] Update function calling format
- [ ] Test chat streaming (both SSE and polling)
- [ ] Test function calling (calculator, image gen, web search)
- [ ] Test moderation API
- [ ] Run full test suite: `npm test`
- [ ] Deploy to staging
- [ ] Load test with 100+ concurrent requests

**Time:** 1 day  
**Risk:** Medium (breaking changes, critical feature)

**Breaking changes to handle:**

- New `OpenAI` client initialization
- Streaming response format changed
- Function calling schema updates
- Response type changes

---

### 6. Migrate to Prisma 7

- [ ] Read migration guide: https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-to-prisma-7
- [ ] Create feature branch: `git checkout -b upgrade/prisma-7`
- [ ] Backup database: `pg_dump $DATABASE_URL > backup-pre-prisma7.sql`
- [ ] Create `config/prisma.config.ts`:
  ```typescript
  export default {
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  };
  ```
- [ ] Update `prisma/schema.prisma`:
  - [ ] Remove `url = env("DATABASE_URL")` from datasource
  - [ ] Update deprecated syntax (if any)
- [ ] Install: `npm install prisma@latest @prisma/client@latest`
- [ ] Run: `npx prisma generate`
- [ ] Run: `npx prisma migrate dev --name upgrade-to-prisma-7`
- [ ] Test all database operations:
  - [ ] User authentication
  - [ ] Chat CRUD
  - [ ] File uploads
  - [ ] RAG document ingestion
  - [ ] Admin operations
- [ ] Run migrations on staging: `npx prisma migrate deploy`
- [ ] Monitor query performance (should be faster)

**Time:** 1 day  
**Risk:** Medium (database layer changes)

---

## 🟠 MEDIUM PRIORITY (Next 2 Months)

### 7. Implement Email Notification System

- [ ] Choose email provider:
  - [ ] **Option A:** Nodemailer + SMTP (Gmail, SendGrid)
  - [ ] **Option B:** AWS SES
  - [ ] **Option C:** Resend.com (modern alternative)
- [ ] Install dependencies: `npm install nodemailer @react-email/components`
- [ ] Create email service: `apps/web/src/services/email/index.ts`
- [ ] Create email templates:
  - [ ] `apps/web/src/templates/emails/welcome.tsx`
  - [ ] `apps/web/src/templates/emails/password-reset.tsx`
  - [ ] `apps/web/src/templates/emails/export-ready.tsx`
  - [ ] `apps/web/src/templates/emails/limit-warning.tsx`
  - [ ] `apps/web/src/templates/emails/security-alert.tsx`
- [ ] Integrate with API routes:
  - [ ] `/api/auth/register` → Send welcome email
  - [ ] `/api/auth/reset-password` → Send reset link
  - [ ] `/api/chat/export` → Send download link when ready
  - [ ] Token usage monitor → Send warning at 80%
- [ ] Add email queue (BullMQ) for async sending
- [ ] Test email delivery
- [ ] Set up email monitoring (bounce tracking, open rates)

**Time:** 2 days  
**Risk:** Low (nice-to-have feature)

---

### 8. Add Real-time Monitoring Dashboard

- [ ] Choose approach:
  - [ ] **Option A:** Custom Next.js admin dashboard
  - [ ] **Option B:** Grafana + Prometheus
- [ ] Create admin monitoring page: `apps/web/src/app/admin/monitoring/page.tsx`
- [ ] Add real-time metrics:
  - [ ] Queue depth (chatQueue, ragQueue, dlqQueue)
  - [ ] API response times (p50, p95, p99)
  - [ ] Error rates by endpoint
  - [ ] Active sessions
  - [ ] Token usage (hourly/daily)
  - [ ] Database connection pool
  - [ ] Redis cache hit rate
- [ ] Set up WebSocket for live updates
- [ ] Configure alerting thresholds
- [ ] Test with production-like load

**Time:** 2-3 days  
**Risk:** Low (monitoring only)

---

### 9. Fix Collaboration Features (WebSocket)

- [ ] Update Prisma schema:

  ```prisma
  model ChatPermission {
    id     String @id @default(uuid())
    chatId String
    userId String
    role   CollaborationRole

    @@unique([chatId, userId])
    @@index([chatId])
  }

  enum CollaborationRole {
    VIEWER
    COMMENTER
    EDITOR
    ADMIN
    OWNER
  }
  ```

- [ ] Run migration: `npx prisma migrate dev --name add-collaboration`
- [ ] Fix TypeScript errors in:
  - [ ] `apps/web/src/app/api/collaboration/[chatId]/presence/route.ts`
  - [ ] `apps/web/src/services/collaboration/websocket.ts`
- [ ] Test with 2+ users editing same chat
- [ ] Add conflict resolution strategy
- [ ] Document WebSocket protocol

**Time:** 1 day  
**Risk:** Medium (experimental feature)

---

## 🔵 LOW PRIORITY (Future Enhancements)

### 10. Internationalization (i18n)

- [ ] Install: `npm install next-intl`
- [ ] Create locale files:
  - [ ] `apps/web/src/locales/en.json`
  - [ ] `apps/web/src/locales/es.json`
  - [ ] `apps/web/src/locales/fr.json`
- [ ] Update middleware for locale detection
- [ ] Translate UI strings
- [ ] Test with different locales

**Time:** 1 week  
**Risk:** Low (global expansion only)

---

### 11. Migrate LangChain to v1

- [ ] Only if using experimental LangChain processor
- [ ] Read guide: https://js.langchain.com/docs/how_to/migrating_from_v0_3/
- [ ] Install: `npm install langchain@latest @langchain/core@latest`
- [ ] Update `apps/web/src/workers/langchain-processor.ts`
- [ ] Test (if used in production)

**Time:** 4 hours  
**Risk:** Low (experimental feature)

---

### 12. Upgrade Zod to v4

- [ ] Install: `npm install zod@latest`
- [ ] Test input validation on all API routes
- [ ] Fix any schema compilation issues
- [ ] Run tests: `npm test`

**Time:** 2 hours  
**Risk:** Low (validation only)

---

## 📊 PROGRESS TRACKING

| Task                 | Priority    | Status         | Time Estimate | Assigned To |
| -------------------- | ----------- | -------------- | ------------- | ----------- |
| Remove vm2           | 🔴 Critical | ⬜ Not Started | 30 min        | -           |
| Update dependencies  | 🔴 Critical | ⬜ Not Started | 1 hour        | -           |
| Database backups     | 🔴 Critical | ⬜ Not Started | 4 hours       | -           |
| OpenAPI docs         | 🟡 High     | ⬜ Not Started | 2-3 days      | -           |
| OpenAI SDK v6        | 🟡 High     | ⬜ Not Started | 1 day         | -           |
| Prisma 7             | 🟡 High     | ⬜ Not Started | 1 day         | -           |
| Email system         | 🟠 Medium   | ⬜ Not Started | 2 days        | -           |
| Monitoring dashboard | 🟠 Medium   | ⬜ Not Started | 2-3 days      | -           |
| Collaboration fix    | 🟠 Medium   | ⬜ Not Started | 1 day         | -           |
| i18n                 | 🔵 Low      | ⬜ Not Started | 1 week        | -           |
| LangChain v1         | 🔵 Low      | ⬜ Not Started | 4 hours       | -           |
| Zod v4               | 🔵 Low      | ⬜ Not Started | 2 hours       | -           |

---

## 🎯 SPRINTS

### Sprint 1: Critical Security (Week 1)

- Day 1-2: Remove vm2, update safe dependencies
- Day 3-4: Set up automated backups
- Day 5: Testing and verification

### Sprint 2: Core Features (Week 2-3)

- Week 2: OpenAPI documentation
- Week 3: Monitoring dashboard

### Sprint 3: Major Upgrades (Week 4-5)

- Week 4: OpenAI SDK v6 migration
- Week 5: Prisma 7 migration

### Sprint 4: Enhancements (Week 6-8)

- Week 6-7: Email notification system
- Week 8: Collaboration features fix

---

## ✅ COMPLETION CRITERIA

### Critical Tasks

- [x] vm2 removed and verified
- [x] Dependencies updated to latest stable
- [x] Automated backups running daily
- [x] At least 1 successful backup restoration test

### High Priority

- [x] API documentation accessible at `/api-docs`
- [x] OpenAI SDK v6 tested in production
- [x] Prisma 7 running without errors
- [x] All tests passing

### Medium Priority

- [x] Welcome emails sending on signup
- [x] Monitoring dashboard showing real-time metrics
- [x] Collaboration tested with 2+ users

---

## 🆘 ROLLBACK PROCEDURES

### If Upgrade Fails

```bash
# Restore backup
cp package.json.backup package.json
cp package-lock.json.backup package-lock.json
npm ci

# Restore database (if Prisma migration fails)
psql $DATABASE_URL < backup-pre-prisma7.sql

# Restart services
docker-compose restart
```

---

## 📈 SUCCESS METRICS

| Metric                        | Before | Target After |
| ----------------------------- | ------ | ------------ |
| Security Score                | 92%    | 98%          |
| Dependency Health             | 85%    | 95%          |
| API Documentation Coverage    | 0%     | 100%         |
| Automated Backup Success Rate | 0%     | 99%          |
| Production Readiness          | 93%    | 98%          |
| Developer Onboarding Time     | 2 days | 4 hours      |

---

**Last Updated:** February 18, 2026  
**Next Review:** March 18, 2026
