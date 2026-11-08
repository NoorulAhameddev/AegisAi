# Engineering Remediation Specification (v1)
**Project**: Aegis AI Engineering Hardening Campaign  
**Author**: Principal Architect (Specification Author — Round 1)  
**Date**: 2026-11-07  
**Status**: DRAFT FOR INDEPENDENT CRITIC REVIEW (Round 1 of 3)  
**Target Repository**: `https://github.com/NoorulAhameddev/AegisAi`  
**Base Commit**: `3936ba40129c16b07c9b91a1bb35a7df0f390f7a`  

---

## Executive Summary

This document establishes **Specification v1** for the comprehensive engineering remediation of the Aegis AI platform. It operationalizes requirements **R1 through R6** defined in `ORIGINAL_REQUEST.md`, synthesized from the empirical findings of the Initial Repository Audit and the three specialized technical surveys (System Architecture, Security & Authentication, and DevOps & QA).

The goal of this campaign is to transform Aegis AI from an unstable, fail-open prototype into a provably secure, maintainable, and production-ready enterprise AI system. In accordance with requirement **R1**, this specification is subject to three independent refinement rounds. **No production or application source code shall be altered until this specification passes formal review and approval.**

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
- Pull requests or branch merges from `remediation/engineering-hardening` into `main` are strictly prohibited until Milestone 8 (Final Production Readiness Verification) is complete and approved.

### 1.3 Strict Isolation of PR #30 (Dependabot 91-Package Churn)
- **Status of PR #30** (`262bd54`): Proposes updating 91 packages (+21,555 / -18,708 lines in `package-lock.json`).
- **Policy**: PR #30 must be **completely isolated** from this remediation campaign.
- **Rationale**: Simultaneously upgrading 91 dependencies (including major breaking changes in LangChain, Next.js, and React) alongside critical security patches introduces unmanageable regression risk, invalidates audit baselines, and makes root-cause isolation impossible. Dependency modernization must occur under a separate release lifecycle after security baselines are locked.

### 1.4 Selective Porting Criteria for PR #25 (`fix/critical-security-patches`)
- **Status of PR #25** (`0e4bc3a`): Diverged at `c212da9` with 50+ commits attempting Expo SDK 58 migration, containing extensive lockfile churn and broken workflow artifacts.
- **Policy**: PR #25 must **never be cherry-picked wholesale**.
- **Porting Criteria**: Implementation agents may only port isolated, self-contained algorithmic logic from PR #25:
  1. *SSRF Defense Logic*: Private IP CIDR ranges, loopback rejection, and DNS pre-resolution patterns (`eda6291`, `6b1a9a0`).
  2. *Trusted Proxy Hop Indexing*: Sourcing client IPs from trusted reverse proxy hops rather than untrusted leftmost `x-forwarded-for` (`ec65b4e`, `944c981`).
  3. *Multipart Upload Pre-filtering*: Rejection of oversized payloads prior to temporary disk writes (`b576dad`).
- All ported logic must be cleanly adapted, typed, and accompanied by unit regression tests.

---

## 2. Identification of Missing Requirements & Ambiguous Instructions

This section formally resolves ambiguities and fills architectural gaps identified between `ORIGINAL_REQUEST.md`, existing code, and production operations:

### 2.1 Refresh Token Concurrency Window vs Replay Detection Window
- **Ambiguity in Request**: `ORIGINAL_REQUEST §R4` specifies: "correctly handle concurrent refresh attempts, enforce safe replay detection without weakening protection for convenience... prevent session duplication and stale-token reuse." It does not define how to distinguish concurrent legitimate browser tabs from a malicious replay.
- **Architectural Gap in Code**: `apps/web/src/app/api/auth/refresh/route.ts` immediately deletes all user sessions (`prisma.session.deleteMany`) if an old token is presented (`!session`). Two concurrent tab reloads result in the second tab wiping out all user sessions.
- **Resolution & Specification**:
  1. **Session Lineage Tracking**: Add `replacedAt DateTime?` and `replacedByTokenHash String?` fields to the `Session` model.
  2. **15-Second Concurrency Grace Window**: When a refresh token is rotated, do not hard-delete the database record immediately. Instead, within an interactive transaction, mark `replacedAt = now()` and store the hash of the successor token in `replacedByTokenHash`.
  3. **Concurrent Request Handling**: If a refresh request arrives presenting a token that was replaced within the last 15 seconds (`now() - replacedAt <= 15s`), the server treats this as a benign concurrent race (e.g., multi-tab loading). It returns the *existing* active session tokens associated with `replacedByTokenHash` without creating a duplicate session and without revoking the family.
  4. **Strict Replay Revocation**: If a token is presented whose `replacedAt` is older than 15 seconds, or if a revoked session is reused, the request is classified as an active replay attack. The system must immediately revoke the entire session family for that user (`prisma.session.deleteMany({ where: { userId } })`), increment `user.tokenVersion`, invalidate the Redis cache, and log a critical security event.

