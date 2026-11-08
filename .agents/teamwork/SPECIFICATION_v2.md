# Engineering Remediation Specification (v2)
**Project**: Aegis AI Engineering Hardening Campaign  
**Author**: Principal Architect (Specification Author — Round 2)  
**Date**: 2026-11-07  
**Status**: REFINED SPECIFICATION (Round 2 of 3) — Ready for Critic Review  
**Target Repository**: `https://github.com/NoorulAhameddev/AegisAi`  
**Base Commit**: `3936ba40129c16b07c9b91a1bb35a7df0f390f7a`  
**Supersedes**: `SPECIFICATION_v1.md`  

---

## Executive Summary

This specification establishes **Specification v2** for the comprehensive engineering remediation of the Aegis AI platform. It refines and hardens **Specification v1** by systematically resolving every vulnerability, operational hazard, and design flaw identified during the Round 1 Adversarial Review (`CRITIQUE_ROUND_1.md`).

Specification v2 addresses requirements **R1 through R6** defined in `ORIGINAL_REQUEST.md` with strict engineering rigor:
1. **Refresh-Token Rotation & Concurrency (R4)**: Eliminates poisoned token re-issuance, replaces uncoordinated reads with atomic conditional updates (`updateMany` with `replacedAt: null`), implements short-lived Redis token caching during the grace window, adds client fingerprinting to prevent cross-network token theft, and indexes `replacedByTokenHash`.
2. **Perimeter Security & SSRF Defense (R6)**: Eliminates TOCTOU DNS rebinding by introducing socket-level IP enforcement via a custom HTTP/HTTPS agent lookup hook, normalizes IPv4-mapped IPv6 and alternative encodings, and specifies an explicit, validating 3-hop redirect interceptor.
3. **Environment Hardening & Build Decoupling (R3)**: Decouples Next.js compilation (`NEXT_PHASE=phase-production-build`) from runtime production credential enforcement, preventing CI and Docker build crashes while guaranteeing non-bypassable runtime security.
4. **Persistence & Fallback Queue (R6)**: Aligns the Prisma schema model name (`FallbackQueue`) and error column (`error`) with existing raw SQL queries, adds indexes on `processed_at`, and specifies a 5-minute visibility timeout for stuck worker jobs.
5. **Chat Architecture Preservation (R5)**: Preserves multi-modal file attachment handling (`fileId`) and plan quota enforcement (`checkQuota`) on `/api/chat/stream-sse`, clarifying the dual-mode execution boundary.
6. **Cryptographic Audit Log Verification (R3/R6)**: Binds HMAC integrity hashing to the persisted record `createdAt` timestamp and specifies an exported, timing-safe verification utility.
7. **Strictly Measurable Acceptance Criteria**: Maps all acceptance criteria to explicit CLI commands, test suites, and expected exit codes.

In accordance with requirement **R1**, no application source code shall be altered until this specification completes the three-round refinement protocol.

---

## 1. Baseline Context & Working Tree Strategy

### 1.1 Baseline Tree State & Integrity
- **Current Head Commit**: `3936ba40129c16b07c9b91a1bb35a7df0f390f7a` (`fix(dashboard): eliminate subprocess spawn in security-check to resolve Turbopack build failure`).
- **Working Tree Integrity**: The working tree on `main` is completely clean. There are zero uncommitted modifications, stashes, or untracked development artifacts outside `.agents/teamwork/`.
- **User Modification Preservation**: All existing user configurations and valid operational changes committed to `main` must remain intact.

### 1.2 Dedicated Remediation Branch
- Remediation work shall never be committed directly to `main`.
- All development and implementation agents shall operate exclusively on a dedicated branch:
  ```bash
  git checkout -b remediation/engineering-hardening main
  ```
- Merges into `main` are strictly prohibited until Milestone 8 (Final Production Readiness Verification) is complete and approved.

### 1.3 Strict Isolation of PR #30 (Dependabot 91-Package Churn)
- **Status of PR #30** (`262bd54`): Proposes updating 91 packages (+21,555 / -18,708 lines in `package-lock.json`).
- **Policy**: PR #30 must be **completely isolated** from this remediation campaign.
- **Rationale**: Simultaneously upgrading 91 dependencies alongside critical security patches introduces unmanageable regression risk, invalidates audit baselines, and makes root-cause isolation impossible. Pinned security tooling (`audit-ci`) shall be added to `package.json` devDependencies independently.

### 1.4 Selective Porting Criteria for PR #25 (`fix/critical-security-patches`)
- **Status of PR #25** (`0e4bc3a`): Diverged at `c212da9` with 50+ commits attempting Expo SDK 58 migration, containing extensive lockfile churn and broken workflow artifacts.
- **Policy**: PR #25 must **never be cherry-picked wholesale**.
- **Porting Criteria**: Implementation agents may only port isolated, self-contained algorithmic logic from PR #25:
  1. *SSRF Defense Logic*: Private IP CIDR ranges, loopback rejection, and DNS pre-resolution patterns (`eda6291`, `6b1a9a0`), upgraded to socket-level agent hooks.
  2. *Trusted Proxy Hop Indexing*: Sourcing client IPs from trusted reverse proxy hops rather than untrusted leftmost `x-forwarded-for` (`ec65b4e`, `944c981`).
  3. *Multipart Upload Pre-filtering*: Rejection of oversized payloads prior to temporary disk writes (`b576dad`).
- All ported logic must be cleanly adapted, typed, and accompanied by unit regression tests.

---

## 2. Refined Architectural Resolutions (Round 2 Additions)

### 2.1 Refresh Token Concurrency, Replay Window & Lineage Tracking
- **Flaws Identified in v1**:
  1. Returning `oldRefreshToken` during the grace window overwrote the client's cookie with an already-retired token, guaranteeing a full session wipeout on the next refresh cycle.
  2. Concurrent requests in PostgreSQL `READ COMMITTED` mode experienced split-brain races, creating multiple active sessions.
  3. 15-second grace window was excessively long and lacked client IP / User-Agent validation.
  4. `replacedByTokenHash` lacked a database index, causing table scans.
