# Adversarial Critique: Engineering Remediation Specification (Round 2)

**Review Date**: 2026-11-07  
**Reviewer**: Independent Critic (Round 2 of 3)  
**Target Specification**: `SPECIFICATION_v2.md`  
**Delta Document**: `DELTA_v1_v2.md`  
**Base Commit**: `3936ba40129c16b07c9b91a1bb35a7df0f390f7a`  
**Verdict**: **REQUEST_REVISIONS** (Targeted Architectural Hardening Required for Final Round 3 Approval)

---

## Executive Summary of Round 2 Critique

`SPECIFICATION_v2.md` represents a major qualitative and architectural advancement over `SPECIFICATION_v1.md`. The author has demonstrated exceptional responsiveness to the Round 1 critique, systematically addressing each of the primary concerns:
- Poisoned token re-issuance in the grace window has been eliminated.
- Uncoordinated reads under `READ COMMITTED` have been replaced with atomic optimistic concurrency locks (`updateMany` with `replacedAt: null`).
- Sequential scans on `Session.replacedByTokenHash` and `FallbackQueue.processed_at` have been mitigated with explicit database indexes.
- Next.js build compilation (`phase-production-build`) has been decoupled from runtime secret assertions.
- The `FallbackQueue` Prisma model and column names now align with raw SQL queries.
- Multi-modal file attachments (`fileId`) and plan quotas (`checkQuota`) have been incorporated into the SSE streaming route.
- The HMAC audit logging integrity hash is now cryptographically bound to the persisted `createdAt` timestamp.
- Qualitative acceptance criteria have been replaced with a 20-item measurable verification matrix.

However, an adversarial stress-test of the concrete algorithms and code implementations introduced in v2 reveals **critical edge cases, implementation omissions, and operational fragilities** that must be hardened before code implementation begins:

1. **SSRF IP Literal Bypass (Critical)**: Section 2.2 claims socket-level binding via `lookup` and `createConnection`. However, the concrete implementation in Section 7.1 only overrides `lookup`. In Node.js, `net.createConnection` checks `net.isIP(host)` and completely skips the `lookup` hook when the destination is an IP literal (e.g. `http://169.254.169.254` or `http://127.0.0.1`). Any request targeting an IP literal directly bypasses the SSRF guard!
2. **Unhandled Redis Exceptions in Token Rotation (Critical)**: In `rotateSessionAtomic`, Redis operations (`await redis.set`, `await redis.get`) execute directly within the PostgreSQL Prisma interactive transaction without `try/catch` protection. If Redis experiences a network drop, connection refusal, or timeout, the Redis client throws an unhandled exception, rolling back the PostgreSQL transaction and returning an unhandled 500 error. The specified "Redis blip fallback" is unreachable.
3. **Grace Window Replay Binding vs AC-10 Test Mismatch (High)**: The client fingerprint check uses `!ipMatches && !uaMatches`. This correctly permits mobile clients switching from WiFi to cellular (different IP, same User-Agent) without triggering logout. However, AC-10 tests `'detects foreign IP during grace window'` without specifying foreign User-Agent, causing the automated test to fail. Furthermore, an attacker replaying a stolen token with the victim's User-Agent retains a full 10-second replay window.
4. **Fixed 5-Minute Fallback Queue Visibility Timeout Risks Task Preemption (High)**: A static 5-minute timeout will cause long-running background tasks (such as deep document embedding, PDF parsing, or multi-page web scraping) to be reclaimed by a second worker mid-execution, inducing duplicate work, database race conditions, and premature failure.
5. **Unhandled RangeError in Audit Verification (Medium)**: In `verifyAuditEntryIntegrity`, `crypto.timingSafeEqual` is called without first asserting that the buffer lengths match. In Node.js, mismatched lengths throw `RangeError [ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH]`, turning verification of tampered or legacy hashes into an unhandled crash.
6. **Monorepo Workspace Fan-out Breaks Root CLI ACs (Medium)**: Root `package.json` defines `"test": "npm run test --workspaces --if-present"`. Executing `npm test -- apps/web/...` fans out into `apps/mobile`, where Jest is not installed and the file does not exist, causing AC-06 through AC-18 to exit with code 1. Commands must target `@aegis-ai/web`.
7. **Missing Build-Phase Dummy for `DATABASE_URL` (Medium)**: In `env.ts`, `DATABASE_URL` is required and has no default. Running AC-05 without `DATABASE_URL` in the environment causes build-time validation to throw.

