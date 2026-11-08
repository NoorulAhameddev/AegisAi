# Multi-Agent Execution Plan: Aegis AI Engineering Remediation (Deliverable 3)

**Plan Date**: 2026-11-07  
**Status**: Ready for Approval  
**Target Remediation Branch**: `remediation/engineering-hardening`  
**Base Commit**: `3936ba40129c16b07c9b91a1bb35a7df0f390f7a` (`origin/main`)  

---

## 1. Remediation Team Roles & File Ownership

To maintain strict change isolation and prevent concurrent worker merge conflicts, each role is assigned exclusive write boundaries across implementation files:

| Agent Role | Archetype | Primary Responsibilities | Exclusive File Write Ownership |
|---|---|---|---|
| **Principal Architect** | `teamwork_explorer` / `teamwork_worker` | Architecture governance, R5 Chat execution reconciliation, technical documentation | `apps/web/src/app/api/chat/stream-sse/*`, `apps/web/src/app/chat/ChatClient.tsx`, `docs/architecture/*` |
| **Security Engineer** | `teamwork_worker` | R3 Environment hardening, R4 Refresh token rotation, R6 SSRF, batch upload, rate limiting, CSRF | `apps/web/src/lib/env.ts`, `apps/web/src/lib/secrets.ts`, `apps/web/src/app/api/auth/*`, `apps/web/src/services/auth/*`, `apps/web/src/services/ingestion/*`, `apps/web/src/ai/tools/*`, `apps/web/src/lib/rate-limit.ts`, `apps/web/src/lib/logger.ts`, `prisma/schema.prisma` |
| **Backend Engineer** | `teamwork_worker` | R4 Database transactions & migrations, R5 BullMQ queue preservation, R6 `fallback_queue`, pgvector SQL bug | `prisma/migrations/*`, `apps/web/src/lib/fallback-queue.ts`, `apps/web/src/lib/vector-providers/*`, `apps/web/src/workers/*` |
| **DevOps & CI/CD Engineer** | `teamwork_worker` | R2 GitHub Actions hardening, blocking Gitleaks, Node 20 alignment, package audit policies | `.github/workflows/*.yml`, `.auditrc`, `audit-ci.json`, `package.json` (root test scripts), `infra/docker/*` |
| **QA & Testing Engineer** | `teamwork_test_writer` / `teamwork_worker` | Unit, integration, concurrency, and security regression test suites | `apps/web/src/__tests__/*`, `apps/dashboard/__tests__/*`, `jest.config.ts` |
| **Independent Critic** | `teamwork_critic` / `teamwork_reviewer` | Adversarial review, edge case challenge, regression detection | Read-only across all source code; writes `.agents/teamwork/*` |
| **Final Forensic Auditor** | `teamwork_auditor` | Independent binary-veto verification of deliverables, anti-cheating checks | Read-only across all source code; writes `.agents/teamwork/*` |

---

## 2. Milestone Execution Sequence & Dependencies

```
[M0: Survey & Initial Audit] (COMPLETED)
          │
          ▼
[M1: 3-Round Spec Refinement] (COMPLETED — APPROVED_FOR_IMPLEMENTATION)
          │
          ▼
[GATE: USER & PARENT APPROVAL] ◄── CURRENT POSITION
          │
          ▼
[M2: Branch Setup & Verification Harness]
          │
    ┌─────┴──────────────────────────────┐
    ▼                                    ▼
[M3: CI/CD & Security (R2)]       [M4: Production Env (R3)]
    │                                    │
    ▼                                    ▼
[M5: Refresh-Token Concurrency (R4)] [M6: Chat Architecture (R5)]
    │                                    │
    └─────┬──────────────────────────────┘
          ▼
[M7: Structured Security Remediation (R6)]
          │
          ▼
[M8: Final Verification, Deliverables 4–10 & Forensic Integrity Audit]
```

---

## 3. Detailed Milestone Execution Protocols