- **Specification v2 Resolutions**:
  1. **Atomic Optimistic Concurrency Lock**: In `session.ts`, the rotating request must execute an atomic conditional update:
     `UPDATE "Session" SET "replacedAt" = NOW(), "replacedByTokenHash" = $newTokenHash WHERE token = $oldTokenHash AND "replacedAt" IS NULL`.
     Only the single transaction with `count === 1` mints new tokens; transactions with `count === 0` divert immediately to the grace window branch.
  2. **Short-Lived Token Pair Caching**: The winning transaction caches the newly minted `{ accessToken, refreshToken }` pair in Redis for 10 seconds under key `token_rotation_cache:${oldTokenHash}`.
  3. **Idempotent Token Return**: Concurrent requests within the grace window retrieve the newly minted active token pair from Redis and return it to the client, guaranteeing the browser cookie always holds the active, valid successor token. If Redis is down, the response returns the new `accessToken` only, explicitly omitting `auth_refresh` from `Set-Cookie` so the client's existing cookie is not poisoned.
  4. **Tightened Grace Window & Client Fingerprinting**: Grace window is reduced from 15 seconds to **10 seconds**. During this window, the incoming request's client IP and User-Agent are compared against the recorded session; if a cross-network or foreign User-Agent replay is detected, the grace window is bypassed, the entire family is immediately revoked, and `user.tokenVersion` is incremented.
  5. **Prisma Indexing**: Add `@@index([replacedByTokenHash])` to `model Session`.

### 2.2 SSRF Defense, Socket-Level Binding & Redirect Security
- **Flaws Identified in v1**:
  1. TOCTOU DNS rebinding: `validateAndResolveSafeUrl` checked DNS, but subsequent `axios.get(url)` re-resolved DNS, permitting zero-TTL DNS rebinding to internal IP targets.
  2. Incomplete CIDR list: Omitted IPv4-mapped IPv6 (`::ffff:127.0.0.1`), hex/decimal integers, and dual-stack lookup options.
  3. Redirect handling ambiguity: Disabling redirects broke standard sites, while following redirects bypassed the initial SSRF check.
- **Specification v2 Resolutions**:
  1. **Socket-Level Connection Binding**: Implement a custom Node.js `http.Agent` and `https.Agent` overriding `lookup` and `createConnection`. The lookup hook validates all resolved IPs immediately prior to socket establishment. The socket `connect` event validates `socket.remoteAddress` before any HTTP bytes are dispatched.
  2. **RFC-Compliant IP Normalization**: Normalize all IPv6 addresses, extract IPv4 payloads from `::ffff:0:0/96`, and validate every IP returned by `dns.promises.lookup(hostname, { all: true })`.
  3. **Strict 3-Hop Redirect Interceptor**: Set `maxRedirects: 0` in Axios. Wrap network requests in an explicit redirect loop (maximum 3 hops). On `301/302/303/307/308`, validate the `Location` header URL scheme (`http`/`https` only) and enforce SSRF socket-level resolution before dispatching the next hop.

### 2.3 Build-Time vs. Runtime Environment Validation Decoupling
- **Flaws Identified in v1**:
  Prohibiting `NODE_ENV=production` while `APP_ENV=development` fatally crashes `next build` in CI and local Docker builds because Next.js CLI unconditionally sets `process.env.NODE_ENV = 'production'`.
- **Specification v2 Resolutions**:
  1. **Next.js Build-Phase Decoupling**: In `apps/web/src/lib/env.ts`, inspect `process.env.NEXT_PHASE === 'phase-production-build'`. During the static compilation phase, skip runtime secret validation and allow build-time dummy/mock values.
  2. **Strict Server Runtime Validation**: When `NEXT_PHASE !== 'phase-production-build'`, enforce strict validation:
     - Runtime production is defined as: `process.env.APP_ENV === 'production' || (process.env.NODE_ENV === 'production' && process.env.APP_ENV !== 'development')`.
     - In runtime production, `SKIP_PROD_VALIDATION=1` throws an unrecoverable fatal exception.
     - In runtime production, secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `AUDIT_SIGNING_KEY`) must be >= 64 characters and cannot match development defaults.
     - In runtime production, `ALLOWED_ORIGINS` must be explicit HTTPS URLs.

### 2.4 Database Fallback Queue Alignment & Stuck Job Visibility Timeout
- **Flaws Identified in v1**:
  1. Column name mismatch: Model defined `errorMessage`, while existing raw SQL in `fallback-queue.ts` executes `UPDATE fallback_queue SET error = ${error}`.
  2. Model name mismatch: Model was named `FallbackJob`, whereas `fallback-queue.ts:235` executes `prisma.fallbackQueue.update(...)`.
  3. Missing index on `processed_at`, causing table scans during periodic cleanup.
  4. Stuck worker jobs: Jobs left in `status = 'processing'` after a worker crash remained stuck indefinitely.
- **Specification v2 Resolutions**:
  1. **Schema & Model Synchronization**: Define `model FallbackQueue` mapped to table `fallback_queue` with column `error String? @db.Text` and `processedAt DateTime? @map("processed_at")`.
  2. **Cleanup Indexing**: Add `@@index([processedAt], name: "idx_fallback_queue_processed")`.
  3. **5-Minute Visibility Timeout**: In `getNextFallbackJob`, select jobs where:
     `status = 'pending' OR (status = 'processing' AND processed_at < NOW() - INTERVAL '5 minutes')`.
     Export a dedicated worker sweep function `recoverStuckFallbackJobs()`.

### 2.5 Multi-Modal Chat Preservation & Quota Enforcement on SSE Route
- **Flaws Identified in v1**:
  1. `bodySchema.strict()` in `/api/chat/stream-sse/route.ts` rejected `fileId`, breaking multi-modal chat and file attachments.
  2. Quota check (`checkQuota`) was omitted, allowing users to bypass plan limits.
  3. Lack of clarity on AI tool execution between SSE streaming and BullMQ workers.
- **Specification v2 Resolutions**:
  1. **Schema Alignment**: Add `fileId: z.string().optional()` to `bodySchema`.
  2. **File Content Extraction**: Port file lookup and image base64 injection from `processor.ts:308-336` into `stream-sse/route.ts`, supporting OpenAI vision models (`gpt-4o-mini`).
  3. **Quota Verification**: Integrate `await checkQuota(userId)` before initiating LLM streaming; return 403 Forbidden with user-friendly error if monthly plan quota is exceeded.
  4. **Dual-Mode Execution Boundary**: Interactive direct SSE streaming provides real-time token streaming with RAG context and file attachments. Workflows requiring multi-step agent tool execution (deep web browsing, code sandbox) are routed to `/api/chat/stream` for BullMQ worker processing.