---

## Detailed Evaluation of Round 1 Remediations

| Round 1 Finding ID | Issue in v1 | Resolution Status in v2 | Adversarial Assessment |
|---|---|---|---|
| **CRIT-AUTH-01** | Poisoned token re-issuance in grace window | **RESOLVED** | v2 returns the newly minted token from Redis cache or returns `accessToken` with `refreshToken: ""`. `refresh/route.ts` only sets cookie if `refreshToken` is non-empty, preventing cookie poisoning. |
| **CRIT-AUTH-02** | Split-brain sessions under `READ COMMITTED` | **RESOLVED** | v2 utilizes `tx.session.updateMany({ where: { token, replacedAt: null } })`. PostgreSQL row-level locks guarantee exactly one connection receives `count === 1`; concurrent transactions receive `count === 0` and route to grace evaluation. |
| **CRIT-AUTH-03** | Dead code and broken branching in session rotation | **RESOLVED** | Branching is cleanly structured: Path A handles winning rotation; Path B handles grace period or unknown token reuse. |
| **CRIT-AUTH-04** | Full table scan on `replacedByTokenHash` | **RESOLVED** | Added `@@index([replacedByTokenHash])` to Prisma model `Session`. |
| **CRIT-AUTH-05** | Excessive 15s replay window without client binding | **PARTIALLY RESOLVED** | Window reduced to 10s and `!ipMatches && !uaMatches` check added. However, unhandled Redis errors inside the transaction and a mismatch with AC-10 require refinement. |
| **CRIT-SEC-01** | TOCTOU DNS rebinding vulnerability | **PARTIALLY RESOLVED** | Agent `lookup` hook validates all addresses. However, omission of `createConnection` allows IP literal bypass. |
| **CRIT-SEC-02** | Incomplete CIDRs and IPv6 bypass vectors | **RESOLVED** | Comprehensive list of IPv4 and IPv6 CIDRs added, including IPv4-mapped IPv6 `::ffff:0:0/96`. |
| **CRIT-SEC-03** | Redirect chain handling ambiguity | **RESOLVED** | Specified `maxRedirects: 0` with manual 3-hop validation loop. |
| **CRIT-ENV-01** | Build crash via `NODE_ENV` / `APP_ENV` collision | **RESOLVED** | Build phase decoupled via `isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'`. |
| **CRIT-ENV-02** | Unpinned `audit-ci` dependency | **RESOLVED** | Added `"audit-ci": "^7.1.0"` to devDependencies and defined `audit:ci` script. |
| **CRIT-DB-01** | Column name mismatch (`errorMessage` vs `error`) | **RESOLVED** | Model named `FallbackQueue` with column `error String? @db.Text`, matching `fallback-queue.ts`. |
| **CRIT-DB-02** | Unindexed cleanup query causing table bloat | **RESOLVED** | Added `@@index([processedAt], name: "idx_fallback_queue_processed")`. |
| **CRIT-DB-03** | Stuck worker jobs in fallback queue | **PARTIALLY RESOLVED** | 5-minute visibility timeout added. However, a static 5-minute threshold is too short for heavy background jobs. |
| **CRIT-CHAT-01** | File upload broken on SSE route | **RESOLVED** | `fileId: z.string().optional()` added to `bodySchema`, and image base64 injection ported from `processor.ts`. |
| **CRIT-CHAT-02** | Missing quota checks on stream route | **RESOLVED** | `await checkQuota(userId)` integrated with 403 Forbidden return. |
| **CRIT-CHAT-03** | AI tool execution inconsistency | **RESOLVED** | Dual-mode boundary clarified: SSE handles interactive RAG/files; BullMQ queue handles multi-step background tools. |
| **CRIT-AUDIT-01** | Non-verifiable audit log integrity hash | **PARTIALLY RESOLVED** | Explicit `createdAt` timestamp passed and persisted. However, `verifyAuditEntryIntegrity` lacks buffer length guard. |
| **CRIT-RATE-01** | Global DoS via `"unknown"` IP rate limiting | **RESOLVED** | Socket address fallback and user-keyed rate limits specified. |
| **CRIT-AC** | High-level conceptual acceptance criteria | **PARTIALLY RESOLVED** | 20 explicit CLI commands provided. However, monorepo workspace targeting and AC-10 need alignment. |

