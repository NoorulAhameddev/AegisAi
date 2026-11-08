# Initial Repository Audit: Aegis AI Platform (Deliverable 1)

**Audit Date**: 2026-11-07  
**Status**: Completed  
**Head Commit**: `3936ba40129c16b07c9b91a1bb35a7df0f390f7a` (`fix(dashboard): eliminate subprocess spawn in security-check to resolve Turbopack build failure`)  
**Auditors**: Principal Architect, Security & Backend Engineer, DevOps & QA Engineer  

---

## 1. Executive Summary

A comprehensive multi-agent survey and baseline audit of the Aegis AI codebase was performed across three specialized tracks: System Architecture & Chat Execution (Explorer 1), Security, Auth & Environment (Explorer 2), and CI/CD & Testing Infrastructure (Explorer 3).

The audit confirms that while Aegis AI features modern architectural components (Next.js 16, Prisma ORM, BullMQ job queues, AES-256-GCM encryption, Sentry APM, rate limiting), the codebase currently exhibits **critical vulnerabilities, fail-open pipeline configurations, and architectural inconsistencies** that preclude safe production deployment:
1. **CI/CD Enforcement (Fail-Open)**: Test failures (`continue-on-error: true`), high/critical dependency CVEs (`npm audit || true`), and hardcoded secrets (non-blocking Gitleaks) are systematically ignored in GitHub Actions.
2. **Environment & Secrets Hardening**: Production security checks can be completely bypassed via `SKIP_PROD_VALIDATION=1` or when `APP_ENV` is omitted. Default development secrets (`dev-access-secret-min-32-chars-long!`) are active in production configurations.
3. **Authentication & Session Concurrency**: Refresh token rotation suffers from a race condition where concurrent requests cause false-positive reuse detection and wipe out all user sessions (`deleteMany`). Banned user and token revocation checks are bypassed on cache misses.
4. **Chat Execution Architecture**: Confirmed an architectural inconsistency resulting from an incomplete SSE migration. The web frontend and mobile apps poll `/api/chat/status` against BullMQ queues, while `/api/chat/stream-sse` provides real-time streaming but bypasses token budget governance and RAG sanitization.
5. **Perimeter Security Vulnerabilities**: Discovered critical Server-Side Request Forgery (SSRF) in webpage ingestion and AI tools, directory traversal in batch file upload, missing `fallback_queue` database schema causing Redis fallback crashes, and host port exposure in Docker.
6. **Vulnerability Baseline**: Baseline `npm audit` reveals **126 vulnerabilities (13 critical, 53 high)** with zero documentation, exception lists, or enforcement policies.

---

## 2. Working Tree & Source Control Status

- **Working Tree**: Clean on branch `main` at commit `3936ba4`. No uncommitted user modifications or stashes.
- **Dedicated Remediation Branch**: Remediation will execute on dedicated branch `remediation/engineering-hardening` without merging directly into `main`.
- **PR #30 Analysis**: Dependabot PR bumping 91 dependencies (+21,555 / -18,708 lockfile lines). Modifying major dependencies simultaneously with security fixes introduces extreme regression risk; PR #30 must be isolated.
- **PR #25 Analysis**: Diverged at `c212da9` with 50+ commits attempting Expo SDK 58 migration. Contains extensive lockfile churn and broken workflow artifacts. Valuable security fixes (SSRF validation, trusted proxy hop indexing) will be ported cleanly rather than cherry-picked wholesale.

---

## 3. Detailed Audit Findings by Requirement Domain

### 3.1 CI/CD & Pipeline Enforcement (R2 - P0)

| Finding ID | File & Line | Severity | Root Cause | Impact |
|---|---|---|---|---|
| SEC-CI-01 | `.github/workflows/ci.yml:132` | Critical | `continue-on-error: true` on `npm run test:coverage` | Failing unit/coverage tests do not block CI merge |
| SEC-CI-02 | `.github/workflows/tests.yml:59` | Critical | `continue-on-error: true` on `npm test` | Regression test failures are ignored |
| SEC-CI-03 | `.github/workflows/security.yml:40` | Critical | `npm audit --audit-level=high \|\| true` | Known high/critical CVEs never block pipeline |
| SEC-CI-04 | `.github/workflows/security.yml:43` | Critical | `continue-on-error: true` with `--staged --no-git` | Gitleaks secret scanner is non-blocking and ignores committed files |
| SEC-CI-05 | Across `.github/workflows/` | Medium | Node.js version fragmentation (18 in prisma, 20 in CI, 22 in security) | Subtle runtime differences pass in CI but fail in other environments |
| SEC-CI-06 | `.github/workflows/` (6 files) | Low | `actions/setup-node@v7` referenced (non-existent/unofficial) | Inconsistent runner action references |
| SEC-CI-07 | `ci.yml` vs `tests.yml` vs `lint.yml` | Medium | Duplicate workflow runs on `main` targeting different DBs (`aegis_ai_test` vs `aegis_test`) | Resource waste and divergent test results |
| SEC-CI-08 | `.github/workflows/ci.yml:131, 202` | High | `SKIP_PROD_VALIDATION: "1"` set in CI | Production environment validation is never tested |
| SEC-CI-09 | `.github/workflows/deploy.yml:31-35` | High | `npm run test` executes with `DIRECT_URL` but lacks Postgres/Redis service containers | Deploy workflow fails or depends on external DB |
| SEC-CI-10 | `.github/workflows/docker.yml:46` | Medium | Hardcoded `push: false` | Container images are built but never published |