### Milestone M2: Branch Setup & Baseline Verification Harness
- **Objective**: Establish dedicated remediation branch, resolve root package script anomalies, run clean `npm ci`, and prepare mock test harnesses.
- **Workers**: DevOps Engineer, QA Engineer.
- **Actions**:
  1. Create and checkout dedicated branch: `git checkout -b remediation/engineering-hardening`.
  2. Preserve all existing user modifications (currently working tree is clean).
  3. Fix duplicate `"test"` script in root `package.json`. Add `"test"` and `"lint"` scripts to `apps/dashboard/package.json`.
  4. Execute clean `npm ci` and generate Prisma client (`npx prisma generate`).
  5. Establish baseline test harness in `apps/web/src/__tests__/setup.ts` allowing unmocked `env.ts` testing.
- **Verification Gate**: Baseline commands run and output recorded.

### Milestone M3: CI/CD & Security Enforcement Hardening (R2 - P0)
- **Objective**: Eliminate fail-open configurations across GitHub Actions workflows.
- **Workers**: DevOps and CI/CD Engineer.
- **Actions**:
  1. Remove `continue-on-error: true` in `ci.yml` (line 132) and `tests.yml` (line 59).
  2. Remove `|| true` from `security.yml` (line 40). Add explicit vulnerability policy file (`audit-ci.json` / `.auditrc`) documenting known unpatched upstream vulnerabilities.
  3. Reconfigure Gitleaks in `security.yml`: remove `continue-on-error: true`, remove `--staged` and `--no-git`, enforce blocking exit on confirmed secrets.
  4. Standardize all workflows to `node-version: 20` and `actions/setup-node@v4`.
  5. Consolidate redundant triggers and deduplicate `ci.yml` / `tests.yml`. Fix `deploy.yml` and `docker.yml`.
  6. Remove `SKIP_PROD_VALIDATION: "1"` from CI workflows.
- **Verification Gate**: Workflows validated with syntax checks, Gitleaks test, and explicit blocking verification.

### Milestone M4: Production Environment Configuration Hardening (R3 - P0)
- **Objective**: Eliminate all runtime security validation bypasses and default production secrets.
- **Workers**: Security Engineer.
- **Actions**:
  1. Refactor `apps/web/src/lib/env.ts`: completely prohibit `SKIP_PROD_VALIDATION === '1'` when `APP_ENV === 'production' || NODE_ENV === 'production'`.
  2. Decouple build-phase validation (`NEXT_PHASE === 'phase-production-build'`) using dummy fallbacks for `DATABASE_URL` to allow standalone compilation without weakening runtime security.
  3. Remove insecure development defaults for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `AUDIT_SIGNING_KEY`.
  4. Enforce strict CORS origin validation (valid HTTPS URLs, no wildcards when credentials enabled).
  5. Harmonize `apps/web/src/lib/secrets.ts` to check `SECRET_PROVIDER === 'local'` before attempting AWS KMS client instantiation.
  6. Build automated unit regression tests (`env.test.ts`) covering all invalid production configurations (AC-01 through AC-05).
- **Verification Gate**: `npm --workspace=@aegis-ai/web test -- src/__tests__/env.test.ts` passes 100%.

### Milestone M5: Refresh-Token Rotation & Session Concurrency (R4 - P0)
- **Objective**: Implement atomic, race-free single-use refresh token rotation with a 5-second grace window and strict replay detection.
- **Workers**: Security Engineer, Backend Engineer.
- **Actions**:
  1. Update `prisma/schema.prisma`: Add `familyId`, `replacedAt`, `replacedByTokenHash`, and composite indexes to `model Session`.
  2. Create backward-compatible Prisma migration.
  3. Implement `rotateSessionAtomic` in `apps/web/src/services/auth/session.ts` with atomic conditional update (`updateMany` with `replacedAt: null`).
  4. Implement 5-second rotation grace window caching new tokens in Redis (`token_rotation_cache:${oldTokenHash}`) with defensive `try/catch` and database fallback.
  5. Enforce client binding: reject requests where both IP and User-Agent mismatch (`!ipMatches && !uaMatches`), while permitting mobile network transitions.
  6. Ensure admin ban route (`ban/route.ts`) invalidates Redis cache and deletes active database sessions.
  7. Implement comprehensive concurrency and replay test suite (`auth-refresh.test.ts`) covering AC-06 through AC-10.
- **Verification Gate**: `npm --workspace=@aegis-ai/web test -- src/__tests__/auth-refresh.test.ts` passes 100%.