---

## Detailed Adversarial Findings & Stress-Test Vulnerabilities in v2

### 1. Finding CRIT2-SEC-01: SSRF IP Literal Bypass via Missing `createConnection` Override (Critical)
- **Location**: `SPECIFICATION_v2.md`, Section 2.2 line 83 vs Section 7.1 lines 561-584.
- **Vulnerability**:
  In Section 2.2, the specification claims:
  > "Implement a custom Node.js `http.Agent` and `https.Agent` overriding `lookup` and `createConnection`. The lookup hook validates all resolved IPs immediately prior to socket establishment. The socket `connect` event validates `socket.remoteAddress` before any HTTP bytes are dispatched."
  
  However, in the concrete implementation in Section 7.1:
  ```typescript
  export function createSafeHttpAgent(isHttps: boolean) {
    const AgentClass = isHttps ? https.Agent : http.Agent;
    return new AgentClass({
      lookup: (hostname, options, callback) => {
        dns.lookup(hostname, { all: true }, (err, addresses) => {
          ...
        });
      },
    });
  }
  ```
  `createConnection` is **completely omitted**.
  In Node.js standard library (`lib/net.js`), when a request is made to an IP literal (such as `http://169.254.169.254/latest/meta-data/` or `http://127.0.0.1:6379`), Node detects `net.isIP(host) !== 0` and **completely skips the `lookup` option**!
  As a result:
  - Any attacker providing an IP literal directly bypasses the custom agent's `lookup` hook.
  - The socket connects directly to internal infrastructure or cloud instance metadata.
- **Secondary Edge Case**: Line 579 calls `callback(null, addresses[0].address, addresses[0].family)`. If a DNS record returns zero addresses (`addresses.length === 0`), `addresses[0]` is undefined and throws an unhandled `TypeError`.
- **Remediation**:
  1. In `ssrf-guard.ts`, pre-validate the parsed URL hostname before connection: if `net.isIP(url.hostname)`, normalize and run `isBlockedIp(url.hostname)` immediately.
  2. Implement `createConnection` on the agent or listen to the `connect` event on the created socket to verify `socket.remoteAddress` against `isBlockedIp`:
     ```typescript
     const socket = net.createConnection(options);
     socket.on("connect", () => {
       const remoteIp = normalizeIp(socket.remoteAddress || "");
       if (isBlockedIp(remoteIp)) {
         socket.destroy(new Error(`SSRF blocked: Remote socket connected to disallowed IP ${remoteIp}`));
       }
     });
     ```
  3. Ensure `addresses.length > 0` before accessing `addresses[0]`.

---

### 2. Finding CRIT2-AUTH-01: Unhandled Redis Exceptions in `rotateSessionAtomic` Crash DB Transactions (Critical)
- **Location**: `SPECIFICATION_v2.md`, Section 5.2, lines 389-396 and 436-446.
- **Vulnerability**:
  In `rotateSessionAtomic`:
  ```typescript
  // Path A: line 389
  if (redis) {
    await redis.set(`token_rotation_cache:${oldTokenHash}`, JSON.stringify(...), "EX", 10);
  }

  // Path B: line 436
  if (redis) {
    const cached = await redis.get(`token_rotation_cache:${oldTokenHash}`);
    if (cached) { ... }
  }
  ```
  Both `await redis.set` and `await redis.get` are invoked directly inside `prisma.$transaction(async (tx) => ...)`.
  In ioredis, when Redis is down, refused, or experiencing socket timeouts, command promises reject.
  Because there is **no `try / catch`** around `redis.set` or `redis.get`:
  - An outage or latency spike on Redis immediately causes an unhandled rejection inside the transaction.
  - In Path A: The winning token rotation transaction rolls back! The user's refresh fails with a 500 error.
  - In Path B: The grace evaluation crashes! The fallback on line 448 (`// Fallback if Redis blip`) is **never reached**.