### 2.2 Production CORS Domain Formatting & Credential Invariants
- **Ambiguity in Request**: `ORIGINAL_REQUEST §R3` states: "validate production CORS origins." It does not specify origin syntax or credential handling.
- **Architectural Gap in Code**: `env.ts` performs a naive substring search (`parsed.data.ALLOWED_ORIGINS.includes("localhost")`), which allows `ALLOWED_ORIGINS="*"` or malformed origins. Meanwhile, `middleware.ts` sets `Access-Control-Allow-Credentials: true`. Setting `Access-Control-Allow-Origin: *` with credentials enabled violates the W3C CORS specification and is rejected by all modern browsers.
- **Resolution & Specification**:
  1. `ALLOWED_ORIGINS` in production must parse as a comma-separated list of explicit, valid URLs (`z.string().url()`).
  2. The wildcard `*` is strictly disallowed when credentials are supported.
  3. In production (`APP_ENV=production` or `NODE_ENV=production`), every listed origin must enforce the `https://` scheme. Any origin with `http://` or containing `localhost` / `127.0.0.1` must throw an unrecoverable validation error during startup.

### 2.3 Secret Provider Validation & Worker Decoupling
- **Ambiguity in Request**: `ORIGINAL_REQUEST §R3` states: "review worker environment validation against the actual configured secrets provider."
- **Architectural Gap in Code**: `secrets.ts` unconditionally calls AWS KMS regardless of `SECRET_PROVIDER`. `chat.worker.ts` and `video-summary.worker.ts` maintain separate arrays of required env vars requiring `AWS_REGION` and `ENCRYPTION_KEY_CIPHERTEXT` even in local or non-AWS deployments.
- **Resolution & Specification**:
  1. `apps/web/src/lib/env.ts` is the single source of truth for environment validation across API routes, workers, and background scripts.
  2. Implement conditional Zod schema refinements:
     - When `SECRET_PROVIDER === 'aws-kms'`: `AWS_REGION` and `ENCRYPTION_KEY_CIPHERTEXT` are required.
     - When `SECRET_PROVIDER === 'local'`: `ENCRYPTION_KEY` (minimum 32 bytes / 64 hex characters) is required.
  3. `apps/web/src/lib/secrets.ts` must branch on `env.SECRET_PROVIDER`: if `'local'`, decrypts using the local `ENCRYPTION_KEY`; if `'aws-kms'`, calls AWS KMS with exponential backoff.
  4. Workers must import `@/lib/env` directly and eliminate redundant manual validation arrays.