### 2.6 Cryptographic Audit Log Timestamp Binding
- **Flaws Identified in v1**:
  `generateIntegrityHash` signed an ephemeral `new Date().toISOString()`, while PostgreSQL independently populated `createdAt`. The signature could never be re-verified.
- **Specification v2 Resolutions**:
  1. Pass an explicit `createdAt: Date` into `generateIntegrityHash` and persist that exact timestamp in `prisma.auditLog.create`.
  2. Export a timing-safe verification function: `verifyAuditEntryIntegrity(entry: AuditLog, signingKey: string): boolean`.

### 2.7 Rate Limiting IP Resolution & Denial-of-Service Defense
- **Flaws Identified in v1**:
  On self-hosted Node.js servers, `req.ip` is undefined. Falling back to static `"unknown"` aggregated all unproxied clients into a single bucket, allowing a single user to trigger global DoS.
- **Specification v2 Resolutions**:
  1. Resolve client IP via socket connection address, rightmost trusted reverse proxy hop, or connection-isolated fallback.
  2. For authenticated endpoints, key rate limits by `rate_limit:user:${userId}` to eliminate shared IP limits entirely.

---

## 3. CI/CD & Pipeline Enforcement Specification (R2 - P0)

### 3.1 Elimination of Fail-Open Configurations
1. **Remove `continue-on-error: true`**:
   - `.github/workflows/ci.yml:132`: Remove `continue-on-error: true` from the `test` step `Run tests with coverage`.
   - `.github/workflows/tests.yml:59`: Remove `continue-on-error: true` from the `test` step `Run tests`.
   - Invariant: Any test failure must immediately fail the build and terminate the workflow with non-zero exit code.
2. **Remove `|| true` from Security Audits**:
   - `.github/workflows/security.yml:40`: Replace `run: npm audit --audit-level=high || true` with `npm run audit:ci`.
   - Add `"audit-ci": "^7.1.0"` to root `package.json` devDependencies.
   - Configure `audit-ci.json` whitelist with documented baselined dependencies.
3. **Blocking Gitleaks Secret Scanning**:
   - `.github/workflows/security.yml:41-47`:
     - Replace `zricethezav/gitleaks-action@v2` with `gitleaks/gitleaks-action@v2`.
     - Remove `continue-on-error: true`.
     - Remove `GITLEAKS_ARGS: '--no-git'`.
     - Remove `args: '--staged --exit-code 1'`.
     - Configure standard commit scan:
       ```yaml
       - name: Run Gitleaks Secret Scan
         uses: gitleaks/gitleaks-action@v2
         env:
           GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
       ```
     - Invariant: Plaintext secrets or API keys must immediately fail the CI check.

### 3.2 Workflow Deduplication & Trigger Harmonization
1. **Branch Trigger Standardization**:
   - Ensure workflows trigger uniformly across active development branches:
     ```yaml
     on:
       push:
         branches: [main, develop, remediation/*]
       pull_request:
         branches: [main, develop]
     ```
2. **Service Containers & Database Consistency**:
   - Standardize test database name across all workflows to `aegis_ai_test`.
   - Ensure service containers for PostgreSQL 16 (with pgvector) and Redis 7 are uniformly declared with health checks.
3. **Docker Workflow**:
   - `.github/workflows/docker.yml:46`: Make image pushing conditional on release tags and registry credentials rather than hardcoding `push: false`.

### 3.3 Node.js Version & Action Standardization
1. **Unify on Node 20 LTS**:
   - Replace conflicting Node versions (Node 18 in `prisma-dry-run.yml`, Node 22 in `security.yml`) with Node `20.x` across all 8 workflow files.
2. **Standardize GitHub Actions**:
   - Replace all invalid or non-standard `actions/setup-node@v7` references with official `actions/setup-node@v4`.
   - Configure npm cache caching (`cache: 'npm'`).

---

## 4. Production Environment Configuration Hardening Specification (R3 - P0)

### 4.1 Decoupled Build & Runtime Security Validation (`apps/web/src/lib/env.ts`)
```typescript
import { z } from "zod";

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const isRuntimeProduction =
  !isBuildPhase &&
  (process.env.APP_ENV === "production" ||
   (process.env.NODE_ENV === "production" && process.env.APP_ENV !== "development"));

// 1. Base Environment Schema
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1).refine((v) => v.startsWith("postgresql://"), {
    message: "DATABASE_URL must start with postgresql://",
  }),
  JWT_ACCESS_SECRET: z.string().min(32).default("dev-access-secret-min-32-chars-long!"),
  JWT_REFRESH_SECRET: z.string().min(32).default("dev-refresh-secret-min-32-chars-long!"),
  AUDIT_SIGNING_KEY: z.string().min(32).default("dev-only-insecure-key-replace-in-production-32chars"),
  OPENROUTER_API_KEY: z.string().min(1).default("sk-dummy-openrouter-key-for-build"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  QUEUE_NAME: z.string().min(1).default("chat-queue"),
  ALLOWED_ORIGINS: z.string().min(1).default("http://localhost:3000,http://localhost:8081"),
  SECRET_PROVIDER: z.enum(["aws-kms", "local"]).default("local"),
  ENCRYPTION_KEY: z.string().optional(),
  ENCRYPTION_KEY_CIPHERTEXT: z.string().optional(),
  AWS_REGION: z.string().optional(),
  EXTERNAL_AUDIT_URL: z.string().url().optional(),
  EXTERNAL_AUDIT_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const message = parsed.error.errors.map((e) => `- ${e.path.join(".")}: ${e.message}`).join("\n");
  throw new Error(`FATAL: Invalid environment configuration:\n${message}`);
}

// 2. Runtime Production Hardening (Bypassed during build phase)
if (isRuntimeProduction) {
  const errors: string[] = [];

  // Strictly disallow SKIP_PROD_VALIDATION in production runtime
  if (process.env.SKIP_PROD_VALIDATION === "1") {
    throw new Error(
      "CRITICAL SECURITY VIOLATION: SKIP_PROD_VALIDATION=1 is strictly prohibited in production runtime!"
    );
  }

  // Minimum 64-character entropy for production tokens
  if (parsed.data.JWT_ACCESS_SECRET.length < 64 || parsed.data.JWT_ACCESS_SECRET.includes("dev-access-secret")) {
    errors.push("FATAL: JWT_ACCESS_SECRET must be at least 64 random characters in production!");
  }
  if (parsed.data.JWT_REFRESH_SECRET.length < 64 || parsed.data.JWT_REFRESH_SECRET.includes("dev-refresh-secret")) {
    errors.push("FATAL: JWT_REFRESH_SECRET must be at least 64 random characters in production!");
  }
  if (parsed.data.AUDIT_SIGNING_KEY.length < 64 || parsed.data.AUDIT_SIGNING_KEY.includes("dev-only-insecure")) {
    errors.push("FATAL: AUDIT_SIGNING_KEY must be at least 64 random characters in production!");
  }

  // Production CORS Validation
  const origins = parsed.data.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  for (const origin of origins) {
    if (origin === "*" || origin.startsWith("http://") || origin.includes("localhost") || origin.includes("127.0.0.1")) {
      errors.push(`FATAL: Insecure CORS origin '${origin}' is disallowed in production. Must be explicit HTTPS URL.`);
    }
  }

  // Secret Provider Validation
  if (parsed.data.SECRET_PROVIDER === "aws-kms") {
    if (!parsed.data.AWS_REGION || !parsed.data.ENCRYPTION_KEY_CIPHERTEXT) {
      errors.push("FATAL: AWS_REGION and ENCRYPTION_KEY_CIPHERTEXT are required when SECRET_PROVIDER=aws-kms.");
    }
  } else if (parsed.data.SECRET_PROVIDER === "local") {
    if (!parsed.data.ENCRYPTION_KEY || parsed.data.ENCRYPTION_KEY.length < 64) {
      errors.push("FATAL: ENCRYPTION_KEY (minimum 64 hex characters) is required when SECRET_PROVIDER=local.");
    }
  }

  if (errors.length > 0) {
    throw new Error(`Production security validation failed:\n${errors.join("\n")}`);
  }
}

export const env = parsed.data;
```

