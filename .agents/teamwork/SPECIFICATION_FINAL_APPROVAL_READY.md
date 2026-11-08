# Engineering Remediation Specification (Final Approval-Ready Master Specification — v3)

**Project**: Aegis AI Engineering Hardening Campaign  
**Author**: Principal Architect (Specification Author — Round 3)  
**Date**: 2026-11-07  
**Status**: FINAL APPROVAL-READY MASTER SPECIFICATION (Round 3 of 3)  
**Target Repository**: `https://github.com/NoorulAhameddev/AegisAi`  
**Base Commit**: `3936ba40129c16b07c9b91a1bb35a7df0f390f7a`  
**Supersedes**: `SPECIFICATION_v2.md`, `SPECIFICATION_v1.md`  

---

## Executive Summary

This master specification establishes the **Final Approval-Ready Implementation Specification (v3)** for the comprehensive engineering remediation of the Aegis AI platform. It consolidates and finalizes all architectural hardening requirements developed across Rounds 1 and 2, resolving every vulnerability, concurrency hazard, operational fragility, and edge case identified in the Round 2 Adversarial Critique (`CRITIQUE_ROUND_2.md`).

Specification v3 completes requirements **R1 through R6** defined in `ORIGINAL_REQUEST.md` with absolute engineering rigor:

1. **Refresh-Token Rotation & High-Resilience Concurrency (R4)**:
   - Eliminates poisoned token re-issuance during the concurrency grace window.
   - Enforces PostgreSQL atomic conditional updates (`updateMany` with `replacedAt: null`) to eliminate race conditions under `READ COMMITTED`.
   - Wraps all Redis caching operations (`redis.set`, `redis.get`) in defensive `try/catch` blocks so that Redis outages never roll back database transactions or crash authentication endpoints.
   - Tightens the rotation grace window to **5 seconds** (down from 10s) and enforces client fingerprint validation: requests presenting rotated tokens are rejected if BOTH IP and User-Agent mismatch (`!ipMatches && !uaMatches`), while legitimately permitting mobile network transitions when User-Agent matches.
   - Indexes `replacedByTokenHash` on the `Session` model to prevent sequential table scans.

2. **Perimeter Security & Socket-Level SSRF IP Literal Defense (R6)**:
   - Eliminates TOCTOU DNS rebinding and IP literal bypass vulnerabilities.
   - Implements explicit pre-connection validation (`net.isIP`) for direct IP literals (e.g. `169.254.169.254`, `127.0.0.1`, `::1`).
   - Implements a custom `http.Agent` and `https.Agent` overriding `lookup` and `createConnection`. The `lookup` hook validates all resolved IP addresses, handling empty DNS results safely. The `createConnection` override intercepts raw socket creation, verifying `socket.remoteAddress` on socket `connect` (and `secureConnect` for TLS) before any HTTP byte stream is transmitted.
   - Normalizes IPv4-mapped IPv6 addresses (`::ffff:0:0/96`) and evaluates against an exhaustive CIDR blacklist.
   - Enforces an explicit 3-hop redirect interceptor with strict protocol and destination re-validation.

3. **Environment Hardening & Decoupled Build-Phase Fallback (R3)**:
   - Decouples Next.js compilation (`NEXT_PHASE=phase-production-build`) from runtime production credential enforcement, preventing CI and Docker build crashes.
   - Provides a dummy fallback for `DATABASE_URL` (`postgresql://build:dummy@localhost:5432/build_dummy`) during `phase-production-build`, enabling standalone `next build` execution without external database credentials.
   - Enforces non-bypassable runtime validation when the server starts (`next start`), permanently barring `SKIP_PROD_VALIDATION=1` and enforcing 64-character entropy on all security keys.

4. **Persistence & Fallback Queue Heartbeat Lease Extension (R6)**:
   - Synchronizes the Prisma model `FallbackQueue` with table `fallback_queue`, column `error String? @db.Text`, and indexed `processed_at`.
   - Introduces an exported `heartbeatFallbackJob(jobId)` worker heartbeat mechanism that updates `processed_at = NOW()`, preventing long-running ingestion, scraping, or RAG tasks from being prematurely reclaimed by the 5-minute visibility timeout.

5. **Chat Architecture Preservation & Multi-Modal Vision (R5)**:
   - Preserves multi-modal file attachments (`fileId`) and base64 vision payload construction in the real-time SSE streaming route (`/api/chat/stream-sse`).
   - Integrates plan quota checks (`checkQuota`) with user-friendly 403 Forbidden responses.
   - Clarifies the dual-mode boundary: SSE streaming handles interactive chat, RAG, and image vision; BullMQ handles asynchronous multi-step background tool execution.

6. **Cryptographic Audit Log Length-Guarded Verification (R3/R6)**:
   - Cryptographically binds HMAC-SHA256 integrity hashes to the persisted `createdAt` timestamp.
   - Exports `verifyAuditEntryIntegrity`, adding an explicit buffer length check (`actualBuf.length === expectedBuf.length && actualBuf.length !== 0`) before invoking `crypto.timingSafeEqual`, preventing unhandled `RangeError` crashes.

7. **Monorepo-Targeted Measurable Acceptance Criteria (AC-01 through AC-20)**:
   - Updates all CLI verification commands to target `@aegis-ai/web` (`npm --workspace=@aegis-ai/web test -- ...`), eliminating fan-out failures into `apps/mobile`.
   - Aligns AC-10 assertion and test title to verify cross-client replay detection.

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

## 2. Refined Architectural Resolutions (Round 3 Hardening)