- **Remediation**:
  Wrap all Redis calls in a defensive, non-throwing wrapper or inline `try / catch`:
  ```typescript
  let cached: string | null = null;
  if (redis) {
    try {
      cached = await redis.get(`token_rotation_cache:${oldTokenHash}`);
    } catch (redisErr) {
      logger.warn("Redis unavailable during token rotation grace check", { error: redisErr });
    }
  }
  ```
  Do the same for `redis.set` in Path A so a Redis write failure never aborts a successful database transaction.

---

### 3. Finding CRIT2-AUTH-02: Grace Window Client Binding vs AC-10 Mismatch & Replay Window (High)
- **Location**: `SPECIFICATION_v2.md`, Section 5.2 lines 422-433 vs Section 9 AC-10.
- **Vulnerability**:
  1. **Discrepancy with AC-10**:
     The code enforces:
     ```typescript
     const ipMatches = !sessionRecord.ipAddress || sessionRecord.ipAddress === ip;
     const uaMatches = !sessionRecord.userAgent || sessionRecord.userAgent === userAgent;
     if (!ipMatches && !uaMatches) {
       throw new AuthError("SUSPICIOUS_CROSS_NETWORK_REPLAY", 401);
     }
     ```
     This intentionally allows mobile clients switching networks (different IP, same User-Agent).
     However, AC-10 specifies:
     `npm test -- apps/web/src/__tests__/services/auth/session-concurrency.test.ts -t 'detects foreign IP during grace window'` -> Expected: `Throws SUSPICIOUS_CROSS_NETWORK_REPLAY`.
     If the automated unit test only passes a foreign IP while keeping `userAgent` constant, the condition `(!ipMatches && !uaMatches)` evaluates to `false` and the test will fail!
  2. **10-Second Window with Spoofed User-Agent**:
     Because HTTP User-Agent headers are easily captured alongside stolen cookies, an attacker replaying a stolen token from a foreign IP with the victim's User-Agent header bypasses this check for up to 10 seconds.
- **Remediation**:
  1. Update AC-10's specification and test name to explicitly assert cross-client replay detection: `'detects cross-client replay (foreign IP and User-Agent) during grace window'`.
  2. Reduce the grace window from 10 seconds to **5 seconds**. Browser concurrency races occur within 200ms–1500ms; 5 seconds provides ample margin while halving the replay window for an attacker.

---

### 4. Finding CRIT2-QUEUE-01: Fixed 5-Minute Fallback Queue Visibility Timeout Preempts Heavy Tasks (High)
- **Location**: `SPECIFICATION_v2.md`, Section 2.4 line 107 and Section 7.2 lines 623-625.
- **Vulnerability**:
  In `getNextFallbackJob`:
  ```sql
  WHERE queue_name = ${queueName}
    AND (
      status = 'pending'
      OR (status = 'processing' AND processed_at < NOW() - INTERVAL '5 minutes')
    )
  ```
  The fallback queue processes diverse workloads, including `chat-queue`, `rag-queue`, and document processing.
  Complex document ingestion (e.g. parsing a 200-page PDF, generating embeddings, and storing vectors in LanceDB/PostgreSQL) can legitimately take 6 to 10 minutes under resource pressure.
  Under the current specification:
  - At exactly 5 minutes, while Worker 1 is still processing, Worker 2 reclaims the job.
  - Worker 2 increments `attempts` and begins duplicate processing.
  - Both workers write competing results to the database and vector index.
  - Once `attempts >= maxAttempts`, the job is marked failed, even though Worker 1 might have succeeded.