---

## 5. Refresh-Token Rotation & Session Concurrency Specification (R4 - P0)

### 5.1 Prisma Schema Enhancements
Update `prisma/schema.prisma` model `Session`:
```prisma
model Session {
  id                    String    @id @default(uuid())
  userId                String
  token                 String    @unique
  familyId              String    @default(uuid())
  replacedAt            DateTime?
  replacedByTokenHash   String?
  expiresAt             DateTime
  createdAt             DateTime  @default(now())
  lastActive            DateTime  @default(now())
  userAgent             String?   @db.VarChar(500)
  ipAddress             String?   @db.VarChar(45)
  User                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
  @@index([familyId])
  @@index([expiresAt])
  @@index([replacedByTokenHash]) // CRITICAL: Indexed to prevent sequential table scans
}
```

### 5.2 Atomic Rotation & Concurrency Grace Algorithm
In `apps/web/src/services/auth/session.ts`:
```typescript
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "./auth";
import crypto from "crypto";

const ROTATION_GRACE_WINDOW_MS = 10000; // 10 seconds
const ROTATION_CACHE_TTL_SEC = 10;

export async function rotateSessionAtomic(
  oldRefreshToken: string,
  userAgent: string,
  ip: string
): Promise<{ accessToken: string; refreshToken: string; isGraceReturn?: boolean }> {
  // 1. Verify token signature and claims
  const payload = verifyRefreshToken(oldRefreshToken);
  const oldTokenHash = hashToken(oldRefreshToken);

  return await prisma.$transaction(async (tx) => {
    // 2. Fetch user state
    const user = await tx.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isBanned: true, tokenVersion: true, role: true }
    });

    if (!user) throw new AuthError("USER_NOT_FOUND", 401);
    if (user.isBanned) throw new AuthError("USER_BANNED", 403);
    if (user.tokenVersion !== payload.tokenVersion) throw new AuthError("TOKEN_VERSION_REVOKED", 401);

    // 3. ATOMIC CONDITIONAL LOCK: Attempt to claim rotation right
    const newSessionId = crypto.randomUUID();
    const newRefreshToken = signRefreshToken({
      userId: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
      tokenId: newSessionId,
    });
    const newAccessToken = signAccessToken({
      userId: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });
    const newTokenHash = hashToken(newRefreshToken);

    const updateResult = await tx.session.updateMany({
      where: {
        token: oldTokenHash,
        replacedAt: null,
      },
      data: {
        replacedAt: new Date(),
        replacedByTokenHash: newTokenHash,
      },
    });

    // 4. PATH A: This request won the rotation race
    if (updateResult.count === 1) {
      const originalSession = await tx.session.findUnique({
        where: { token: oldTokenHash },
        select: { familyId: true, expiresAt: true },
      });

      if (!originalSession || originalSession.expiresAt < new Date()) {
        throw new AuthError("SESSION_EXPIRED", 401);
      }

      // Create successor session in DB
      await tx.session.create({
        data: {
          id: newSessionId,
          userId: user.id,
          token: newTokenHash,
          familyId: originalSession.familyId,
          userAgent,
          ipAddress: ip,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Cache newly minted active token pair in Redis for grace window readers
      if (redis) {
        await redis.set(
          `token_rotation_cache:${oldTokenHash}`,
          JSON.stringify({ accessToken: newAccessToken, refreshToken: newRefreshToken }),
          "EX",
          ROTATION_CACHE_TTL_SEC
        );
      }

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    }

    // 5. PATH B: Token was already rotated (or does not exist) -> Concurrency Grace Evaluation
    const sessionRecord = await tx.session.findUnique({
      where: { token: oldTokenHash },
    });

    // If completely unknown, treat as active token reuse attack
    if (!sessionRecord) {
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.user.update({
        where: { id: user.id },
        data: { tokenVersion: { increment: 1 } },
      });
      throw new AuthError("TOKEN_REUSE_DETECTED", 401);
    }

    // Check Grace Period Window
    if (sessionRecord.replacedAt) {
      const elapsed = Date.now() - sessionRecord.replacedAt.getTime();

      if (elapsed <= ROTATION_GRACE_WINDOW_MS) {
        // Enforce Client Fingerprint / IP validation during grace window
        const ipMatches = !sessionRecord.ipAddress || sessionRecord.ipAddress === ip;
        const uaMatches = !sessionRecord.userAgent || sessionRecord.userAgent === userAgent;

        if (!ipMatches && !uaMatches) {
          // Stolen token replayed from different client during grace window
          await tx.session.deleteMany({ where: { userId: user.id } });
          await tx.user.update({
            where: { id: user.id },
            data: { tokenVersion: { increment: 1 } },
          });
          throw new AuthError("SUSPICIOUS_CROSS_NETWORK_REPLAY", 401);
        }

        // Return the active replacement token pair from Redis cache
        if (redis) {
          const cached = await redis.get(`token_rotation_cache:${oldTokenHash}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            return {
              accessToken: parsed.accessToken,
              refreshToken: parsed.refreshToken,
              isGraceReturn: true,
            };
          }
        }

        // Fallback if Redis blip: mint new access token only, preserve cookie
        return {
          accessToken: signAccessToken({
            userId: user.id,
            role: user.role,
            tokenVersion: user.tokenVersion,
          }),
          refreshToken: "", // Refresh route must NOT set cookie when empty
          isGraceReturn: true,
        };
      }

      // Replay outside grace window: Revoke family immediately
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.user.update({
        where: { id: user.id },
        data: { tokenVersion: { increment: 1 } },
      });
      throw new AuthError("TOKEN_REPLAY_EXPIRED", 401);
    }

    throw new AuthError("INVALID_SESSION_STATE", 401);
  });
}
```

### 5.3 Refresh Route Cookie Handling (`apps/web/src/app/api/auth/refresh/route.ts`)
```typescript
const result = await rotateSessionAtomic(token, userAgent, ip);