### 2.1 Refresh Token Concurrency, Redis Resilience & Client Binding
- **Vulnerabilities Resolved**:
  1. *Redis Exception Transaction Rollback*: In v2, `redis.set` and `redis.get` were invoked nakedly inside `prisma.$transaction`. Under Redis downtime or socket timeouts, unhandled exceptions caused transaction rollback and 500 errors. In v3, all Redis operations are wrapped in `try/catch`. If Redis is unavailable, the transaction succeeds, logging a warning and falling back to returning the newly minted `accessToken` without writing a poisoned `refreshToken` cookie.
  2. *Overly Permissive 10s Window*: Concurrency races between browser tabs or background requests resolve in 200–1500ms. v3 reduces the grace window from 10 seconds to **5 seconds**, halving the attack window.
  3. *Client Fingerprint Binding & Mobile Transitions*: v3 enforces that incoming replay requests during the 5s window are rejected if BOTH IP and User-Agent mismatch (`!ipMatches && !uaMatches`). When a mobile client transitions from WiFi to LTE (IP changes but User-Agent remains identical), the request is permitted. If an adversary attempts to replay the token from a foreign client (different IP and User-Agent), the family is revoked immediately with `SUSPICIOUS_CROSS_NETWORK_REPLAY`.
  4. *Successor Lineage Indexing*: `model Session` includes `@@index([replacedByTokenHash])`, preventing full table scans during grace window and reuse checks.

### 2.2 SSRF Defense, Socket-Level Binding & Direct IP Literal Defense
- **Vulnerabilities Resolved**:
  1. *IP Literal `lookup` Bypass*: In Node.js, `net.createConnection` inspects `net.isIP(host)`. When an IP literal (e.g. `http://169.254.169.254/latest/meta-data/` or `http://127.0.0.1:6379`) is requested, Node skips the agent's `lookup` hook entirely. In v3, `ssrf-guard.ts` executes an explicit pre-connection check via `net.isIP(hostname)` before socket setup. Furthermore, `createSafeHttpAgent` overrides `createConnection` to inspect `options.host`/`options.hostname` and intercept the socket `connect`/`secureConnect` event, asserting `socket.remoteAddress` against the CIDR blacklist before any request headers or data bytes are transmitted.
  2. *Empty DNS Address Array*: When DNS resolution yields an empty array, accessing `addresses[0]` throws a `TypeError`. v3 asserts `addresses && addresses.length > 0` before proceeding.
  3. *IPv4-Mapped IPv6 & Dual Stack*: Normalized using RFC 4291/5952 parsing to extract underlying IPv4 addresses from `::ffff:0:0/96`.
  4. *Multi-Hop Redirect Security*: Axios is configured with `maxRedirects: 0`. Redirects (`301`, `302`, `303`, `307`, `308`) are processed in a controlled loop (maximum 3 hops), with full scheme and destination validation enforced prior to each subsequent hop.

### 2.3 Build-Time Decoupling & Dummy Database URL Fallback
- **Vulnerabilities Resolved**:
  1. *Build-Time Credential Crashes*: Next.js CLI sets `NODE_ENV=production` during `next build`. If production environment validation runs during compilation, missing runtime secrets crash the build.
  2. *Missing `DATABASE_URL` in Build Phase*: In `env.ts`, `DATABASE_URL` is required and has no default. When building standalone container images or running CI without a database container, `next build` fails immediately.
  3. *Specification v3 Resolution*:
     In `apps/web/src/lib/env.ts`:
     - Inspect `isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'`.
     - During `isBuildPhase`, `DATABASE_URL` provides a default fallback dummy: `"postgresql://build:dummy@localhost:5432/build_dummy"`.
     - Runtime production credential checks are skipped during `isBuildPhase`.
     - When the server boots (`isRuntimeProduction`), `DATABASE_URL` must be a valid PostgreSQL connection string, `SKIP_PROD_VALIDATION=1` throws a fatal error, and all signing keys must satisfy the 64-character minimum entropy requirement.

### 2.4 Fallback Queue Worker Heartbeat & Schema Alignment
- **Vulnerabilities Resolved**:
  1. *Task Preemption during Heavy Workloads*: A static 5-minute visibility timeout in `getNextFallbackJob` causes long-running tasks (e.g. multi-page PDF ingestion, embedding generation, deep web crawling) to be reclaimed by a second worker mid-execution.
  2. *Specification v3 Resolution*:
     - Export `heartbeatFallbackJob(jobId: string)` in `apps/web/src/lib/fallback-queue.ts`.
     - Workers processing jobs must invoke `heartbeatFallbackJob` every 60 seconds, updating `processed_at = NOW()` and resetting the visibility window.
     - Model name synchronized to `FallbackQueue` mapping to table `fallback_queue` with column `error String? @db.Text` and indexed `processed_at`.

### 2.5 Multi-Modal Chat Preservation & Quota Enforcement on SSE Route
- **Vulnerabilities Resolved**:
  1. Schema in `/api/chat/stream-sse/route.ts` rejected `fileId`, breaking multi-modal chat.
  2. Quota verification was omitted, allowing unauthorized token usage.
- **Specification v3 Resolution**:
  - `bodySchema` explicitly accepts `fileId: z.string().optional()`.
  - Image files are looked up and formatted as base64 data URLs for OpenAI vision models (`gpt-4o-mini`).
  - `await checkQuota(userId)` is executed prior to stream initiation; users exceeding quota receive a 403 Forbidden with `{ error: "Monthly token quota exceeded. Please upgrade your plan." }`.
  - Client abort events (`req.signal.addEventListener('abort')`) persist partial messages with `isPartial: true`.

### 2.6 Cryptographic Audit Log Verification with Buffer Length Guard
- **Vulnerabilities Resolved**:
  1. Ephemeral timestamps prevented reproducible signature verification.
  2. Calling `crypto.timingSafeEqual` on mismatched buffer lengths throws an unhandled `RangeError [ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH]`.
- **Specification v3 Resolution**:
  - Pass an explicit `createdAt: Date` into `generateIntegrityHash` and persist that identical timestamp in PostgreSQL.
  - In `verifyAuditEntryIntegrity`, assert `actualBuf.length === expectedBuf.length && actualBuf.length !== 0` before calling `crypto.timingSafeEqual`. Tampered or malformed signatures return `false` cleanly without throwing exceptions.