- **Remediation**:
  1. Add a worker heartbeat function to `fallback-queue.ts`:
     ```typescript
     export async function heartbeatFallbackJob(jobId: string): Promise<void> {
       await prisma.$executeRaw`
         UPDATE fallback_queue SET processed_at = NOW() WHERE id = ${jobId} AND status = 'processing'
       `;
     }
     ```
     Workers processing long-running jobs must call `heartbeatFallbackJob` every 60 seconds.
  2. Alternatively, specify queue-specific visibility timeouts (e.g. 2 minutes for `chat-queue`, 15 minutes for `rag-queue`).

---

### 5. Finding CRIT2-AUDIT-01: Unhandled RangeError in `verifyAuditEntryIntegrity` (Medium)
- **Location**: `SPECIFICATION_v2.md`, Section 7.3 lines 708-711.
- **Vulnerability**:
  In `verifyAuditEntryIntegrity`:
  ```typescript
  return crypto.timingSafeEqual(
    Buffer.from(entry.integrityHash, "hex"),
    Buffer.from(expected, "hex")
  );
  ```
  In Node.js, `crypto.timingSafeEqual(bufA, bufB)` requires `bufA.length === bufB.length`.
  If an audit log record has been tampered with, truncated, corrupted, or was generated with an older 32-byte SHA-256 fallback, `Buffer.from(entry.integrityHash, "hex").length !== 32`.
  Node immediately throws:
  `RangeError [ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH]: Input buffers must have the same byte length`.
  Instead of returning `false` (indicating integrity check failed), the utility crashes the calling process with an unhandled exception.
- **Remediation**:
  Add an explicit buffer length check before calling `crypto.timingSafeEqual`:
  ```typescript
  const actualBuf = Buffer.from(entry.integrityHash, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (actualBuf.length !== expectedBuf.length || actualBuf.length === 0) {
    return false;
  }
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
  ```

---

### 6. Finding CRIT2-OPS-01: Monorepo Workspace Fan-out Breaks Root CLI ACs (Medium)
- **Location**: `SPECIFICATION_v2.md`, Section 9, Acceptance Criteria AC-06 through AC-18.
- **Vulnerability**:
  In root `package.json`:
  ```json
  "scripts": {
    "test": "npm run test --workspaces --if-present"
  }
  ```
  AC-06 through AC-18 prescribe commands such as:
  `npm test -- apps/web/src/__tests__/lib/env.test.ts -t '...'`
  When executed at the root of the monorepo:
  1. `npm test` forwards the arguments to all workspaces.
  2. In `apps/mobile`, Jest is not installed and the file path `apps/web/...` does not exist.
  3. `apps/mobile` fails immediately with `npm error code 1`.
  4. The root command exits with code 1 before `apps/web` results can be evaluated.
- **Remediation**:
  Update all acceptance criteria test commands in Section 9 to explicitly target the `@aegis-ai/web` workspace:
  `npm --workspace=@aegis-ai/web test -- src/__tests__/lib/env.test.ts -t '...'`
  or
  `npm --prefix apps/web test -- src/__tests__/lib/env.test.ts -t '...'`.

---

### 7. Finding CRIT2-ENV-01: Missing Build-Phase Default for `DATABASE_URL` in AC-05 (Medium)
- **Location**: `SPECIFICATION_v2.md`, Section 4.1 line 205 vs Section 9 AC-05.
- **Vulnerability**:
  In `apps/web/src/lib/env.ts`, `DATABASE_URL` is defined as:
  ```typescript
  DATABASE_URL: z.string().min(1).refine((v) => v.startsWith("postgresql://"), {
    message: "DATABASE_URL must start with postgresql://",
  }),
  ```
  It has no `.default(...)`.
  AC-05 executes:
  `powershell -Command "$env:NEXT_PHASE='phase-production-build'; $env:NODE_ENV='production'; $env:APP_ENV='development'; npm run build"`
  If `DATABASE_URL` is not present in the developer's local environment, `envSchema.safeParse` throws a fatal validation error: `DATABASE_URL: Required`.
- **Remediation**:
  In `apps/web/src/lib/env.ts`, provide a fallback dummy database URL during `isBuildPhase`:
  ```typescript
  DATABASE_URL: z.string().min(1).default(
    isBuildPhase ? "postgresql://postgres:postgres@localhost:5432/build_dummy" : undefined as any
  ),
  ```
  Or explicitly add `$env:DATABASE_URL='postgresql://build:build@localhost:5432/build_db'` to AC-05.