const res = successResponse({ message: "Refreshed" });
res.cookies.set("auth_access", result.accessToken, {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
  path: "/",
  maxAge: 600,
});

// Only set auth_refresh if a valid replacement token is present
if (result.refreshToken) {
  res.cookies.set("auth_refresh", result.refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/",
    maxAge: 604800,
  });
}

return res;
```

---

## 6. Chat Execution Architecture Reconciliation Specification (R5 - P1)

### 6.1 Unified Dual-Mode Architecture Definition
Aegis AI operates two complementary chat execution pathways:
1. **Interactive Real-Time Mode (`/api/chat/stream-sse`)**:
   - Primary endpoint for `ChatClient.tsx`.
   - Delivers low-latency real-time streaming tokens via SSE.
   - Enforces monthly plan quotas, token budgets, prompt injection boundaries, and multi-modal file attachments.
2. **Asynchronous Background Queue Mode (`/api/chat/stream`)**:
   - Preserved for mobile apps (`apps/mobile`), batch prompts, and heavy workloads involving multi-step AI tools (e.g. web scraping, browser automation).
   - Backed by BullMQ and PostgreSQL fallback queue.

### 6.2 Hardening the Direct SSE Endpoint (`/api/chat/stream-sse/route.ts`)
1. **Complete Request Schema with `fileId`**:
   ```typescript
   const bodySchema = z.object({
     chatId: z.string().min(1, "Chat ID is required"),
     message: z.string().min(1, "Message is required"),
     projectId: z.string().optional(),
     fileId: z.string().optional(),
   });
   ```
2. **Plan Quota Check**:
   ```typescript
   const { checkQuota } = await import("@/lib/quota");
   const quota = await checkQuota(userId);
   if (!quota.allowed) {
     return errorResponse("Monthly token quota exceeded. Please upgrade your plan.", { status: 403 });
   }
   ```
3. **Multi-Modal Image Attachment Support**:
   - If `fileId` is supplied:
     ```typescript
     const fileRecord = await prisma.file.findFirst({
       where: { id: fileId, userId, deletedAt: null },
     });
     if (fileRecord && fileRecord.type.startsWith("image/") && fs.existsSync(fileRecord.path)) {
       const fileBuffer = fs.readFileSync(fileRecord.path);
       const base64Image = fileBuffer.toString("base64");
       const dataUrl = `data:${fileRecord.type};base64,${base64Image}`;
       // Format user message with image payload for OpenAI vision
     }
     ```
4. **Context Injection Boundaries**:
   - Wrap retrieved RAG documents in `===EXTERNAL_KNOWLEDGE_BASE_START===` and `===EXTERNAL_KNOWLEDGE_BASE_END===`.
   - Wrap user query in `===USER_MESSAGE_START===` and `===USER_MESSAGE_END===`.
5. **Partial Response Persistence on Abort**:
   - Hook `req.signal.addEventListener("abort")`: Upon client disconnect, persist accumulated chunks to `prisma.message` with `isPartial: true`.

---

## 7. Structured Security Remediation Specification (R6 - P0/P1)

### 7.1 Server-Side Request Forgery (SSRF) Defense (`apps/web/src/lib/security/ssrf-guard.ts`)
1. **Exhaustive Blocked CIDR List**:
   - IPv4: `0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10`, `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.0.0.0/24`, `192.0.2.0/24`, `192.88.99.0/24`, `192.168.0.0/16`, `198.18.0.0/15`, `198.51.100.0/24`, `203.0.113.0/24`, `224.0.0.0/4`, `240.0.0.0/4`, `255.255.255.255/32`.
   - IPv6: `::/128`, `::1/128`, `::ffff:0:0/96`, `64:ff9b::/96`, `100::/64`, `2001:2::/48`, `2001:db8::/32`, `2002::/16`, `fc00::/7`, `fe80::/10`, `ff00::/8`.
2. **Socket-Level Agent Hook (TOCTOU Rebinding Elimination)**:
   ```typescript
   import http from "http";
   import https from "https";
   import dns from "dns";
   import net from "net";

   export function createSafeHttpAgent(isHttps: boolean) {
     const AgentClass = isHttps ? https.Agent : http.Agent;
     return new AgentClass({
       lookup: (hostname, options, callback) => {
         dns.lookup(hostname, { all: true }, (err, addresses) => {
           if (err) return callback(err, "", 4);
           for (const addr of addresses) {
             const normalized = normalizeIp(addr.address);
             if (isBlockedIp(normalized)) {
               return callback(new Error(`SSRF blocked: Hostname resolves to disallowed IP ${addr.address}`), "", 4);
             }
           }
           callback(null, addresses[0].address, addresses[0].family);
         });
       },
     });
   }
   ```
3. **Safe Multi-Hop Redirect Interceptor**:
   - Wrap Axios with `maxRedirects: 0`.
   - Intercept `3xx` responses: parse `Location` header, validate scheme (`http:`/`https:`), re-validate target hostname/IP, and follow up to 3 hops maximum.

### 7.2 Database Fallback Queue Schema & Worker Recovery
1. **Prisma Model Alignment (`prisma/schema.prisma`)**:
   ```prisma
   model FallbackQueue {
     id           String    @id
     queueName    String    @map("queue_name") @db.VarChar(100)
     data         Json
     attempts     Int       @default(0)
     maxAttempts  Int       @default(3) @map("max_attempts")
     status       String    @default("pending") @db.VarChar(20)
     createdAt    DateTime  @default(now()) @map("created_at")
     processedAt  DateTime? @map("processed_at")
     completedAt  DateTime? @map("completed_at")
     error        String?   @db.Text

     @@index([queueName, status], name: "idx_fallback_queue_status")
     @@index([createdAt], name: "idx_fallback_queue_created")
     @@index([processedAt], name: "idx_fallback_queue_processed")
     @@map("fallback_queue")
   }
   ```
2. **5-Minute Visibility Timeout (`apps/web/src/lib/fallback-queue.ts`)**:
   ```typescript
   export async function getNextFallbackJob(queueName: string): Promise<FallbackJob | null> {
     const result: any = await prisma.$queryRaw`
       UPDATE fallback_queue
       SET status = 'processing',
           attempts = attempts + 1,
           processed_at = NOW()
       WHERE id = (
         SELECT id
         FROM fallback_queue
         WHERE queue_name = ${queueName}
           AND (
             status = 'pending'
             OR (status = 'processing' AND processed_at < NOW() - INTERVAL '5 minutes')
           )
           AND attempts < max_attempts
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *
     `;
     if (result.length === 0) return null;
     return formatFallbackJob(result[0]);
   }
   ```

### 7.3 Cryptographic Audit Log Integrity Verification (`apps/web/src/lib/audit.ts`)
1. **HMAC Binding to Fixed Timestamp**:
   ```typescript
   export function generateIntegrityHash(entry: AuditLogEntry, createdAt: Date): string {
     const data = JSON.stringify({
       userId: entry.userId,
       action: entry.action,
       targetId: entry.targetId ?? null,
       timestamp: createdAt.toISOString(),
     });

     if (!env.AUDIT_SIGNING_KEY) {
       if (process.env.NODE_ENV === "production") {
         throw new Error("AUDIT_SIGNING_KEY is required in production");
       }
       return createHash("sha256").update(data).digest("hex");
     }

     return createHmac("sha256", env.AUDIT_SIGNING_KEY).update(data).digest("hex");
   }

   export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
     const createdAt = new Date();
     const integrityHash = generateIntegrityHash(entry, createdAt);

     await prisma.auditLog.create({
       data: {
         userId: entry.userId,
         adminRole: entry.adminRole,
         action: entry.action,
         targetType: entry.targetType,
         targetId: entry.targetId,
         previousState: entry.previousState,
         newState: entry.newState,
         metadata: entry.metadata,
         reason: entry.reason,
         ticketId: entry.ticketId,
         ipAddress: entry.ipAddress,
         userAgent: entry.userAgent,
         mfaVerified: entry.mfaVerified || false,
         createdAt,
         integrityHash,
       },
     });
   }
   ```
2. **Exported Verification Utility**:
   ```typescript
   export function verifyAuditEntryIntegrity(
     entry: {
       userId: string | null;
       action: string;
       targetId: string | null;
       createdAt: Date;
       integrityHash: string | null;
     },
     signingKey: string
   ): boolean {
     if (!entry.integrityHash || !signingKey) return false;
     const expected = createHmac("sha256", signingKey)
       .update(
         JSON.stringify({
           userId: entry.userId,
           action: entry.action,
           targetId: entry.targetId ?? null,
           timestamp: entry.createdAt.toISOString(),
         })
       )
       .digest("hex");

     return crypto.timingSafeEqual(
       Buffer.from(entry.integrityHash, "hex"),
       Buffer.from(expected, "hex")
     );
   }
   ```

### 7.4 Safe Rate Limiting Client IP Resolution (`apps/web/src/lib/rate-limit.ts`)
1. **Eliminate Static `"unknown"` IP Sharing**:
   - Resolve client IP via:
     1. Socket connection IP (`(req as any).socket?.remoteAddress`).
     2. Rightmost trusted hop from `x-forwarded-for` (when behind configured reverse proxy).
     3. Ephemeral connection fallback.
2. **User-Keyed Rate Limiting**:
   - For authenticated requests, key limits by `rate_limit:user:${userId}`.

---

## 8. Scope Boundaries & Non-Goals

1. **PR #30 Isolation**: No mass dependency upgrades (+21k lines). Dependency changes are limited to pinned security additions (`audit-ci`).
2. **Framework & Engine Stability**: Retain Next.js 16, Prisma 5, PostgreSQL 16, and BullMQ without framework replacements.
3. **Backwards-Compatible Schema**: Zero dropping of existing tables (`User`, `Session`, `Message`, `Chat`).

---

## 9. Comprehensive Measurable Acceptance Criteria & CLI Verification Matrix

| # | Acceptance Criterion | Concrete Verification CLI Command | Expected Exit Code | Expected Output / Assertion |
|---|---|---|---|---|
| **AC-01** | Zero `continue-on-error: true` in test steps | `powershell -Command "if (Select-String -Path .github/workflows/*.yml -Pattern 'continue-on-error:\s*true') { exit 1 } else { exit 0 }"` | `0` | Clean exit; zero matches found |
| **AC-02** | Zero `npm audit ... \|\| true` in workflows | `powershell -Command "if (Select-String -Path .github/workflows/*.yml -Pattern 'npm audit.*\|\|\s*true') { exit 1 } else { exit 0 }"` | `0` | Clean exit; zero matches found |
| **AC-03** | Gitleaks secret scanning fails on confirmed secret | `gitleaks detect --source . --verbose --redact` | `1` (on fixture) / `0` (on repo) | Exits 1 when unencrypted secret present in git history |
| **AC-04** | Node 20 LTS and setup-node@v4 standardization | `powershell -Command "if (Select-String -Path .github/workflows/*.yml -Pattern 'setup-node@v[0-3,5-9]|node-version:\s*['\"]?(18\|22)['\"]?') { exit 1 } else { exit 0 }"` | `0` | Clean exit; all workflows on Node 20 + setup-node@v4 |
| **AC-05** | Production build succeeds without prod secrets | `powershell -Command "$env:NEXT_PHASE='phase-production-build'; $env:NODE_ENV='production'; $env:APP_ENV='development'; npm run build"` | `0` | Next.js compilation succeeds cleanly |
| **AC-06** | Production runtime rejects `SKIP_PROD_VALIDATION=1` | `npm test -- apps/web/src/__tests__/lib/env.test.ts -t 'rejects SKIP_PROD_VALIDATION in production'` | `0` | Throws `CRITICAL SECURITY VIOLATION` error |
| **AC-07** | Production runtime rejects dev secrets & short keys | `npm test -- apps/web/src/__tests__/lib/env.test.ts -t 'validates secret entropy'` | `0` | Throws `JWT_ACCESS_SECRET must be at least 64 random characters` |
| **AC-08** | Atomic refresh rotation & 5 concurrent requests | `npm test -- apps/web/src/__tests__/services/auth/session-concurrency.test.ts -t 'handles 5 concurrent refresh requests'` | `0` | Exactly 1 rotation, 4 grace returns, 0 deleted sessions |
| **AC-09** | Replay outside 10s grace window revokes family | `npm test -- apps/web/src/__tests__/services/auth/session-concurrency.test.ts -t 'revokes family on expired replay'` | `0` | Throws `TOKEN_REPLAY_EXPIRED`, deletes all user sessions |
| **AC-10** | Grace window cross-network replay detection | `npm test -- apps/web/src/__tests__/services/auth/session-concurrency.test.ts -t 'detects foreign IP during grace window'` | `0` | Throws `SUSPICIOUS_CROSS_NETWORK_REPLAY`, revokes family |
| **AC-11** | SSRF socket agent blocks private IPs & IMDS | `npm test -- apps/web/src/__tests__/security/ssrf.test.ts -t 'blocks internal IPs at socket level'` | `0` | Blocks `127.0.0.1`, `169.254.169.254`, `::ffff:127.0.0.1` |
| **AC-12** | SSRF blocks TOCTOU DNS rebinding attack | `npm test -- apps/web/src/__tests__/security/ssrf.test.ts -t 'prevents TOCTOU DNS rebinding'` | `0` | Zero socket payload transmitted; request rejected |
| **AC-13** | SSRF 3-hop redirect interceptor validates target | `npm test -- apps/web/src/__tests__/security/ssrf.test.ts -t 'validates redirect destination'` | `0` | Follows safe URL; terminates on internal redirect |
| **AC-14** | Fallback queue executes with column `error` | `npm test -- apps/web/src/__tests__/lib/fallback-queue.test.ts -t 'records job error'` | `0` | `UPDATE fallback_queue SET error = ...` succeeds |
| **AC-15** | Stuck fallback job reclaimed after 5 minutes | `npm test -- apps/web/src/__tests__/lib/fallback-queue.test.ts -t 'reclaims stuck processing jobs'` | `0` | Job in processing > 5 min reset and claimed |
| **AC-16** | Chat SSE accepts `fileId` and parses image | `npm test -- apps/web/src/__tests__/api.chat.streaming.test.ts -t 'processes file attachment'` | `0` | 200 OK stream; image data URL injected |
| **AC-17** | Chat SSE blocks users exceeding monthly quota | `npm test -- apps/web/src/__tests__/api.chat.streaming.test.ts -t 'enforces quota limits'` | `0` | 403 Forbidden with upgrade prompt |
| **AC-18** | Cryptographic audit log verification passes | `npm test -- apps/web/src/__tests__/lib/audit.test.ts -t 'verifies audit entry integrity'` | `0` | `verifyAuditEntryIntegrity` returns true on stored record |
| **AC-19** | Full workspace typecheck passes | `npx tsc --noEmit` | `0` | Zero TypeScript compiler errors |
| **AC-20** | Full repository production build succeeds | `npm run build:all` | `0` | Next.js and workspace builds succeed cleanly |

---

## 10. Master Feature Inventory (Features Discovered)

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| F-01 | Auth / Concurrency | Atomic Token Rotation with Row-Level Lock | Conditional `updateMany` rotation preventing split-brain sessions | Old refresh token, user ID | New JWT pair, Set-Cookie | 401 on invalid/expired/replayed token | `session.ts`, Finding CRIT-AUTH-02 |
| F-02 | Auth / Concurrency | Idempotent Concurrency Grace Window | 10s grace window returning active tokens from Redis cache without cookie poisoning | Replayed token within 10s of rotation | Active valid token pair | 401 if presented after 10s (family wipeout) | Finding CRIT-AUTH-01 |
| F-03 | Auth / Security | Grace Window Client Fingerprint Binding | Cross-network IP / User-Agent verification during grace window | Client IP, User-Agent header | Boolean verification | 401 + immediate family revocation on IP/UA mismatch | Finding CRIT-AUTH-05 |
| F-04 | Auth / Persistence | Indexed Token Successor Lineage | Indexed `replacedByTokenHash` preventing full table scans | Token hash lookup | Session database record | Query timeout eliminated | Finding CRIT-AUTH-04 |
| F-05 | Environment | Build-Phase Secret Decoupling | Bypasses runtime credential validation during `NEXT_PHASE=phase-production-build` | `NEXT_PHASE`, `NODE_ENV` | Static compilation output | Allows build with mock secrets | Finding CRIT-ENV-01 |
| F-06 | Environment | Strict Runtime Security Enforcement | Unbypassable validation at server runtime (`next start`); blocks `SKIP_PROD_VALIDATION=1` | Runtime environment variables | Typed `env` config | Fatal process exit with error list | `env.ts` |
| F-07 | Perimeter / SSRF | Socket-Level IP Binding Agent | Custom HTTP agent validating resolved IP in socket lookup hook to stop TOCTOU rebinding | Target URL | HTTP connection socket | Throws SSRF error before socket connects | Finding CRIT-SEC-01 |
| F-08 | Perimeter / SSRF | Dual-Stack & IPv4-Mapped IPv6 Normalization | Exhaustive CIDR filtering with `::ffff:0:0/96` translation | Hostname / IP string | Normalized IP address | Throws on any private/loopback/IMDS IP | Finding CRIT-SEC-02 |
| F-09 | Perimeter / SSRF | Safe 3-Hop Redirect Interceptor | Manual redirect loop verifying destination protocol and IP on each hop | HTTP 3xx response, Location header | Validated response stream | Terminates if redirect hops > 3 or targets internal IP | Finding CRIT-SEC-03 |
| F-10 | Persistence / Queue | Aligned Fallback Queue Schema | Prisma model `FallbackQueue` with column `error` matching raw SQL | Job payload, queue name | Job record in `fallback_queue` | Database runtime crash eliminated | Finding CRIT-DB-01 |
| F-11 | Persistence / Queue | Fallback Queue Processed Index | Index on `processed_at` preventing table scans during cleanup | Retention cutoff timestamp | Count of purged rows | Table bloat query timeout eliminated | Finding CRIT-DB-02 |
| F-12 | Persistence / Queue | 5-Minute Worker Visibility Timeout | Reclaims jobs stuck in `processing` status due to worker crashes | Queue name, 5-min threshold | Active claim on expired job | Stuck jobs automatically re-queued | Finding CRIT-DB-03 |
| F-13 | Chat / Multi-Modal | SSE File Attachment Handling | Accepts `fileId` in SSE route and injects image data URL into prompt | `chatId`, `message`, `fileId` | Multi-modal LLM stream | 400 if file not found or unauthorized | Finding CRIT-CHAT-01 |
| F-14 | Chat / Governance | SSE Monthly Plan Quota Enforcement | Invokes `checkQuota` before starting SSE stream | `userId` | Token stream or 403 error | 403 Forbidden with upgrade prompt | Finding CRIT-CHAT-02 |
| F-15 | Chat / Architecture | Dual-Mode Chat Execution Router | Interactive SSE for UI; BullMQ queue for multi-step agent tools | Request path / tool flag | Stream or Job ID | Dispatches to optimal executor | Finding CRIT-CHAT-03 |
| F-16 | Audit / Cryptography | Persisted Timestamp HMAC Signing | Signs fixed `createdAt` timestamp stored in database | Audit entry, `createdAt` Date | Verifiable HMAC-SHA256 hex string | Runtime error if key missing in prod | Finding CRIT-AUDIT-01 |
| F-17 | Audit / Verification | Timing-Safe Audit Verification Utility | Mathematically verifies stored audit log entry against HMAC key | Database `AuditLog` record | Boolean validity result | False on tampering or invalid secret | Finding CRIT-AUDIT-01 |
| F-18 | Rate Limiting | Connection-Isolated IP Resolution | Resolves client IP via socket address or rightmost proxy hop; avoids static `"unknown"` | `NextRequest` | Resolved client IP string | Prevents global DoS for unproxied users | Finding CRIT-RATE-01 |
| F-19 | CI/CD | Blocking Dependency Vulnerability Audit | Strict auditing via `audit-ci` with explicit baseline whitelist | `audit-ci.json`, npm lockfile | CI exit code 0 or 1 | Fails CI on unapproved high/crit CVEs | Finding CRIT-ENV-02 |
| F-20 | CI/CD | Blocking Secret Scanning Pipeline | Scans full commit range using official `gitleaks-action@v2` | Commit range | Gitleaks report | Fails CI on detected secrets | `security.yml` |

---

## 11. Edge Cases Matrix

| # | Feature | Input / Trigger | Expected Observable Behavior |
|---|---|---|---|
| E-01 | Session Rotation | 2 parallel requests with identical refresh token (0ms delta) | Request A updates `replacedAt` atomically and mints new tokens; Request B sees `count === 0`, retrieves active token pair from Redis, and returns it; zero sessions deleted. |
| E-02 | Session Rotation | Token replayed 11 seconds after rotation | Elapsed time exceeds 10s grace window; entire session family revoked; user `tokenVersion` incremented; 401 Unauthorized returned. |
| E-03 | Session Rotation | Token replayed within 5s but from a completely different IP subnet and User-Agent | Cross-network fingerprint mismatch triggers `SUSPICIOUS_CROSS_NETWORK_REPLAY`; grace window aborted; family revoked immediately; 401 returned. |
| E-04 | Session Rotation | Refresh request presenting expired token (`now() > expiresAt`) | Session record deleted from database; 401 Unauthorized returned; other active sessions unaffected. |
| E-05 | Session Rotation | Refresh request by banned user (`isBanned: true`) | Immediate 403 Forbidden; session not rotated; active sessions purged. |
| E-06 | Environment | `next build` executed in CI with `APP_ENV=development` | `NEXT_PHASE === 'phase-production-build'` detected; runtime secret check bypassed; build succeeds with exit code 0. |
| E-07 | Environment | Production server boot with `SKIP_PROD_VALIDATION=1` | Runtime production check detects bypass attempt; throws fatal `CRITICAL SECURITY VIOLATION` error; process terminates. |
| E-08 | Environment | Production server boot with default `dev-access-secret` | Process throws fatal validation error requiring 64-char random secret; startup halts. |
| E-09 | SSRF Guard | URL `http://rebind.attacker.com` returning public IP on lookup, private IP on socket connect | Custom HTTP agent checks socket destination IP before transmitting HTTP bytes; connection aborted with SSRF error; zero bytes leaked. |
| E-10 | SSRF Guard | URL `http://[::ffff:169.254.169.254]/latest/meta-data/` | IPv4-mapped IPv6 normalized to `169.254.169.254`; matched against blocked cloud metadata CIDR; rejected immediately. |
| E-11 | SSRF Guard | Public URL 302-redirecting to `http://127.0.0.1:6379/` | Redirect interceptor inspects `Location` header, resolves destination IP, detects loopback CIDR, and aborts request before hop 2. |
| E-12 | Fallback Queue | Worker crashes while processing job, leaving it in `status = 'processing'` | After 5 minutes, `getNextFallbackJob` visibility timeout identifies expired job; resets status, increments attempts, and assigns to next healthy worker. |
| E-13 | Fallback Queue | Periodic cleanup executed on 1,000,000 old fallback records | Cleanup query utilizes `idx_fallback_queue_processed` index; completes in milliseconds without sequential table scan. |
| E-14 | Chat SSE Stream | User submits chat request containing `fileId` pointing to PNG image | `bodySchema` validates `fileId`; file record retrieved; image encoded to base64 data URL; OpenAI vision prompt dispatched; tokens streamed. |
| E-15 | Chat SSE Stream | Free-tier user exceeding monthly token quota sends chat message | `checkQuota(userId)` returns `allowed: false`; route returns 403 Forbidden with `"Monthly token quota exceeded"`; LLM is not called. |
| E-16 | Chat SSE Stream | Client closes browser tab after 10 chunks received | Server catches `req.signal.aborted`; terminates OpenAI stream; persists partial message with `isPartial: true`; records usage for 10 tokens. |
| E-17 | Audit Log | Security auditor verifies historical audit record against `AUDIT_SIGNING_KEY` | `verifyAuditEntryIntegrity` recomputes HMAC using stored `createdAt` timestamp; matches `integrityHash`; returns `true`. |
| E-18 | Rate Limiting | Self-hosted server receives requests without reverse proxy `x-forwarded-for` | Sockets address resolved; client requests isolated; static `"unknown"` bucket DoS vulnerability eliminated. |