### 3.2 Production Environment Configuration Hardening (R3 - P0)

| Finding ID | File & Line | Severity | Root Cause | Impact |
|---|---|---|---|---|
| SEC-ENV-01 | `apps/web/src/lib/env.ts:135-137` | Critical | `SKIP_PROD_VALIDATION === '1'` warning bypass | Production runtime security validation can be completely bypassed via env var |
| SEC-ENV-02 | `apps/web/src/lib/env.ts:9, 137` | Critical | `APP_ENV` defaults to `"development"` while `NODE_ENV` is `"production"` | Cloud providers setting `NODE_ENV=production` run with development security checks disabled |
| SEC-ENV-03 | `apps/web/src/lib/env.ts:25-26, 57-59` | Critical | Default fallback strings for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `AUDIT_SIGNING_KEY` | Predictable secrets active in production if omitted |
| SEC-ENV-04 | `apps/web/src/lib/secrets.ts:38-51` | High | Unconditional AWS KMS instantiation without checking `SECRET_PROVIDER === 'local'` | Workers and services crash when running in non-AWS/local environments |
| SEC-ENV-05 | `apps/web/src/lib/prisma.ts:56-62` | Medium | `SKIP_PROD_VALIDATION !== '1'` guard in database connection | Database pool security controls bypassed |
| SEC-ENV-06 | `apps/web/instrumentation.ts:10-17` | Medium | `setupGlobalErrorHandlers` bypassed if `SKIP_PROD_VALIDATION === '1'` | Unhandled exceptions and crash telemetry disabled |

### 3.3 Refresh-Token Rotation & Session Concurrency (R4 - P0)

| Finding ID | File & Line | Severity | Root Cause | Impact |
|---|---|---|---|---|
| SEC-AUTH-01 | `apps/web/src/app/api/auth/refresh/route.ts:71-85` | Critical | `createSession` executed outside `$transaction` before deleting old session | Concurrent refresh requests create duplicate sessions |
| SEC-AUTH-02 | `apps/web/src/app/api/auth/refresh/route.ts:37-44` | Critical | Missing old session immediately triggers `prisma.session.deleteMany` | Race condition in concurrent tabs triggers false-positive reuse detection, revoking all user sessions |
| SEC-AUTH-03 | `apps/web/src/services/auth/session.ts:84-137` | High | `rotateTokens()` function unintegrated in `refresh/route.ts`; lacks `isBanned` and `tokenVersion` checks | Inconsistent session rotation logic across codebase |
| SEC-AUTH-04 | `apps/web/src/app/api/admin/users/[id]/ban/route.ts:70-76` | High | Ban route increments `tokenVersion` but fails to delete DB sessions or invalidate Redis cache | Banned users remain authenticated until JWT expires or cache evicts |
| SEC-AUTH-05 | `apps/web/middleware.ts:181-201` | High | When Redis cache misses (`cachedVersion === null`), version check is bypassed; `isBanned` never checked | Middleware fails open on Redis outage |
| SEC-AUTH-06 | `prisma/schema.prisma:222-236` | Medium | `Session` model lacks `familyId`, `replacedAt`, or grace period tracking | Cannot reliably distinguish concurrent refresh from malicious replay |

### 3.4 Chat Execution Architecture Reconciliation (R5 - P1)

| Finding ID | File & Line | Severity | Root Cause | Impact |
|---|---|---|---|---|
| ARCH-CHAT-01 | `apps/web/src/app/api/chat/stream/route.ts:139-143` vs `ChatClient.tsx:282-348` | High | Incomplete migration: `/api/chat/stream` enqueues to BullMQ while frontend polls `/api/chat/status` in 1s loop | High latency, artificial polling bottlenecks, degraded user experience |
| ARCH-CHAT-02 | `apps/web/src/app/api/chat/stream-sse/route.ts:174-376` | High | Direct SSE route provides streaming but omits token budgeting, usage metrics, and RAG sanitization | Cost overrun risk, prompt injection bypass through RAG, unmetered usage |
| ARCH-CHAT-03 | `apps/web/src/__tests__/api.chat.streaming.test.ts` | Medium | Zero tests exist for `/api/chat/stream-sse`; existing test uses tautological `expect(true).toBe(true)` | Critical SSE streaming path has zero regression safety |

### 3.5 Security Auditing & Defensive Hardening (R6 - P0/P1)