---

## Scope Discipline & Boundary Enforcement Evaluation

- **PR #30 Isolation**: Maintained with 100% fidelity. v2 introduces zero mass dependency churn.
- **PR #25 Porting**: The selective porting boundaries remain appropriately restricted to SSRF CIDR logic, reverse proxy hop indexing, and upload limits.
- **Framework & DB Stability**: Next.js 16, Prisma 5, PostgreSQL 16, and BullMQ foundations remain untouched.
- **Diff Proportionality**: Every delta between v1 and v2 is directly traceable to the Round 1 critique findings. Zero extraneous features or unauthorized refactorings were introduced.

---

## Measurable Acceptance Criteria Rigor Audit

| ID | Criterion | Concrete Command in v2 | Critic Assessment | Recommended Adjustment |
|---|---|---|---|---|
| **AC-01** | Zero `continue-on-error: true` | `powershell -Command "if (Select-String -Path .github/workflows/*.yml -Pattern 'continue-on-error:\s*true') { exit 1 } else { exit 0 }"` | **PASS** — Accurate and non-tautological | None |
| **AC-02** | Zero `npm audit ... \|\| true` | `powershell -Command "if (Select-String -Path .github/workflows/*.yml -Pattern 'npm audit.*\|\|\s*true') { exit 1 } else { exit 0 }"` | **PASS** — Accurate and non-tautological | None |
| **AC-03** | Gitleaks scanning blocks secrets | `gitleaks detect --source . --verbose --redact` | **PASS (with note)** | Clarify execution in CI / Docker if gitleaks not in local PATH |
| **AC-04** | Node 20 LTS & setup-node@v4 | `powershell -Command "if (Select-String -Path .github/workflows/*.yml -Pattern 'setup-node@v[0-3,5-9]\|node-version:\s*[\'\"]?(18\|22)[\'\"]?') { exit 1 } else { exit 0 }"` | **PASS** — Accurate regex | None |
| **AC-05** | Build succeeds without prod secrets | `powershell -Command "$env:NEXT_PHASE='phase-production-build'; $env:NODE_ENV='production'; $env:APP_ENV='development'; npm run build"` | **NEEDS FIX** | Add dummy `DATABASE_URL` or support build-phase default |
| **AC-06** | Production rejects `SKIP_PROD_VALIDATION=1` | `npm test -- apps/web/src/__tests__/lib/env.test.ts -t 'rejects SKIP_PROD_VALIDATION in production'` | **NEEDS FIX** | Add `--workspace=@aegis-ai/web` to avoid monorepo fan-out failure |
| **AC-07** | Production rejects short secrets | `npm test -- apps/web/src/__tests__/lib/env.test.ts -t 'validates secret entropy'` | **NEEDS FIX** | Add `--workspace=@aegis-ai/web` |
| **AC-08** | Atomic rotation & 5 concurrent requests | `npm test -- apps/web/src/__tests__/services/auth/session-concurrency.test.ts -t 'handles 5 concurrent refresh requests'` | **NEEDS FIX** | Add `--workspace=@aegis-ai/web` |
| **AC-09** | Expired replay revokes family | `npm test -- apps/web/src/__tests__/services/auth/session-concurrency.test.ts -t 'revokes family on expired replay'` | **NEEDS FIX** | Add `--workspace=@aegis-ai/web` |
| **AC-10** | Grace window replay detection | `npm test -- apps/web/src/__tests__/services/auth/session-concurrency.test.ts -t 'detects foreign IP during grace window'` | **NEEDS FIX** | Align test title and assertion with `(!ipMatches && !uaMatches)` requirement |
| **AC-11** | SSRF agent blocks private IPs | `npm test -- apps/web/src/__tests__/security/ssrf.test.ts -t 'blocks internal IPs at socket level'` | **NEEDS FIX** | Add `--workspace=@aegis-ai/web` |
| **AC-12** | SSRF blocks TOCTOU rebinding | `npm test -- apps/web/src/__tests__/security/ssrf.test.ts -t 'prevents TOCTOU DNS rebinding'` | **NEEDS FIX** | Add `--workspace=@aegis-ai/web` |
| **AC-13** | SSRF validates 3-hop redirects | `npm test -- apps/web/src/__tests__/security/ssrf.test.ts -t 'validates redirect destination'` | **NEEDS FIX** | Add `--workspace=@aegis-ai/web` |
| **AC-14** | Fallback queue records error column | `npm test -- apps/web/src/__tests__/lib/fallback-queue.test.ts -t 'records job error'` | **NEEDS FIX** | Add `--workspace=@aegis-ai/web` |
| **AC-15** | Stuck fallback job reclaimed after 5 min | `npm test -- apps/web/src/__tests__/lib/fallback-queue.test.ts -t 'reclaims stuck processing jobs'` | **NEEDS FIX** | Add `--workspace=@aegis-ai/web` |
| **AC-16** | Chat SSE accepts fileId & image | `npm test -- apps/web/src/__tests__/api.chat.streaming.test.ts -t 'processes file attachment'` | **NEEDS FIX** | Add `--workspace=@aegis-ai/web` |
| **AC-17** | Chat SSE enforces quota limits | `npm test -- apps/web/src/__tests__/api.chat.streaming.test.ts -t 'enforces quota limits'` | **NEEDS FIX** | Add `--workspace=@aegis-ai/web` |
| **AC-18** | Audit verification passes | `npm test -- apps/web/src/__tests__/lib/audit.test.ts -t 'verifies audit entry integrity'` | **NEEDS FIX** | Add `--workspace=@aegis-ai/web` |
| **AC-19** | Full workspace typecheck passes | `npx tsc --noEmit` | **PASS** | Validates entire workspace |
| **AC-20** | Full repository production build | `npm run build:all` | **PASS** | Validates end-to-end compilation |