### 2.7 Monorepo Workspace CLI Alignment
- **Vulnerabilities Resolved**:
  - Running `npm test -- apps/web/...` from monorepo root triggers `apps/mobile`, where Jest is unconfigured, causing root CLI failure.
- **Specification v3 Resolution**:
  - All test commands in Section 9 explicitly target `@aegis-ai/web`:
    `npm --workspace=@aegis-ai/web test -- src/...`

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
  
  // Build-time dummy fallback ensures 'next build' succeeds without active database connection
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((v) => v.startsWith("postgresql://"), {
      message: "DATABASE_URL must start with postgresql://",
    })
    .default(
      isBuildPhase
        ? "postgresql://build:dummy@localhost:5432/build_dummy"
        : (undefined as any)
    ),

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

// 2. Strict Runtime Production Hardening (Bypassed during build phase)
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
export type Env = typeof env;

let config: Env | null = null;
export function getEnv(): Env {
  if (!config) {
    config = env;
  }
  return config;
}
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
  @@index([replacedByTokenHash]) // Indexed to prevent sequential table scans
}
```

### 5.2 Atomic Rotation & Concurrency Grace Algorithm
In `apps/web/src/services/auth/session.ts`:
```typescript
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "./auth";
import { logger } from "@/lib/logger";
import crypto from "crypto";

const ROTATION_GRACE_WINDOW_MS = 5000; // 5 seconds (hardened from 10s)
const ROTATION_CACHE_TTL_SEC = 5;

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

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

      // Defensive Redis caching: Wrap in try/catch to ensure Redis outages never rollback DB transaction
      if (redis) {
        try {
          await redis.set(
            `token_rotation_cache:${oldTokenHash}`,
            JSON.stringify({ accessToken: newAccessToken, refreshToken: newRefreshToken }),
            "EX",
            ROTATION_CACHE_TTL_SEC
          );
        } catch (redisErr) {
          logger.warn("Redis unavailable during token rotation cache set; proceeding without cache", { error: redisErr });
        }
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

        // Reject if BOTH IP and User-Agent mismatch (cross-client replay)
        // Permits mobile transitions (where IP changes between WiFi/LTE but User-Agent matches)
        if (!ipMatches && !uaMatches) {
          await tx.session.deleteMany({ where: { userId: user.id } });
          await tx.user.update({
            where: { id: user.id },
            data: { tokenVersion: { increment: 1 } },
          });
          throw new AuthError("SUSPICIOUS_CROSS_NETWORK_REPLAY", 401);
        }

        // Return the active replacement token pair from Redis cache if available
        let cached: string | null = null;
        if (redis) {
          try {
            cached = await redis.get(`token_rotation_cache:${oldTokenHash}`);
          } catch (redisErr) {
            logger.warn("Redis unavailable during token rotation cache get; falling back to DB lookup", { error: redisErr });
          }
        }

        if (cached) {
          const parsed = JSON.parse(cached);
          return {
            accessToken: parsed.accessToken,
            refreshToken: parsed.refreshToken,
            isGraceReturn: true,
          };
        }

        // Fallback if Redis blip or cache expired: return access token only, preserve client's existing cookie
        return {
          accessToken: signAccessToken({
            userId: user.id,
            role: user.role,
            tokenVersion: user.tokenVersion,
          }),
          refreshToken: "", // Refresh route will NOT set cookie when empty
          isGraceReturn: true,
        };
      }

      // Replay outside 5s grace window: Revoke family immediately
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
import { NextRequest } from "next/server";
import { rotateSessionAtomic } from "@/services/auth/session";
import { successResponse, errorResponse } from "@/lib/response";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get("auth_refresh")?.value;
    if (!refreshToken) {
      return errorResponse("Missing refresh token", { status: 401 });
    }

    const userAgent = req.headers.get("user-agent") || "";
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || (req as any).socket?.remoteAddress || "";

    const result = await rotateSessionAtomic(refreshToken, userAgent, ip);

    const res = successResponse({ message: "Refreshed" });
    res.cookies.set("auth_access", result.accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
      maxAge: 600,
    });

    // Only set auth_refresh if a valid replacement token is present (prevents cookie poisoning)
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
  } catch (error: any) {
    return errorResponse(error.message || "Failed to refresh session", {
      status: error.statusCode || 401,
    });
  }
}
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
```typescript
import { NextRequest } from "next/server";
import { z } from "zod";
import { getUserFromRequest } from "@/services/auth/session";
import { checkQuota } from "@/lib/quota";
import { prisma } from "@/lib/prisma";
import { openai } from "@/services/ai/openai";
import { errorResponse } from "@/lib/response";
import fs from "fs";

const bodySchema = z.object({
  chatId: z.string().min(1, "Chat ID is required"),
  message: z.string().min(1, "Message is required"),
  projectId: z.string().optional(),
  fileId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return errorResponse("Unauthorized", { status: 401 });
  }

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse("Invalid request payload", { status: 400 });
  }

  const { chatId, message, fileId } = parsed.data;

  // 1. Enforce Monthly Plan Quota Limits
  const quota = await checkQuota(user.userId);
  if (!quota.allowed) {
    return errorResponse("Monthly token quota exceeded. Please upgrade your plan.", { status: 403 });
  }

  // 2. Prepare Multi-Modal Payload
  const messages: any[] = [];
  if (fileId) {
    const fileRecord = await prisma.file.findFirst({
      where: { id: fileId, userId: user.userId, deletedAt: null },
    });

    if (fileRecord && fileRecord.type.startsWith("image/") && fs.existsSync(fileRecord.path)) {
      const fileBuffer = fs.readFileSync(fileRecord.path);
      const base64Image = fileBuffer.toString("base64");
      const dataUrl = `data:${fileRecord.type};base64,${base64Image}`;

      messages.push({
        role: "user",
        content: [
          { type: "text", text: `===USER_MESSAGE_START===\n${message}\n===USER_MESSAGE_END===` },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: `===USER_MESSAGE_START===\n${message}\n===USER_MESSAGE_END===`,
      });
    }
  } else {
    messages.push({
      role: "user",
      content: `===USER_MESSAGE_START===\n${message}\n===USER_MESSAGE_END===`,
    });
  }

  // 3. Initiate SSE Streaming with Abort Handling
  const encoder = new TextEncoder();
  let fullAccumulatedResponse = "";

  const responseStream = new ReadableStream({
    async start(controller) {
      try {
        const stream = await openai.chat.completions.create({
          model: "openai/gpt-4o-mini",
          messages,
          stream: true,
        });

        req.signal.addEventListener("abort", async () => {
          if (fullAccumulatedResponse.length > 0) {
            await prisma.message.create({
              data: {
                chatId,
                role: "assistant",
                content: fullAccumulatedResponse,
                isPartial: true,
              },
            });
          }
        });

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || "";
          if (delta) {
            fullAccumulatedResponse += delta;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`));
          }
        }

        // Persist final completed message
        await prisma.message.create({
          data: {
            chatId,
            role: "assistant",
            content: fullAccumulatedResponse,
            isPartial: false,
          },
        });

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err: any) {
        controller.error(err);
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
```

---

## 7. Structured Security Remediation Specification (R6 - P0/P1)

### 7.1 Server-Side Request Forgery (SSRF) Defense (`apps/web/src/lib/security/ssrf-guard.ts`)

#### 1. Exhaustive Blocked CIDR List
- IPv4 CIDRs: `0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10`, `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.0.0.0/24`, `192.0.2.0/24`, `192.88.99.0/24`, `192.168.0.0/16`, `198.18.0.0/15`, `198.51.100.0/24`, `203.0.113.0/24`, `224.0.0.0/4`, `240.0.0.0/4`, `255.255.255.255/32`.
- IPv6 CIDRs: `::/128`, `::1/128`, `::ffff:0:0/96`, `64:ff9b::/96`, `100::/64`, `2001:2::/48`, `2001:db8::/32`, `2002::/16`, `fc00::/7`, `fe80::/10`, `ff00::/8`.

#### 2. Comprehensive Socket-Level Agent Hook with IP Literal Defense
```typescript
import http from "http";
import https from "https";
import dns from "dns";
import net from "net";
import tls from "tls";
import { URL } from "url";

export function normalizeIp(ip: string): string {
  let cleaned = ip.trim().toLowerCase();
  // Strip IPv4-mapped IPv6 prefix ::ffff:
  if (cleaned.startsWith("::ffff:")) {
    const rawIpv4 = cleaned.substring(7);
    if (net.isIPv4(rawIpv4)) return rawIpv4;
  }
  return cleaned;
}

export function ipToBigInt(ip: string, family: 4 | 6): bigint {
  if (family === 4) {
    return ip.split(".").reduce((acc, octet) => (acc << 8n) + BigInt(octet), 0n);
  }
  // IPv6 expansion
  const parts = ip.split("::");
  let left = parts[0] ? parts[0].split(":") : [];
  let right = parts[1] ? parts[1].split(":") : [];
  const missing = 8 - (left.length + right.length);
  const full = [...left, ...Array(missing).fill("0"), ...right];
  return full.reduce((acc, hex) => (acc << 16n) + BigInt(parseInt(hex || "0", 16)), 0n);
}

export function isIpInCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  const bits = parseInt(bitsStr, 10);
  const ipFamily = net.isIP(ip) as 4 | 6;
  const rangeFamily = net.isIP(range) as 4 | 6;
  if (!ipFamily || ipFamily !== rangeFamily) return false;

  const totalBits = ipFamily === 4 ? 32n : 128n;
  const mask = ((1n << BigInt(bits)) - 1n) << (totalBits - BigInt(bits));
  const ipBig = ipToBigInt(ip, ipFamily);
  const rangeBig = ipToBigInt(range, rangeFamily);

  return (ipBig & mask) === (rangeBig & mask);
}