### 2.4 Dependency Vulnerability Policy & CI Audit Exit Criteria
- **Ambiguity in Request**: `ORIGINAL_REQUEST §R2` states: "eliminate `npm audit --audit-level=high || true` in security workflows, enforce an explicit dependency vulnerability policy... document unpatched upstream vulnerabilities separately."
- **Operational Reality**: Baseline `npm audit` reveals 126 vulnerabilities (13 critical, 53 high) in third-party libraries (e.g. LangChain, MCP SDK). Simply removing `|| true` without an exemption policy will permanently break CI across the repository.
- **Resolution & Specification**:
  1. Remove `|| true` from all workflows.
  2. Implement an automated dependency auditing harness using an explicit `.auditrc` or `audit-ci.json` policy file.
  3. Document all 126 current baseline vulnerabilities with CVSS score, affected package path, advisory URL, and upstream status in `docs/security/VULNERABILITY_ASSESSMENT.md`.
  4. Whitelist only verified upstream vulnerabilities that cannot be resolved without breaking changes (PR #30 isolation).
  5. Any newly introduced or unapproved High or Critical vulnerability will exit with non-zero status and block CI merging.

### 2.5 Dual-Mode Chat Execution Model
- **Ambiguity in Request**: `ORIGINAL_REQUEST §R5` states: "trace the complete request lifecycle to determine whether direct AI provider calls versus asynchronous BullMQ processing is intentional or an architectural inconsistency, implement the least risky architecture preserving actual requirements without an unnecessary rewrite."
- **Resolution & Specification**: Formalize a **Dual-Mode Chat Execution Architecture**:
  1. **Direct Stream Route (`/api/chat/stream-sse`)**: The primary path for interactive web user interfaces (`ChatClient.tsx`). Delivers real-time Server-Sent Events, client disconnect abortion, backpressure buffers, partial persistence, token budget reservation, RAG sanitization, and usage metric logging.
  2. **Asynchronous Queue Route (`/api/chat/stream`)**: Preserved for asynchronous background workloads, polling clients (e.g., `apps/mobile`), and heavy tasks that exceed HTTP gateway timeout limits.
  3. Document the reconciled architecture in `docs/architecture/ARCHITECTURE_DEEP_DIVE.md`.

---

## 3. CI/CD & Pipeline Enforcement Specification (R2 - P0)

### 3.1 Elimination of Fail-Open Configurations
1. **Remove `continue-on-error: true`**:
   - `.github/workflows/ci.yml:132`: Remove `continue-on-error: true` from the `test` job step `Run tests with coverage`.
   - `.github/workflows/tests.yml:59`: Remove `continue-on-error: true` from the `test` step `Run tests`.
   - Invariant: A failure in any unit, integration, or coverage test suite must immediately fail the step and terminate the workflow run with non-zero exit status.
2. **Remove `|| true` from Security Audits**:
   - `.github/workflows/security.yml:40`: Replace `run: npm audit --audit-level=high || true` with strict audit enforcement using `npx audit-ci --config audit-ci.json`.
3. **Blocking Gitleaks Secret Scanning**:
   - `.github/workflows/security.yml:41-47`:
     - Remove `continue-on-error: true`.
     - Remove `GITLEAKS_ARGS: '--no-git'`.
     - Remove `args: '--staged --exit-code 1'`.
     - Configure standard commit range scanning:
       ```yaml
       - name: Run Gitleaks Secret Scan
         uses: gitleaks/gitleaks-action@v2
         env:
           GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
           GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }} # Optional for public/standard
       ```
     - Invariant: Any detected plaintext high-entropy secret, API key, or credential must immediately fail the build.

### 3.2 Workflow Deduplication and Trigger Harmonization
1. **Workflow Consolidation**:
   - Consolidate overlapping tasks across `ci.yml`, `tests.yml`, and `lint.yml`.
   - Ensure a single canonical CI pipeline executes on all active development branches:
     ```yaml
     on:
       push:
         branches: [main, develop, remediation/*]
       pull_request:
         branches: [main, develop]
     ```
2. **Service Container & Database Consistency**:
   - Standardize test database name across all workflows to `aegis_ai_test`.
   - Ensure service containers for PostgreSQL 16 (with pgvector) and Redis 7 are uniformly declared with healthy readiness checks.
   - Fix `.github/workflows/deploy.yml`: Remove database-dependent integration tests from the container build step, or provision transient database service containers.
3. **Docker Push Configuration**:
   - `.github/workflows/docker.yml:46`: Make image pushing conditional on release tags and registry authentication, rather than hardcoding `push: false`.

### 3.3 Node.js Version & Action Standardization
1. **Unify on Node 20 LTS**:
   - Replace conflicting Node versions (Node 18 in `prisma-dry-run.yml`, Node 22 in `security.yml`) with Node `20.x` across all 8 workflow files.
2. **Standardize GitHub Actions**:
   - Replace all invalid or non-standard `actions/setup-node@v7` references with official `actions/setup-node@v4`.
   - Configure npm cache caching (`cache: 'npm'`) to accelerate CI execution.

---

## 4. Production Environment Configuration Hardening Specification (R3 - P0)

### 4.1 Unbypassable Production Security Validation
1. **Eliminate `SKIP_PROD_VALIDATION` in Production**:
   - Modify `apps/web/src/lib/env.ts`:
     ```typescript
     const isProduction =
       process.env.NODE_ENV === "production" ||
       process.env.APP_ENV === "production" ||
       process.env.APP_ENV === "staging";
     
     if (isProduction && process.env.SKIP_PROD_VALIDATION === "1") {
       throw new Error(
         "CRITICAL SECURITY VIOLATION: SKIP_PROD_VALIDATION=1 is strictly prohibited in production or staging environments!"
       );
     }
     ```
   - Ensure `apps/web/instrumentation.ts` and `apps/web/src/lib/prisma.ts` do not bypass error handlers or connection pool limits via `SKIP_PROD_VALIDATION`.
2. **Decouple Build Phase from Runtime Execution**:
   - Check `process.env.NEXT_PHASE`: During Next.js static page generation (`phase-production-build`), allow mock compilation configurations so that static builds succeed without embedding live production secrets into build images.
   - At server boot (`next start` / runtime), execute strict, non-bypassable validation.

### 4.2 Harmonize `APP_ENV` and `NODE_ENV`
1. Prohibit contradictory environments:
   - If `NODE_ENV === "production"`, `APP_ENV` must default to `"production"` (not `"development"`).
   - If `NODE_ENV === "production"` and `APP_ENV === "development"`, throw a fatal configuration exception.
   - Security assertions must execute if `NODE_ENV === "production" || APP_ENV === "production"`.

### 4.3 Elimination of Insecure Default Secrets
1. In `apps/web/src/lib/env.ts`, remove all fallback default values for security secrets:
   - `JWT_ACCESS_SECRET`: Remove `.default("dev-access-secret-min-32-chars-long!")`.
   - `JWT_REFRESH_SECRET`: Remove `.default("dev-refresh-secret-min-32-chars-long!")`.
   - `AUDIT_SIGNING_KEY`: Remove `.default("dev-only-insecure-key-replace-in-production-32chars")`.
   - `OPENROUTER_API_KEY`: Remove `.default("sk-dummy-openrouter-key-for-build")`.
2. Enforce minimum entropy requirements:
   - In production: `JWT_ACCESS_SECRET` >= 64 characters.
   - In production: `JWT_REFRESH_SECRET` >= 64 characters.
   - In production: `AUDIT_SIGNING_KEY` >= 64 characters.
   - In development/test: Allow relaxed secrets (min 32 characters) ONLY when `NODE_ENV !== "production" && APP_ENV !== "production"`.

### 4.4 Cryptographic Audit Signing Key Enforcement
1. In `apps/web/src/lib/audit.ts`:
   - Eliminate the unkeyed SHA-256 fallback:
     ```typescript
     // Disallow: return createHash("sha256").update(data).digest("hex");
     ```
   - Throw a runtime exception if `AUDIT_SIGNING_KEY` is missing in production. All audit log integrity hashes must be generated via HMAC-SHA256 with the verified secret.

### 4.5 Secrets Provider Harmonization
1. Update `apps/web/src/lib/env.ts` schema:
   - Add `ENCRYPTION_KEY: z.string().optional()`.
   - Super-refine `SECRET_PROVIDER`:
     - If `aws-kms`: require `AWS_REGION` and `ENCRYPTION_KEY_CIPHERTEXT`.
     - If `local`: require `ENCRYPTION_KEY` with minimum 64 hex characters (32 bytes).
2. Update `apps/web/src/lib/secrets.ts`:
   - Inspect `env.SECRET_PROVIDER`:
     - If `"local"`: Parse `Buffer.from(env.ENCRYPTION_KEY, 'hex')` directly without initializing KMS client.
     - If `"aws-kms"`: Instantiate `KMSClient` and decrypt `ENCRYPTION_KEY_CIPHERTEXT`.

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
}
```
Create a backwards-compatible Prisma migration `add_session_family_and_grace_tracking`.

### 5.2 Atomic Rotation Transaction Logic
Unify all refresh logic inside `apps/web/src/services/auth/session.ts` and invoke it from `apps/web/src/app/api/auth/refresh/route.ts`:
```typescript
export async function rotateSessionAtomic(
  oldRefreshToken: string,
  userAgent: string,
  ip: string
): Promise<{ accessToken: string; refreshToken: string }> {
  // 1. Verify token cryptographic signature and extract claims
  const payload = verifyRefreshToken(oldRefreshToken);
  const oldTokenHash = hashToken(oldRefreshToken);

  return await prisma.$transaction(async (tx) => {
    // 2. Fetch user to verify active status and token version
    const user = await tx.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isBanned: true, tokenVersion: true, role: true }
    });

    if (!user) {
      throw new AuthError("USER_NOT_FOUND", 401);
    }
    if (user.isBanned) {
      throw new AuthError("USER_BANNED", 403);
    }
    if (user.tokenVersion !== payload.tokenVersion) {
      throw new AuthError("TOKEN_VERSION_REVOKED", 401);
    }

    // 3. Find the existing session by token hash
    const session = await tx.session.findUnique({
      where: { token: oldTokenHash }
    });

    // 4. Handle Missing Session or Replay Detection
    if (!session) {
      // Check if this was a recently rotated session within grace window
      const recentRotation = await tx.session.findFirst({
        where: { replacedByTokenHash: oldTokenHash }
      });

      // If completely unknown, treat as reuse attack
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.user.update({
        where: { id: user.id },
        data: { tokenVersion: { increment: 1 } }
      });
      throw new AuthError("TOKEN_REUSE_DETECTED", 401);
    }

    // 5. Concurrency Grace Period Check
    if (session.replacedAt) {
      const gracePeriodMs = 15000; // 15 seconds
      const elapsed = Date.now() - session.replacedAt.getTime();
      if (elapsed <= gracePeriodMs && session.replacedByTokenHash) {
        // Safe concurrent request: retrieve active replacement session
        const replacementSession = await tx.session.findUnique({
          where: { token: session.replacedByTokenHash }
        });
        if (replacementSession && replacementSession.expiresAt > new Date()) {
          // Mint corresponding access token for caller
          const accessToken = signAccessToken({
            userId: user.id,
            role: user.role,
            tokenVersion: user.tokenVersion
          });
          // Return valid tokens without creating a third session
          return { accessToken, refreshToken: oldRefreshToken };
        }
      }
      // Replay outside grace window: revoke all sessions
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.user.update({
        where: { id: user.id },
        data: { tokenVersion: { increment: 1 } }
      });
      throw new AuthError("TOKEN_REPLAY_EXPIRED", 401);
    }

    // 6. Check Expiration
    if (new Date() > session.expiresAt) {
      await tx.session.delete({ where: { id: session.id } });
      throw new AuthError("SESSION_EXPIRED", 401);
    }

    // 7. Atomic Creation of New Session and Retirement of Old Session
    const newSessionId = crypto.randomUUID();
    const newRefreshToken = signRefreshToken({
      userId: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
      tokenId: newSessionId
    });
    const newAccessToken = signAccessToken({
      userId: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion
    });
    const newTokenHash = hashToken(newRefreshToken);

    // Update old session with replacement tracking
    await tx.session.update({
      where: { id: session.id },
      data: {
        replacedAt: new Date(),
        replacedByTokenHash: newTokenHash
      }
    });

    // Create new session
    await tx.session.create({
      data: {
        id: newSessionId,
        userId: user.id,
        token: newTokenHash,
        familyId: session.familyId,
        userAgent,
        ipAddress: ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  });
}
```

### 5.3 Ban and Revocation Consistency
1. In `apps/web/src/app/api/admin/users/[id]/ban/route.ts`:
   - Execute user ban, session deletion, and token version increment inside a single transaction:
     ```typescript
     await prisma.$transaction([
       prisma.user.update({
         where: { id: targetUserId },
         data: { isBanned: true, tokenVersion: { increment: 1 } }
       }),
       prisma.session.deleteMany({ where: { userId: targetUserId } })
     ]);
     await invalidateTokenVersion(targetUserId);
     ```
2. In `apps/web/middleware.ts`:
   - If Redis returns `null` for `getCachedTokenVersion(userId)` (cache miss or Redis outage), do not fail open. Perform a fast database query or fail closed on sensitive operations.
   - Verify `user.isBanned` in middleware.

---

## 6. Chat Execution Architecture Reconciliation Specification (R5 - P1)

### 6.1 Unified Dual-Mode Architecture Definition
Aegis AI adopts a clear, dual-mode chat execution model:
1. **Interactive Real-Time Mode (`/api/chat/stream-sse`)**:
   - Primary endpoint for `apps/web/src/app/chat/ChatClient.tsx`.
   - Streams LLM tokens directly to the client via Server-Sent Events (SSE).
   - Low latency, high responsiveness (TTFT < 500ms).
2. **Asynchronous Background / Queue Mode (`/api/chat/stream`)**:
   - Secondary endpoint for long-running workflows, background workers, and mobile applications (`apps/mobile`).
   - Uses BullMQ `chatQueue`, Redis, and PostgreSQL `fallback_queue`.

### 6.2 Hardening the Direct SSE Endpoint (`/api/chat/stream-sse`)
Incorporate enterprise safety and governance controls directly into `/api/chat/stream-sse/route.ts`:
1. **Token Budget Reservation & Finalization**:
   - Before invoking OpenAI, call `tokenBudgetManager.reserveBudget(userId, estimatedTokens)`. If unapproved, reject with friendly budget exceeded message.
   - Upon completion or abort, call `tokenBudgetManager.finalizeUsage(userId, estimatedTokens, actualTokens, { model, chatId })`.
2. **RAG Context Sanitization & Prompt Delimiters**:
   - Port `sanitizeRagContext` from `processor.ts`.
   - Wrap retrieved knowledge base context in `===EXTERNAL_KNOWLEDGE_BASE_START===` and `===EXTERNAL_KNOWLEDGE_BASE_END===` markers to prevent prompt injection.
   - Wrap the current user message in `===USER_MESSAGE_START===` and `===USER_MESSAGE_END===` boundaries.
3. **Usage Metrics Recording**:
   - Record token counts in `prisma.usageMetric.create({ data: { userId, tokens: totalTokens, model } })`.
4. **Resilience & Partial Message Persistence**:
   - Preserve client abort handler: `req.signal.addEventListener("abort")`.
   - If aborted or timed out, save accumulated chunks to `prisma.message` with `isPartial: true`.
   - Preserve stream backpressure (maximum 50 buffered chunks) and 120-second timeout promise.

### 6.3 Frontend Migration (`ChatClient.tsx`)
1. **Eliminate 1-Second Polling Loop**:
   - Update `apps/web/src/app/chat/ChatClient.tsx` to send POST requests to `/api/chat/stream-sse`.
   - Consume response body via `ReadableStream` reader (`response.body.getReader()`) or SSE decoder.
   - Append received token deltas to active message state incrementally.
2. **Abort Controller Support**:
   - Hook the UI "Stop Generation" button to `abortController.abort()`, cleanly severing the HTTP stream and triggering server-side partial persistence.

### 6.4 Technical Documentation Synchronization
- Update `docs/architecture/ARCHITECTURE_DEEP_DIVE.md` to document the verified dual-mode execution topology, replacing obsolete comments debating the removal of SSE or BullMQ.

---

## 7. Structured Security Remediation Specification (R6 - P0/P1)

### 7.1 Server-Side Request Forgery (SSRF) Defense
**Affected Files**: `apps/web/src/services/ingestion/ingestion.service.ts`, `apps/web/src/ai/tools/web-browser.ts`, `apps/web/src/tools/web-browser.ts`, `apps/web/src/services/rag/image-extraction.ts`.

1. **Strict SSRF Guard Utility (`apps/web/src/lib/security/ssrf-guard.ts`)**:
   - Implement `validateAndResolveSafeUrl(urlString: string): Promise<{ safe: boolean; resolvedIp: string; error?: string }>`:
     - Enforce protocol whitelist: `http:` and `https:` only.
     - Resolve hostname via Node.js `dns.promises.lookup()`.
     - Validate resolved IP against blocked CIDRs:
       - IPv4 Loopback: `127.0.0.0/8`
       - IPv4 Private: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
       - IPv4 Link-Local / AWS IMDS: `169.254.0.0/16`
       - IPv4 Broadcast / Carrier-Grade NAT: `0.0.0.0/8`, `100.64.0.0/10`
       - IPv6 Loopback: `::1`
       - IPv6 Unique Local: `fc00::/7`
       - IPv6 Link-Local: `fe80::/10`
   - Disable automatic redirect following (`maxRedirects: 0`), or re-resolve destination IP on every 3xx redirect hop.
   - Reject URLs containing internal hostnames (e.g., `localhost`, `*.internal`, `*.local`, `metadata.google.internal`).
2. Integrate SSRF guard into `fetchAndCleanWebPage()` and AI browser tools before any network request is dispatched.

### 7.2 Path Traversal & File Upload Validation
**Affected Files**: `apps/web/src/app/api/files/batch-upload/route.ts`, `apps/web/src/services/files/image-storage.ts`.

1. **Filename Sanitization & Randomization**:
   - Strip directory traversal sequences: use `path.basename(file.name)`.
   - Never use user-supplied names for physical disk paths. Generate random UUIDs:
     ```typescript
     const safeExt = path.extname(file.name).toLowerCase();
     const tempPath = join(uploadsDir, `temp-${crypto.randomUUID()}${safeExt}`);
     ```
   - Verify path containment:
     ```typescript
     if (!tempPath.startsWith(uploadsDir)) {
       throw new Error("Path traversal attempt detected");
     }
     ```
2. **File Type Whitelisting & SVG Hardening**:
   - Validate MIME types against allowed list: `application/pdf`, `text/plain`, `text/markdown`, `image/png`, `image/jpeg`.
   - Disallow direct execution of SVG files or serve with `Content-Security-Policy: default-src 'none'` and `Content-Disposition: attachment`.

### 7.3 Database Fallback Queue Schema Migration
**Affected Files**: `apps/web/src/lib/fallback-queue.ts`, `prisma/schema.prisma`.

1. **Add `FallbackJob` to Prisma Schema**:
   ```prisma
   model FallbackJob {
     id           String    @id
     queueName    String    @map("queue_name") @db.VarChar(100)
     data         Json
     attempts     Int       @default(0)
     maxAttempts  Int       @default(3) @map("max_attempts")
     status       String    @default("pending") @db.VarChar(20)
     createdAt    DateTime  @default(now()) @map("created_at")
     processedAt  DateTime? @map("processed_at")
     completedAt  DateTime? @map("completed_at")
     errorMessage String?   @map("error_message") @db.Text

     @@index([queueName, status], name: "idx_fallback_queue_status")
     @@index([createdAt], name: "idx_fallback_queue_created")
     @@map("fallback_queue")
   }
   ```
2. Generate and apply migration `20261108000000_create_fallback_queue_table`.
3. Verify that `addFallbackJob` and `processFallbackJobs` execute without database errors during Redis failure simulation.

### 7.4 Vector Provider SQL Interpolation Bug Fix
**Affected File**: `apps/web/src/lib/vector-providers/pgvector-provider.ts:219`.

1. Replace nested `$queryRaw` call:
   ```typescript
   // BUGGY:
   // ${filters?.sourceId ? prisma.$queryRaw`AND "sourceId" = ${filters.sourceId}` : prisma.$queryRaw``}

   // REMEDIATED:
   // Use Prisma.sql and Prisma.empty from @prisma/client
   import { Prisma } from "@prisma/client";

   const sourceFilter = filters?.sourceId
     ? Prisma.sql`AND "sourceId" = ${filters.sourceId}`
     : Prisma.empty;
   ```

### 7.5 Rate Limiting & Client IP Resolution
**Affected File**: `apps/web/src/lib/rate-limit.ts`.

1. **IP Resolution Invariants**:
   - Do not trust leftmost `x-forwarded-for` directly from client headers.
   - Sourcing IP priority:
     1. Socket connection IP (`req.ip` in Next.js).
     2. If behind trusted proxy (verified via `TRUSTED_PROXIES` configuration), parse the rightmost trusted hop from `x-forwarded-for`.
     3. Fallback to `"unknown"`.
2. For authenticated endpoints, key the rate limit by `rate_limit:user:${userId}` to prevent IP spoofing attacks from resetting quotas.

### 7.6 Mutating Auth CSRF Hardening
**Affected Files**: `apps/web/middleware.ts`, `apps/web/src/app/api/auth/logout/route.ts`.

1. Enforce CSRF token verification or Origin/Referer verification on mutating `/api/auth/*` routes, specifically `/api/auth/logout`.
2. Ensure session cookies use `SameSite: "lax"`, `HttpOnly: true`, and `Secure: true` in production.

### 7.7 PII Redaction in Logging
**Affected Files**: `apps/web/src/lib/logger.ts`, `apps/web/src/app/api/auth/login/route.ts`.

1. Replace partial string masking (`value.substring(0, 3) + "***"`) with total redaction `"[REDACTED]"` for sensitive fields (`password`, `token`, `secret`, `apiKey`, `pin`, `ssn`, `creditCard`).
2. Make `redactPII()` recursively traverse nested context objects.
3. In `login/route.ts`, return generic error messages (`"Authentication failed"`) without leaking database errors or exception messages to callers.

### 7.8 Docker Network Binding Hardening
**Affected File**: `infra/docker/docker-compose.yml`.

1. Change host port bindings for PostgreSQL (`5432:5432`) and Redis (`6379:6379`) to bind to `127.0.0.1` only:
   ```yaml
   ports:
     - "127.0.0.1:${DB_PORT:-5432}:5432"
   ```
2. Set `APP_ENV=production` in container environments.

---

## 8. Scope Boundaries & Non-Goals

To prevent scope creep, maintain implementation velocity, and protect system stability, the following boundaries are strictly enforced:

### 8.1 Explicit Non-Goals
1. **No Wholesale Major Dependency Upgrades**: PR #30's 91-package bump is completely out of scope. Dependencies must only be patched if required to fix confirmed high/critical CVEs.
2. **No Framework Rewrites**: No rewriting of Next.js 16 App Router, Prisma ORM, BullMQ, or Tailwind CSS into alternative frameworks.
3. **No Database Engine Swaps**: PostgreSQL 16 and Redis 7 remain the authoritative persistence and queue layers.
4. **No Destructive Database Changes**: Database migrations must remain backwards-compatible. Existing tables (`User`, `Session`, `Message`, `Chat`) must not be dropped or destructively altered.
5. **No AI Provider Abstraction Churn**: Maintain existing OpenAI API client contracts for streaming and tool execution.

---

## 9. Comprehensive Measurable Acceptance Criteria & Verification Matrix

### 9.1 CI/CD & Pipeline Enforcement (R2)
- [ ] `.github/workflows/ci.yml` and `tests.yml` contain zero instances of `continue-on-error: true` in test steps.
- [ ] `.github/workflows/security.yml` contains zero instances of `|| true` on security audit steps.
- [ ] Gitleaks scanning blocks PR merges upon detecting unencrypted high-entropy secrets or API keys.
- [ ] All 8 GitHub Actions workflows run exclusively on Node 20 LTS and reference `actions/setup-node@v4`.
- [ ] CI pipeline triggers consistently on `main`, `develop`, and `remediation/*` branches.

### 9.2 Production Environment Hardening (R3)
- [ ] `apps/web/src/lib/env.ts` throws a fatal error if `SKIP_PROD_VALIDATION=1` when `NODE_ENV=production` or `APP_ENV=production`.
- [ ] `env.ts` throws fatal errors if `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, or `AUDIT_SIGNING_KEY` use default dev keys or are shorter than 64 characters in production.
- [ ] `ALLOWED_ORIGINS` strictly validates full HTTPS URLs and rejects `*`, `http://`, and `localhost` in production.
- [ ] `secrets.ts` successfully retrieves keys locally when `SECRET_PROVIDER=local` without attempting AWS KMS network calls.
- [ ] Automated regression tests in `apps/web/src/__tests__/lib/env.test.ts` pass, verifying rejection of invalid configurations.

### 9.3 Authentication & Session Concurrency (R4)
- [ ] Refresh-token rotation executes inside an atomic Prisma interactive transaction.
- [ ] Parallel execution of 5 concurrent refresh requests presenting the identical token results in exactly one successful rotation and 4 safe idempotent returns within the 15-second grace window, with zero user session wipeouts.
- [ ] Presenting a rotated token after the 15-second grace window triggers immediate family revocation and logs a security alert.
- [ ] Banned users (`isBanned: true`) and revoked sessions receive 403 Forbidden / 401 Unauthorized across all routes, even during Redis cache misses.
- [ ] Automated concurrency test suite in `apps/web/src/__tests__/services/auth/session-concurrency.test.ts` passes with 100% assertion success.

### 9.4 Chat Execution Architecture Reconciliation (R5)
- [ ] `/api/chat/stream-sse` successfully streams SSE chunks (`text/event-stream`), enforces token budget limits, and sanitizes RAG context with delimiters.
- [ ] Client abort (`req.signal.aborted`) immediately terminates provider streaming and persists partial assistant messages with `isPartial: true`.
- [ ] `ChatClient.tsx` consumes `/api/chat/stream-sse` with real-time token rendering; 1-second status polling loop is eliminated.
- [ ] `/api/chat/stream` and BullMQ workers remain functional for background processing.
- [ ] Technical documentation in `docs/architecture/ARCHITECTURE_DEEP_DIVE.md` accurately describes the dual-mode architecture.

### 9.5 Structured Security Remediation (R6)
- [ ] Webpage ingestion (`ingest/webpage`) and AI tools reject private IP addresses (`127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`) and non-HTTP protocols.
- [ ] Batch file upload rejects traversal filenames (`../../`) and stores files with random UUID names.
- [ ] Table `fallback_queue` exists in Prisma schema and database migrations; fallback job insertion succeeds during Redis outage.
- [ ] `pgvector-provider.ts` constructs SQL fragments with `Prisma.sql` and executes without Promise interpolation syntax errors.
- [ ] Client IP rate limiting cannot be bypassed via spoofed `X-Forwarded-For` headers.
- [ ] Logging masks sensitive fields completely (`[REDACTED]`) without leaking initial characters.

### 9.6 Repository Verification Baseline
- [ ] `npm ci` executes cleanly across workspaces.
- [ ] `npx prisma generate` succeeds without errors.
- [ ] `npm run lint` passes across all active workspaces.
- [ ] `npx tsc --noEmit` passes across root and workspace configurations.
- [ ] `npm test` passes across all test suites with zero fake or tautological assertions.
- [ ] `npm run build:all` succeeds for `apps/web` and `apps/dashboard`.
- [ ] All 10 project deliverables are documented and verified with command outputs.

---

## 10. Master Feature Inventory (Features Discovered)

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| F-01 | Auth / Concurrency | Atomic Token Rotation | Transactional refresh token swap with lineage tracking | Refresh token cookie, client IP, User-Agent | New Access & Refresh JWT pair, Set-Cookie | 401 Unauthorized on invalid/expired/replayed token | `refresh/route.ts`, `session.ts` |
| F-02 | Auth / Concurrency | Concurrency Grace Window | 15s grace window returning active session on benign race | Replayed token within 15s of rotation | Existing valid Access & Refresh token pair | 401 if presented after 15s (triggers reuse wipeout) | Architectural investigation |
| F-03 | Auth / Security | Ban & Revocation Consistency | Immediate revocation of banned users and stale tokenVersions | JWT payload, DB user state | 200 OK if active | 403 Forbidden if banned; 401 if tokenVersion mismatch | `ban/route.ts`, `middleware.ts` |
| F-04 | Environment | Strict Runtime Validation | Non-bypassable Zod validation at server runtime startup | Environment variables (`process.env`) | Typed `env` config object | Fatal process exit with detailed error list | `env.ts`, `instrumentation.ts` |
| F-05 | Environment | Secrets Provider Branching | KMS vs local encryption key retrieval based on `SECRET_PROVIDER` | `SECRET_PROVIDER`, `ENCRYPTION_KEY` or KMS ciphertext | 32-byte binary encryption key Buffer | Fatal crash if required provider credentials missing | `secrets.ts`, `env.ts` |
| F-06 | Chat / Streaming | Direct SSE Token Stream | Real-time SSE streaming from OpenAI to client with abort handling | `chatId`, `message`, `projectId` | HTTP 200 `text/event-stream` SSE tokens | 429 on rate limit; 400 on bad input; partial save on abort | `stream-sse/route.ts` |
| F-07 | Chat / Security | RAG Sanitization & Delimiters | Context injection defense wrapping documents in boundary markers | Raw RAG retrieval text | Boundary-wrapped system prompt string | Neutralizes malicious instructions in user docs | `processor.ts`, `stream-sse/route.ts` |
| F-08 | Chat / Governance | Token Budget Governance | Pre-flight reservation and post-stream finalization of tokens | `userId`, estimated & actual token counts | Budget approval boolean | Friendly limit reached message if quota exceeded | `processor.ts`, `token-budget.ts` |
| F-09 | Chat / Client | Real-time Frontend Streaming | Incremental UI token rendering consuming `/api/chat/stream-sse` | User chat input | Dynamic message updates in React state | Error notification toast on stream failure | `ChatClient.tsx` |
| F-10 | Chat / Queue | Asynchronous Queue Processing | BullMQ worker execution for mobile & background jobs | HTTP POST `/api/chat/stream` | JSON `{ jobId, status: "queued" }` | 503 if Redis and fallback DB both fail | `stream/route.ts`, `processor.ts` |
| F-11 | Perimeter / SSRF | SSRF Guard & IP Pre-resolution | DNS lookup and private CIDR blocklist check before HTTP fetch | Target URL string | Safe boolean, resolved IP | Immediate rejection of private/link-local/IMDS IPs | `ingestion.service.ts`, `web-browser.ts` |
| F-12 | Perimeter / Files | Safe Batch File Storage | Path traversal prevention and UUID file naming for uploads | Multipart form files | Saved file records with safe disk paths | 413 on oversized; error on traversal attempt | `batch-upload/route.ts` |
| F-13 | Persistence | PostgreSQL Fallback Queue | Durable database queue activated during Redis failures | Job payload, queue name, max attempts | Job record in `fallback_queue` table | Throws if database connection fails | `fallback-queue.ts`, `create-fallback-queue.sql` |
| F-14 | Persistence / Vector | Safe Pgvector Query Assembly | Prisma.sql fragment interpolation for conditional filters | Query vector, user ID, optional source filter | Document similarity search results | SQL syntax error if Promise is interpolated | `pgvector-provider.ts` |
| F-15 | CI/CD | Blocking CI Pipeline | Genuinely blocking test, typecheck, lint, and build workflows | Git push / PR events | Pipeline pass / fail status | Non-zero exit code halts pipeline execution | `ci.yml`, `tests.yml` |
| F-16 | CI/CD | Blocking Secret Scanning | Scans repository commits for secrets and blocks on match | Git commit history | Scan report | Non-zero exit code blocks PR if secret found | `security.yml` |
| F-17 | Logging | Recursive PII Redaction | Complete masking of sensitive credentials in log streams | Arbitrary log context object | Redacted log context with `[REDACTED]` | Zero secret leakage in stdout / log files | `logger.ts` |

---

## 11. Edge Cases Matrix

| # | Feature | Input / Trigger | Expected Observable Behavior |
|---|---|---|---|
| E-01 | Session Rotation | 2 parallel requests with identical refresh token (0ms delta) | Request 1 rotates session and issues new token; Request 2 falls into 15s grace window and receives existing valid token; zero sessions deleted. |
| E-02 | Session Rotation | Token replayed 30 seconds after rotation | Request is identified as malicious replay; all user sessions deleted; user `tokenVersion` incremented; 401 Unauthorized returned. |
| E-03 | Session Rotation | Refresh request presenting expired token | Session record deleted from DB; 401 Unauthorized returned ("Session Expired"); other valid sessions unaffected. |
| E-04 | Session Rotation | Refresh request by banned user (`isBanned: true`) | Immediate 403 Forbidden; session not rotated; active sessions purged. |
| E-05 | Environment | `NODE_ENV=production` and `SKIP_PROD_VALIDATION=1` | Process throws uncatchable fatal exception during initialization; startup halts immediately. |
| E-06 | Environment | `NODE_ENV=production` and `APP_ENV=development` | Process throws configuration mismatch error; startup halts immediately. |
| E-07 | Environment | Production `ALLOWED_ORIGINS="*"` or containing `http://localhost:3000` | Process throws fatal CORS validation exception; startup halts immediately. |
| E-08 | Environment | `SECRET_PROVIDER=local` with missing `ENCRYPTION_KEY` | Process throws validation exception requiring 64-hex-char encryption key; startup halts. |
| E-09 | Chat SSE Stream | Client aborts stream after 15 chunks received (`req.signal.aborted`) | Server stops OpenAI stream immediately; persists 15 chunks to DB with `isPartial: true`; records usage metrics for 15 tokens. |
| E-10 | Chat SSE Stream | Upstream LLM takes > 120 seconds to complete | 120-second timeout promise rejects; error event emitted to client; partial response saved; connection closed. |
| E-11 | Chat SSE Stream | Slow client reading SSE slower than generation | Backpressure buffer pauses chunk consumption when buffered chunks exceed 50 until buffer drains. |
| E-12 | SSRF Guard | URL input: `http://169.254.169.254/latest/meta-data/` | DNS pre-resolution identifies link-local CIDR; request rejected immediately with SSRF security error; zero network dispatch. |
| E-13 | SSRF Guard | External domain `http://evil.com` redirecting (302) to `http://127.0.0.1:6379/` | Redirects disabled or redirect target resolved and blocked; request terminates with security error. |
| E-14 | Batch Upload | Upload file named `../../../../etc/shadow` | `path.basename` strips `../`; file stored as `uploads/temp-<uuid>.shadow`; path containment verified. |
| E-15 | Fallback Queue | Redis offline when user enqueues chat job | `addJobWithFallback` catches Redis error and executes `INSERT INTO fallback_queue`; job safely buffered in PostgreSQL. |
| E-16 | Pgvector Search | Search query with `filters.sourceId = "doc-123"` | `Prisma.sql` interpolates raw value safely; valid SQL executed; correct similarity results returned. |
| E-17 | Logging | Context `{ user: { pin: "1234", pass: "secret123" } }` | Recursive redaction masks all nested sensitive keys to `"[REDACTED]"`; no initial characters printed. |