---

## Verdict & Prioritized Action Items for Specification v3

### Verdict: REQUEST_REVISIONS

Specification v2 successfully eliminates the primary architectural blockers from Round 1. The remaining findings are focused, concrete technical refinements that will make Specification v3 an unassailable, production-grade master blueprint ready for final approval.

### Prioritized Remediation Requirements for Author (Round 3):

1. **Harden SSRF Socket Agent Against IP Literals**:
   - In `ssrf-guard.ts`, pre-validate IP literals before connection and implement socket-level connection verification (`socket.on('connect')`) to prevent `lookup` bypass on IP literals.
   - Handle empty DNS resolution arrays (`addresses.length === 0`).
2. **Safeguard Redis Operations in Session Rotation**:
   - Wrap `redis.get` and `redis.set` in `session.ts` in non-throwing `try / catch` blocks.
   - Ensure Redis outages gracefully fall back to returning the access token and preserving the client's existing cookie without aborting the database transaction.
   - Reduce grace window to 5 seconds.
3. **Synchronize AC-10 with Client Fingerprinting Logic**:
   - Align AC-10 assertion and test title to test both foreign IP and foreign User-Agent (`(!ipMatches && !uaMatches)`).
4. **Add Worker Heartbeat to Fallback Queue**:
   - Export `heartbeatFallbackJob(jobId)` in `fallback-queue.ts`.
   - Update worker loop specification to call `heartbeatFallbackJob` every 60 seconds, preventing long-running tasks from being preempted.
5. **Guard Buffer Lengths in `verifyAuditEntryIntegrity`**:
   - Compare `actualBuf.length === expectedBuf.length` before invoking `crypto.timingSafeEqual` to avoid unhandled `RangeError` crashes.
6. **Target Monorepo Workspace in Acceptance Commands**:
   - Change `npm test -- apps/web/...` to `npm --workspace=@aegis-ai/web test -- src/...` in AC-06 through AC-18.
7. **Provide Build-Time Dummy for `DATABASE_URL` in `env.ts`**:
   - Allow a default build dummy URL during `isBuildPhase` so `next build` runs standalone without database credentials.