export const BLOCKED_CIDRS = [
  // IPv4 Private, Loopback, Link-Local, Cloud Metadata
  "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16",
  "172.16.0.0/12", "192.0.0.0/24", "192.0.2.0/24", "192.88.99.0/24",
  "192.168.0.0/16", "198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24",
  "224.0.0.0/4", "240.0.0.0/4", "255.255.255.255/32",
  // IPv6
  "::/128", "::1/128", "::ffff:0:0/96", "64:ff9b::/96", "100::/64",
  "2001:2::/48", "2001:db8::/32", "2002::/16", "fc00::/7", "fe80::/10", "ff00::/8"
];

export function isBlockedIp(rawIp: string): boolean {
  const ip = normalizeIp(rawIp);
  for (const cidr of BLOCKED_CIDRS) {
    if (isIpInCidr(ip, cidr)) return true;
  }
  return false;
}

/**
 * Creates custom HTTP/HTTPS agent that overrides both 'lookup' and 'createConnection'
 * Prevents DNS rebinding and IP literal bypass vectors
 */
export function createSafeHttpAgent(isHttps: boolean) {
  const BaseAgent = isHttps ? https.Agent : http.Agent;

  return new (class SafeAgent extends BaseAgent {
    // 1. Override createConnection to intercept raw sockets before HTTP bytes transmit
    override createConnection(options: any, callback?: (err: Error | null, socket?: net.Socket) => void): net.Socket {
      const host = options.host || options.hostname;

      // Direct check: If destination is an IP literal, evaluate immediately before dialing
      if (host && net.isIP(host)) {
        const normalized = normalizeIp(host);
        if (isBlockedIp(normalized)) {
          const err = new Error(`SSRF blocked: Direct socket connection to disallowed IP ${host}`);
          if (callback) callback(err);
          throw err;
        }
      }

      // Establish underlying socket
      const socket = isHttps ? tls.connect(options) : net.createConnection(options);

      const verifySocket = () => {
        const remoteIp = normalizeIp(socket.remoteAddress || "");
        if (remoteIp && isBlockedIp(remoteIp)) {
          socket.destroy(new Error(`SSRF blocked: Remote socket connected to disallowed IP ${remoteIp}`));
        }
      };

      if (isHttps) {
        socket.once("secureConnect", verifySocket);
      } else {
        socket.once("connect", verifySocket);
      }

      if (callback) {
        socket.once(isHttps ? "secureConnect" : "connect", () => callback(null, socket));
        socket.once("error", (err) => callback(err));
      }

      return socket;
    }
  })({
    // 2. Override lookup hook to evaluate all resolved DNS addresses
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, { all: true }, (err, addresses) => {
        if (err) return callback(err, "", 4);
        if (!addresses || addresses.length === 0) {
          return callback(new Error(`DNS resolution returned zero records for ${hostname}`), "", 4);
        }

        for (const addr of addresses) {
          const normalized = normalizeIp(addr.address);
          if (isBlockedIp(normalized)) {
            return callback(
              new Error(`SSRF blocked: Hostname ${hostname} resolves to disallowed IP ${addr.address}`),
              "",
              4
            );
          }
        }

        // Return first verified address
        callback(null, addresses[0].address, addresses[0].family);
      });
    },
  });
}