### Milestone M6: Chat Execution Architecture Reconciliation (R5 - P1)
- **Objective**: Finalize least-risky dual-mode execution model: harden `/api/chat/stream-sse`, migrate `ChatClient.tsx`, and preserve BullMQ `/api/chat/stream`.
- **Workers**: Principal Architect, Backend Engineer.
- **Actions**:
  1. Harden `apps/web/src/app/api/chat/stream-sse/route.ts`:
     - Add `fileId` and multi-modal image base64 injection to `bodySchema`.
     - Port token budget reservation and usage metric persistence.
     - Port RAG context sanitization and user plan quota verification (`checkQuota`).
     - Preserve client disconnect abort handling and partial message persistence (`isPartial: true`).
  2. Migrate `apps/web/src/app/chat/ChatClient.tsx` from 1-second BullMQ polling loop to direct SSE streaming via `ReadableStream` / `EventSource`.
  3. Preserve `apps/web/src/app/api/chat/stream/route.ts` and `apps/web/src/workers/chat.worker.ts` for asynchronous background jobs and mobile client compatibility.
  4. Synchronize all technical architecture documentation (`docs/architecture/*`).
  5. Implement automated test suite (`chat-sse.test.ts`) covering AC-11 through AC-14.
- **Verification Gate**: `npm --workspace=@aegis-ai/web test -- src/__tests__/chat-sse.test.ts` passes 100%.

### Milestone M7: Comprehensive Structured Security Remediation (R6 - P0/P1)
- **Objective**: Remediate perimeter vulnerabilities across SSRF, file upload path traversal, Redis fallback queue, SQL Promise bugs, and rate limiting.
- **Workers**: Security Engineer, Backend Engineer.
- **Actions**:
  1. **SSRF Defense**: Implement custom `http.Agent`/`https.Agent` with `net.isIP()` pre-connect checks and `createConnection` overrides blocking all private CIDRs, link-local metadata (169.254.169.254), and IPv4-mapped IPv6. Apply to `ingestion.service.ts` and `web-browser.ts`.
  2. **Path Traversal**: Update `apps/web/src/app/api/files/batch-upload/route.ts` to sanitize filenames via `path.basename` and enforce randomized UUID storage paths.
  3. **Fallback Queue Persistence**: Add `FallbackQueue` model to `prisma/schema.prisma` with `error String? @db.Text`, indexes on `processed_at`, and implement `heartbeatFallbackJob(jobId)`.
  4. **SQL Injection / Promise Bug**: Fix raw SQL nested Promise interpolation in `pgvector-provider.ts`.
  5. **Rate Limiting & CSRF**: Source client IP via socket address or rightmost trusted proxy hop. Enforce CSRF protection on `/api/auth/logout`.
  6. **Logging PII Masking**: Implement recursive object sanitization with 100% masking for PINs, passwords, and tokens.
  7. **Docker Port Exposure**: Bind Postgres and Redis ports to `127.0.0.1` in `docker-compose.yml`.
  8. Implement security regression tests (`security-remediation.test.ts`) covering AC-15 through AC-20.
- **Verification Gate**: `npm --workspace=@aegis-ai/web test -- src/__tests__/security-remediation.test.ts` passes 100%.

### Milestone M8: Final Integration, Deliverables 4–10 & Forensic Integrity Audit
- **Objective**: Execute end-to-end verification harness, assemble all final deliverables, and conduct independent forensic integrity audit.
- **Workers**: Principal Architect, Final Forensic Auditor, QA Engineer.
- **Actions**:
  1. Run full verification suite: `npm ci`, `npx prisma generate`, `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build:all`, `npm audit`.
  2. Compile Deliverables 4 through 10:
     - (4) Prioritized findings and remediation report
     - (5) Source code changes summary & git log
     - (6) Regression and security test suite summary
     - (7) CI/CD improvement documentation
     - (8) Updated technical documentation
     - (9) Verification results with empirical command output
     - (10) Final production-readiness assessment
  3. Dispatch Forensic Auditor (`teamwork_auditor`) for binary-veto integrity audit (anti-cheating, static analysis, runtime tracing).
- **Verification Gate**: Forensic Auditor verdict CLEAN; 100% build, test, lint, and typecheck commands pass with exit code 0.