| Finding ID | File & Line | Severity | Root Cause | Impact |
|---|---|---|---|---|
| SEC-VULN-01 | `apps/web/src/services/ingestion/ingestion.service.ts:483` | Critical | Unrestricted `axios.get(url)` in webpage ingestion | SSRF: Attacker can read internal cloud metadata (169.254.169.254) and private VPC services |
| SEC-VULN-02 | `apps/web/src/ai/tools/web-browser.ts:35` | Critical | Unrestricted HTTP fetching in AI tool | SSRF: AI agent can be coerced via prompt injection to access internal endpoints |
| SEC-VULN-03 | `apps/web/src/app/api/files/batch-upload/route.ts:73` | High | `path.join(uploadsDir, \`temp-${Date.now()}-${file.name}\`)` with unsanitized filename | Path traversal: Uploaded files with `../../` write outside designated directory |
| SEC-VULN-04 | `apps/web/src/lib/fallback-queue.ts:39-43` | Critical | Raw SQL executes against table `fallback_queue` which is absent from Prisma schema & DB | Database error during Redis outage; application crashes instead of gracefully buffering jobs |
| SEC-VULN-05 | `apps/web/src/lib/vector-providers/pgvector-provider.ts:219` | High | Raw query interpolation of nested `$queryRaw` Promise | SQL query fails or executes malformed SQL |
| SEC-VULN-06 | `apps/web/src/lib/rate-limit.ts:58-60` | Medium | Trusts leftmost `x-forwarded-for` header value without proxy hop validation | Attackers can spoof client IP and bypass rate limits |
| SEC-VULN-07 | `apps/web/middleware.ts:110-118` | Medium | Excludes `/api/auth/*` from CSRF protection | `/api/auth/logout` vulnerable to CSRF forced logout |
| SEC-VULN-08 | `apps/web/src/lib/logger.ts:46` | Medium | Partial PIN/password masking (`value.substring(0, 3) + "***"`) | First 3 characters of sensitive secrets leaked into log streams |
| SEC-VULN-09 | `infra/docker/docker-compose.yml:14, 50` | Medium | Exposes Postgres `5432:5432` and Redis `6379:6379` to `0.0.0.0` on host | Internal database and cache ports accessible to network |

---

## 4. QA and Verification Baseline Assessment

1. **Vulnerability Count**: `npm audit` reveals **126 vulnerabilities (13 critical, 53 high, 48 moderate, 12 low)**.
2. **Lockfile Health**: `npm ci --dry-run` passed (resolves 2,413 packages).
3. **Workspace Script Deficiencies**:
   - Root `package.json` contains duplicate `"test"` script definitions (lines 11 and 24).
   - `apps/dashboard/package.json` lacks `"test"` and `"lint"` scripts, skipping 4 test suites.
   - `apps/web/jest.config.ts` enforces an insufficient 10% coverage threshold.
4. **Test Realism & Coverage Gaps**:
   - `apps/web/src/__tests__/setup.ts` statically mocks `@/lib/env`, preventing runtime validation tests.
   - Multiple tests contain fake assertions (e.g. `expect(jobStates).toEqual(["waiting", "active"])` on local array, `expect(true).toBe(true)`).
   - Zero tests exist for: `env.ts` validation bypass, concurrent refresh token rotation, `/api/chat/stream-sse` SSE streaming and aborts, SSRF prevention, and path traversal rejection.

---

## 5. Architectural Reconciliation Strategy (R5)

To reconcile the chat execution architecture with minimal risk and maximum reliability:
1. **Preserve Direct SSE Stream Route (`/api/chat/stream-sse`) as Primary Web Stream**:
   - Enhance `/api/chat/stream-sse` with token budget reservation, usage metric persistence, and RAG sanitization (ported from `processor.ts`).
   - Retain its robust abort signal handling, partial message persistence (`isPartial: true`), timeout guards, and backpressure buffers.
2. **Migrate Web Frontend (`ChatClient.tsx`)**:
   - Update `ChatClient.tsx` to consume `/api/chat/stream-sse` via `EventSource` / `ReadableStream`, eliminating the 1-second BullMQ status polling loop.
3. **Preserve Asynchronous BullMQ Queue (`/api/chat/stream`)**:
   - Maintain `/api/chat/stream` and `chat.worker.ts` for asynchronous background processing, scheduled jobs, and clients that prefer polling (e.g., mobile).
4. **Documentation Synchronization**:
   - Update `docs/architecture/ARCHITECTURE_DEEP_DIVE.md` and related technical specs to accurately describe this dual-mode execution model.

---

## 6. Audit Conclusion & Next Steps

This Initial Repository Audit provides the empirical foundation for the remediation campaign. The findings directly inform **Deliverable 2 (Refined Implementation Specification)** and **Deliverable 3 (Multi-Agent Execution Plan)**.

Per requirement **R1**, the team will now execute **three independent specification refinement rounds** before any source code is modified.