/**
 * Validates target URL and executes a safe fetch with up to 3 redirect hops
 */
export async function validateAndFetchSafeUrl(targetUrl: string, maxHops: number = 3): Promise<Response> {
  let currentUrl = targetUrl;
  let hops = 0;

  while (hops <= maxHops) {
    const parsed = new URL(currentUrl);

    // Enforce protocol whitelist
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`SSRF blocked: Unsupported protocol '${parsed.protocol}'`);
    }

    // Pre-flight validation if hostname is an IP literal
    if (net.isIP(parsed.hostname)) {
      const normalized = normalizeIp(parsed.hostname);
      if (isBlockedIp(normalized)) {
        throw new Error(`SSRF blocked: Target hostname is a disallowed IP literal ${parsed.hostname}`);
      }
    }

    const isHttps = parsed.protocol === "https:";
    const agent = createSafeHttpAgent(isHttps);

    // Use agent in fetch/axios with redirect: 'manual'
    const res = await fetch(currentUrl, {
      method: "GET",
      redirect: "manual",
      // @ts-ignore Node agent binding
      agent,
    });

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get("location");
      if (!location) throw new Error("Redirect response missing Location header");
      hops++;
      if (hops > maxHops) throw new Error(`SSRF blocked: Exceeded maximum redirect hops (${maxHops})`);

      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return res;
  }

  throw new Error("Redirect loop terminated");
}
```

---

### 7.2 Database Fallback Queue Schema & Worker Recovery

#### 1. Prisma Model Alignment (`prisma/schema.prisma`)
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

#### 2. Worker Recovery & Heartbeat Lease Extension (`apps/web/src/lib/fallback-queue.ts`)
```typescript
import { prisma } from "./prisma";
import { logger } from "./logger";

export interface FallbackJob {
  id: string;
  queueName: string;
  data: any;
  attempts: number;
  maxAttempts: number;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
  createdAt: Date;
  processedAt?: Date;
}

/**
 * Claims next pending or timed-out job using FOR UPDATE SKIP LOCKED
 */
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

/**
 * Worker Heartbeat: Extends visibility timeout lease for long-running ingestion/RAG tasks
 */
export async function heartbeatFallbackJob(jobId: string): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE fallback_queue
      SET processed_at = NOW()
      WHERE id = ${jobId} AND status = 'processing'
    `;
  } catch (error) {
    logger.warn("Failed to heartbeat fallback job", { jobId, error });
  }
}

/**
 * Records successful job completion
 */
export async function completeFallbackJob(jobId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE fallback_queue
    SET status = 'completed',
        completed_at = NOW(),
        processed_at = NOW()
    WHERE id = ${jobId}
  `;
}

/**
 * Records job failure with error stack trace
 */
export async function failFallbackJob(jobId: string, error: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE fallback_queue
    SET status = 'failed',
        error = ${error},
        processed_at = NOW()
    WHERE id = ${jobId}
  `;
}

function formatFallbackJob(raw: any): FallbackJob {
  return {
    id: raw.id,
    queueName: raw.queue_name,
    data: raw.data,
    attempts: raw.attempts,
    maxAttempts: raw.max_attempts,
    status: raw.status,
    error: raw.error,
    createdAt: raw.created_at,
    processedAt: raw.processed_at,
  };
}
```

---

### 7.3 Cryptographic Audit Log Integrity Verification (`apps/web/src/lib/audit.ts`)

#### 1. Persisted Timestamp HMAC Signing
```typescript
import { prisma } from "./prisma";
import { createHmac, createHash, timingSafeEqual } from "crypto";
import { env } from "./env";
import { Role } from "@prisma/client";

export interface AuditLogEntry {
  userId: string;
  adminRole: Role;
  action: string;
  targetType?: string;
  targetId?: string;
  previousState?: any;
  newState?: any;
  metadata?: any;
  reason?: string;
  ticketId?: string;
  ipAddress?: string;
  userAgent?: string;
  mfaVerified?: boolean;
}

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

/**
 * Verifies audit log cryptographic integrity using timing-safe comparison
 * Guards buffer lengths to prevent unhandled RangeError on tampered signatures
 */
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

  const actualBuf = Buffer.from(entry.integrityHash, "hex");
  const expectedBuf = Buffer.from(expected, "hex");

  // Buffer length guard eliminates Node ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH RangeError
  if (actualBuf.length !== expectedBuf.length || actualBuf.length === 0) {
    return false;
  }

  return timingSafeEqual(actualBuf, expectedBuf);
}
```

---

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
| **AC-05** | Production build succeeds without prod secrets | `powershell -Command "$env:NEXT_PHASE='phase-production-build'; $env:NODE_ENV='production'; $env:APP_ENV='development'; npm run build"` | `0` | Next.js compilation succeeds cleanly using dummy `DATABASE_URL` |
| **AC-06** | Production runtime rejects `SKIP_PROD_VALIDATION=1` | `npm --workspace=@aegis-ai/web test -- src/__tests__/lib/env.test.ts -t 'rejects SKIP_PROD_VALIDATION in production'` | `0` | Throws `CRITICAL SECURITY VIOLATION` error |
| **AC-07** | Production runtime rejects dev secrets & short keys | `npm --workspace=@aegis-ai/web test -- src/__tests__/lib/env.test.ts -t 'validates secret entropy'` | `0` | Throws `JWT_ACCESS_SECRET must be at least 64 random characters` |
| **AC-08** | Atomic refresh rotation & 5 concurrent requests | `npm --workspace=@aegis-ai/web test -- src/__tests__/services/auth/session-concurrency.test.ts -t 'handles 5 concurrent refresh requests'` | `0` | Exactly 1 rotation, 4 grace returns, 0 deleted sessions |
| **AC-09** | Replay outside 5s grace window revokes family | `npm --workspace=@aegis-ai/web test -- src/__tests__/services/auth/session-concurrency.test.ts -t 'revokes family on expired replay'` | `0` | Throws `TOKEN_REPLAY_EXPIRED`, deletes all user sessions |
| **AC-10** | Grace window cross-client replay detection | `npm --workspace=@aegis-ai/web test -- src/__tests__/services/auth/session-concurrency.test.ts -t 'detects cross-client replay (foreign IP and User-Agent) during grace window'` | `0` | Throws `SUSPICIOUS_CROSS_NETWORK_REPLAY`, revokes family |
| **AC-11** | SSRF socket agent blocks private IPs & IMDS | `npm --workspace=@aegis-ai/web test -- src/__tests__/security/ssrf.test.ts -t 'blocks internal IPs at socket level'` | `0` | Blocks `127.0.0.1`, `169.254.169.254`, `::ffff:127.0.0.1` |
| **AC-12** | SSRF blocks TOCTOU DNS rebinding attack | `npm --workspace=@aegis-ai/web test -- src/__tests__/security/ssrf.test.ts -t 'prevents TOCTOU DNS rebinding'` | `0` | Zero socket payload transmitted; request rejected |
| **AC-13** | SSRF 3-hop redirect interceptor validates target | `npm --workspace=@aegis-ai/web test -- src/__tests__/security/ssrf.test.ts -t 'validates redirect destination'` | `0` | Follows safe URL; terminates on internal redirect |
| **AC-14** | Fallback queue executes with column `error` | `npm --workspace=@aegis-ai/web test -- src/__tests__/lib/fallback-queue.test.ts -t 'records job error'` | `0` | `UPDATE fallback_queue SET error = ...` succeeds |
| **AC-15** | Stuck fallback job reclaimed after 5 minutes | `npm --workspace=@aegis-ai/web test -- src/__tests__/lib/fallback-queue.test.ts -t 'reclaims stuck processing jobs'` | `0` | Job in processing > 5 min reset and claimed; active heartbeat extends lease |
| **AC-16** | Chat SSE accepts `fileId` and parses image | `npm --workspace=@aegis-ai/web test -- src/__tests__/api.chat.streaming.test.ts -t 'processes file attachment'` | `0` | 200 OK stream; image data URL injected |
| **AC-17** | Chat SSE blocks users exceeding monthly quota | `npm --workspace=@aegis-ai/web test -- src/__tests__/api.chat.streaming.test.ts -t 'enforces quota limits'` | `0` | 403 Forbidden with upgrade prompt |
| **AC-18** | Cryptographic audit log verification passes | `npm --workspace=@aegis-ai/web test -- src/__tests__/lib/audit.test.ts -t 'verifies audit entry integrity'` | `0` | `verifyAuditEntryIntegrity` returns true on valid record, false on tampered length |
| **AC-19** | Full workspace typecheck passes | `npx tsc --noEmit` | `0` | Zero TypeScript compiler errors |
| **AC-20** | Full repository production build succeeds | `npm run build:all` | `0` | Next.js and workspace builds succeed cleanly |

---

## 10. Master Feature Inventory (Features Discovered)

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| F-01 | Auth / Concurrency | Atomic Token Rotation with Row-Level Lock | Conditional `updateMany` rotation preventing split-brain sessions | Old refresh token, user ID | New JWT pair, Set-Cookie | 401 on invalid/expired/replayed token | `session.ts`, Finding CRIT-AUTH-02 |
| F-02 | Auth / Concurrency | Idempotent Concurrency Grace Window | 5s grace window returning active tokens from Redis cache without cookie poisoning | Replayed token within 5s of rotation | Active valid token pair | 401 if presented after 5s (family wipeout) | Finding CRIT-AUTH-01, CRIT2-AUTH-02 |
| F-03 | Auth / Resilience | Redis Fail-Safe Session Grace Degradation | Defensive try/catch wrapping around Redis calls in session rotation | Cached token or Redis failure | Token pair or Access Token only | Gracefully falls back to DB/stateless return without 500 | Finding CRIT2-AUTH-01 |
| F-04 | Auth / Security | Grace Window Client Fingerprint Binding | Cross-network IP / User-Agent verification during grace window | Client IP, User-Agent header | Boolean verification | 401 + immediate family revocation if both IP & UA mismatch | Finding CRIT-AUTH-05, CRIT2-AUTH-02 |
| F-05 | Auth / Persistence | Indexed Token Successor Lineage | Indexed `replacedByTokenHash` preventing full table scans | Token hash lookup | Session database record | Query timeout eliminated | Finding CRIT-AUTH-04 |
| F-06 | Environment | Build-Phase Secret Decoupling & Dummy Fallback | Bypasses runtime credential validation during `NEXT_PHASE=phase-production-build` with dummy `DATABASE_URL` | `NEXT_PHASE`, `NODE_ENV` | Static compilation output | Allows standalone compilation without database | Finding CRIT-ENV-01, CRIT2-ENV-01 |
| F-07 | Environment | Strict Runtime Security Enforcement | Unbypassable validation at server runtime (`next start`); blocks `SKIP_PROD_VALIDATION=1` | Runtime environment variables | Typed `env` config | Fatal process exit with error list | `env.ts` |
| F-08 | Perimeter / SSRF | Direct IP Literal Pre-Connection Validation | Immediate validation of target hostname against CIDR blocklist if `net.isIP(host)` | Target URL / hostname | Validated IP | Throws SSRF error prior to socket dial | Finding CRIT2-SEC-01 |
| F-09 | Perimeter / SSRF | Socket `createConnection` Interceptor Agent | Custom HTTP agent overriding `createConnection` checking `socket.remoteAddress` on connect | Socket options | Raw TCP/TLS socket | Destroys socket before HTTP payload transmission | Finding CRIT-SEC-01, CRIT2-SEC-01 |
| F-10 | Perimeter / SSRF | Dual-Stack & IPv4-Mapped IPv6 Normalization | Exhaustive CIDR filtering with `::ffff:0:0/96` translation and DNS length guard | Hostname / IP string | Normalized IP address | Throws on any private/loopback/IMDS IP or empty DNS | Finding CRIT-SEC-02, CRIT2-SEC-01 |
| F-11 | Perimeter / SSRF | Safe 3-Hop Redirect Interceptor | Manual redirect loop verifying destination protocol and IP on each hop | HTTP 3xx response, Location header | Validated response stream | Terminates if redirect hops > 3 or targets internal IP | Finding CRIT-SEC-03 |
| F-12 | Persistence / Queue | Aligned Fallback Queue Schema | Prisma model `FallbackQueue` with column `error` matching raw SQL | Job payload, queue name | Job record in `fallback_queue` | Database runtime crash eliminated | Finding CRIT-DB-01 |
| F-13 | Persistence / Queue | Fallback Queue Processed Index | Index on `processed_at` preventing table scans during cleanup | Retention cutoff timestamp | Count of purged rows | Table bloat query timeout eliminated | Finding CRIT-DB-02 |
| F-14 | Persistence / Queue | 5-Minute Worker Visibility Timeout | Reclaims jobs stuck in `processing` status due to worker crashes | Queue name, 5-min threshold | Active claim on expired job | Stuck jobs automatically re-queued | Finding CRIT-DB-03 |
| F-15 | Persistence / Queue | Worker Visibility Lease Heartbeat | `heartbeatFallbackJob(jobId)` periodically extending job lease | Job ID | Updated `processed_at` | Prevents preemption of long-running ingestion/RAG tasks | Finding CRIT2-QUEUE-01 |
| F-16 | Chat / Multi-Modal | SSE File Attachment Handling | Accepts `fileId` in SSE route and injects image data URL into prompt | `chatId`, `message`, `fileId` | Multi-modal LLM stream | 400 if file not found or unauthorized | Finding CRIT-CHAT-01 |
| F-17 | Chat / Governance | SSE Monthly Plan Quota Enforcement | Invokes `checkQuota` before starting SSE stream | `userId` | Token stream or 403 error | 403 Forbidden with upgrade prompt | Finding CRIT-CHAT-02 |
| F-18 | Chat / Architecture | Dual-Mode Chat Execution Router | Interactive SSE for UI; BullMQ queue for multi-step agent tools | Request path / tool flag | Stream or Job ID | Dispatches to optimal executor | Finding CRIT-CHAT-03 |
| F-19 | Audit / Cryptography | Persisted Timestamp HMAC Signing | Signs fixed `createdAt` timestamp stored in database | Audit entry, `createdAt` Date | Verifiable HMAC-SHA256 hex string | Runtime error if key missing in prod | Finding CRIT-AUDIT-01 |
| F-20 | Audit / Verification | Length-Guarded Timing-Safe Verification Utility | Timing-safe verification guarded by buffer length equality check | Database `AuditLog` record | Boolean validity result | Returns false without RangeError crash on malformed hash | Finding CRIT-AUDIT-01, CRIT2-AUDIT-01 |
| F-21 | Rate Limiting | Connection-Isolated IP Resolution | Resolves client IP via socket address or rightmost proxy hop; avoids static `"unknown"` | `NextRequest` | Resolved client IP string | Prevents global DoS for unproxied users | Finding CRIT-RATE-01 |
| F-22 | CI/CD | Blocking Dependency Vulnerability Audit | Strict auditing via `audit-ci` with explicit baseline whitelist | `audit-ci.json`, npm lockfile | CI exit code 0 or 1 | Fails CI on unapproved high/crit CVEs | Finding CRIT-ENV-02 |
| F-23 | CI/CD | Blocking Secret Scanning Pipeline | Scans full commit range using official `gitleaks-action@v2` | Commit range | Gitleaks report | Fails CI on detected secrets | `security.yml` |

---

## 11. Edge Cases Matrix

| # | Feature | Input / Trigger | Expected Observable Behavior |
|---|---|---|---|
| E-01 | Session Rotation | 2 parallel requests with identical refresh token (0ms delta) | Request A updates `replacedAt` atomically and mints new tokens; Request B sees `count === 0`, retrieves active token pair from Redis, and returns it; zero sessions deleted. |
| E-02 | Session Rotation | Token replayed 6 seconds after rotation | Elapsed time exceeds 5s grace window; entire session family revoked; user `tokenVersion` incremented; 401 Unauthorized returned. |
| E-03 | Session Rotation | Token replayed within 5s from foreign IP and foreign User-Agent | Cross-client fingerprint mismatch (`!ipMatches && !uaMatches`) triggers `SUSPICIOUS_CROSS_NETWORK_REPLAY`; grace window aborted; family revoked immediately; 401 returned. |
| E-04 | Session Rotation | Mobile client switches from WiFi to LTE within 5s grace window | IP address differs but User-Agent matches; request permitted; returns valid active token pair; session remains active. |
| E-05 | Session Rotation | Redis crashes or times out during token rotation | `try/catch` catches Redis error; PostgreSQL transaction commits successfully; response returns fresh tokens or access token without crashing with 500. |
| E-06 | Session Rotation | Refresh request presenting expired token (`now() > expiresAt`) | Session record deleted from database; 401 Unauthorized returned; other active sessions unaffected. |
| E-07 | Session Rotation | Refresh request by banned user (`isBanned: true`) | Immediate 403 Forbidden; session not rotated; active sessions purged. |
| E-08 | Environment | `next build` executed with omitted `DATABASE_URL` | `NEXT_PHASE === 'phase-production-build'` detected; dummy database URL fallback applied; compilation succeeds cleanly with exit code 0. |
| E-09 | Environment | Production server boot with `SKIP_PROD_VALIDATION=1` | Runtime production check detects bypass attempt; throws fatal `CRITICAL SECURITY VIOLATION` error; process terminates. |
| E-10 | Environment | Production server boot with default `dev-access-secret` | Process throws fatal validation error requiring 64-char random secret; startup halts. |
| E-11 | SSRF Guard | Direct request to `http://169.254.169.254/latest/meta-data/` | Pre-connection check detects IP literal; or agent `createConnection` intercepts IP before dialing; request aborted immediately. |
| E-12 | SSRF Guard | URL `http://rebind.attacker.com` returning public IP on lookup, private IP on socket connect | Custom HTTP agent checks socket destination IP on `connect` event; socket destroyed before HTTP payload is transmitted. |
| E-13 | SSRF Guard | URL `http://[::ffff:169.254.169.254]/latest/meta-data/` | IPv4-mapped IPv6 normalized to `169.254.169.254`; matched against blocked cloud metadata CIDR; rejected immediately. |
| E-14 | SSRF Guard | DNS server returns empty address array (`addresses.length === 0`) | Agent lookup asserts `addresses.length > 0`; returns clean DNS error without throwing unhandled `TypeError`. |
| E-15 | SSRF Guard | Public URL 302-redirecting to `http://127.0.0.1:6379/` | Redirect interceptor inspects `Location` header, resolves destination IP, detects loopback CIDR, and aborts request before hop 2. |
| E-16 | Fallback Queue | Long-running ingestion task executing for 8 minutes | Worker calls `heartbeatFallbackJob(jobId)` every 60 seconds; `processed_at` updated; job lease maintained; preemption avoided. |
| E-17 | Fallback Queue | Worker crashes abruptly without completing or heartbeating | After 5 minutes, `getNextFallbackJob` visibility timeout detects expired `processed_at`; resets status and reclaims job for next healthy worker. |
| E-18 | Chat SSE Stream | User submits chat request containing `fileId` pointing to PNG image | `bodySchema` validates `fileId`; file record retrieved; image encoded to base64 data URL; OpenAI vision prompt dispatched; tokens streamed. |
| E-19 | Chat SSE Stream | Free-tier user exceeding monthly token quota sends chat message | `checkQuota(userId)` returns `allowed: false`; route returns 403 Forbidden with `"Monthly token quota exceeded"`; LLM is not called. |
| E-20 | Chat SSE Stream | Client closes browser tab after 10 chunks received | Server catches `req.signal.aborted`; terminates OpenAI stream; persists partial message with `isPartial: true`. |
| E-21 | Audit Log | Audit entry verified with corrupted or truncated 16-byte hex hash | `verifyAuditEntryIntegrity` asserts `actualBuf.length === expectedBuf.length`; returns `false` without throwing Node `RangeError`. |
| E-22 | Audit Log | Security auditor verifies historical audit record against `AUDIT_SIGNING_KEY` | `verifyAuditEntryIntegrity` recomputes HMAC using stored `createdAt` timestamp; matches `integrityHash`; returns `true`. |
| E-23 | Rate Limiting | Self-hosted server receives requests without reverse proxy `x-forwarded-for` | Socket address resolved; client requests isolated; static `"unknown"` bucket DoS vulnerability eliminated. |
| E-24 | Monorepo Test CLI | Acceptance criteria command executed from monorepo root | `--workspace=@aegis-ai/web` flag restricts Jest execution to web package; `apps/mobile` skipped; clean exit code 0. |

---

## 12. Verification & Implementation Roadmap

Milestones for the remediation team (on branch `remediation/engineering-hardening`):

- **Milestone 1**: Branch setup & workflow configuration (CI fail-close, Gitleaks, Node 20 LTS).
- **Milestone 2**: Environment hardening (`env.ts` build dummy & runtime security assertions).
- **Milestone 3**: Database schema migrations & fallback queue alignment (`model FallbackQueue`, `model Session` indexes).
- **Milestone 4**: Refresh token rotation hardening (`session.ts`, Redis try/catch, 5s grace window, client binding).
- **Milestone 5**: Socket-level SSRF defense (`ssrf-guard.ts`, IP literal handling, agent `createConnection`, 3-hop redirect).
- **Milestone 6**: Chat SSE endpoint preservation & quota enforcement (`stream-sse/route.ts`).
- **Milestone 7**: Cryptographic audit log verification (`audit.ts` length guard).
- **Milestone 8**: Full monorepo verification & production readiness (AC-01 through AC-20).
