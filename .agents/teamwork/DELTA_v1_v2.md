# Specification Delta: Version 1 vs. Version 2 (DELTA_v1_v2)

**Author**: Principal Architect (Specification Author — Round 2)  
**Date**: 2026-11-07  
**Base Specification**: `SPECIFICATION_v1.md`  
**Refined Specification**: `SPECIFICATION_v2.md`  
**Target Repository**: `https://github.com/NoorulAhameddev/AegisAi`  
**Base Commit**: `3936ba40129c16b07c9b91a1bb35a7df0f390f7a`  

---

## Executive Overview of Delta

This document provides a systematic, item-by-item delta detailing the modifications made between `SPECIFICATION_v1.md` and `SPECIFICATION_v2.md`. Every architectural refinement directly resolves a finding raised during the Round 1 Adversarial Critique (`CRITIQUE_ROUND_1.md`).

All changes were engineered to eliminate security vulnerabilities, operational deadlocks, and build crashes without introducing out-of-scope refactoring or violating boundary constraints (e.g. maintaining strict isolation of PR #30, preserving existing schema backwards compatibility, and keeping Next.js 16 / Prisma / BullMQ architectural foundations).

---

## Detailed Matrix of Critique Findings & Resolutions

| # | Critique Finding ID | Domain / Component | Flaw in Specification v1 | Resolution in Specification v2 | Primary Section in v2 |
|---|---|---|---|---|---|
| 1 | **CRIT-AUTH-01** | Auth / Rotation | In grace window, re-issued `oldRefreshToken`, overwriting client cookie with dead token and causing inevitable family wipeout on next rotation. | In grace window, newly minted active token pair is retrieved from Redis cache (`token_rotation_cache:${oldTokenHash}`) and returned. If Redis unavailable, returns `accessToken` only, leaving valid cookie intact. | Section 2.1, 5.2, 5.3 |
| 2 | **CRIT-AUTH-02** | Auth / Concurrency | Missing concurrency row locks; concurrent requests under `READ COMMITTED` created split-brain sessions. | Added atomic optimistic locking via `updateMany({ where: { token: oldTokenHash, replacedAt: null }, data: ... })`. Exactly one request updates `count === 1`; all others divert to grace check. | Section 2.1, 5.2 |
| 3 | **CRIT-AUTH-03** | Auth / Concurrency | Dead code in Step 4: `recentRotation` queried but never checked, immediately throwing `deleteMany`. | Cleanly branched: `updateMany` success handles rotation; `count === 0` branches into grace evaluation with verified session lineage. | Section 5.2 |
| 4 | **CRIT-AUTH-04** | Auth / Database | `replacedByTokenHash` had no database index, inducing full table sequential scans during session lookups. | Added `@@index([replacedByTokenHash])` to Prisma `model Session`. | Section 2.1, 5.1 |
| 5 | **CRIT-AUTH-05** | Auth / Security | 15s grace window was excessive and lacked client binding, allowing cross-network stolen token replays. | Grace window reduced to 10s. Added strict client IP and User-Agent fingerprint verification during grace window; mismatches trigger immediate family revocation. | Section 2.1, 5.2 |
| 6 | **CRIT-SEC-01** | Perimeter / SSRF | TOCTOU DNS rebinding: `validateAndResolveSafeUrl` checked DNS, but subsequent `axios.get(url)` re-resolved DNS, allowing zero-TTL rebind to internal IPs. | Implemented socket-level IP binding via custom `http.Agent`/`https.Agent` overriding `lookup` and checking `socket.remoteAddress` on connect. | Section 2.2, 7.1 |
| 7 | **CRIT-SEC-02** | Perimeter / SSRF | Omitted IPv4-mapped IPv6 (`::ffff:127.0.0.1`), hex/decimal IPs, and dual-stack resolution options. | Added comprehensive IP normalization, dual-stack lookup (`{ all: true }`), and an exhaustive blocked CIDR table including all IPv6/mapped ranges. | Section 2.2, 7.1 |
| 8 | **CRIT-SEC-03** | Perimeter / SSRF | Disabling redirects broke standard sites; following redirects bypassed SSRF validation. | Specified explicit 3-hop redirect interceptor that intercepts 3xx status codes, validates `Location` URL scheme and IP, and enforces socket security on every hop. | Section 2.2, 7.1 |
| 9 | **CRIT-ENV-01** | Environment / Build | Forbidding `NODE_ENV=production` with `APP_ENV=development` crashed `next build` because Next.js CLI forces `NODE_ENV=production`. | Decoupled build phase from runtime: if `NEXT_PHASE === 'phase-production-build'`, bypass runtime secret validation. Strict checks enforced only at runtime (`next start`). | Section 2.3, 4.1 |
| 10 | **CRIT-ENV-02** | CI / Dependencies | `npx audit-ci` downloaded unpinned, mutable binary from npm in CI, risking supply-chain unpredictability. | Added `"audit-ci": "^7.1.0"` to root `package.json` devDependencies and defined `"audit:ci": "audit-ci --config audit-ci.json"`. | Section 3.1, 7.4 |
| 11 | **CRIT-DB-01** | Persistence / Queue | Schema introduced `errorMessage`, but raw SQL in `fallback-queue.ts` executes `SET error = ${error}`, causing SQL crashes. Model named `FallbackJob` broke `prisma.fallbackQueue`. | Renamed model to `FallbackQueue` and column to `error String? @db.Text`, achieving 100% alignment with `prisma.fallbackQueue` and raw SQL. | Section 2.4, 7.2 |
| 12 | **CRIT-DB-02** | Persistence / Queue | `processed_at` was unindexed, causing full table scans during periodic queue cleanup. | Added `@@index([processedAt], name: "idx_fallback_queue_processed")` to `model FallbackQueue`. | Section 2.4, 7.2 |
| 13 | **CRIT-DB-03** | Persistence / Queue | Jobs left in `status = 'processing'` after a worker crash remained stuck indefinitely. | Added 5-minute visibility timeout to `getNextFallbackJob` SQL query (`status = 'processing' AND processed_at < NOW() - INTERVAL '5 minutes'`) and recovery utility. | Section 2.4, 7.2 |
| 14 | **CRIT-CHAT-01** | Chat / Multi-Modal | Migrating to `/api/chat/stream-sse` with `bodySchema.strict()` rejected `fileId`, breaking document and image attachments. | Added `fileId: z.string().optional()` to `bodySchema` and ported image data URL base64 extraction from `processor.ts` into `stream-sse/route.ts`. | Section 2.5, 6.2 |
| 15 | **CRIT-CHAT-02** | Chat / Governance | `/api/chat/stream-sse` omitted plan quota enforcement (`checkQuota`), allowing free-tier users to bypass limits. | Added `await checkQuota(userId)` to `stream-sse/route.ts`, returning 403 Forbidden with clear upgrade prompt when quota is exceeded. | Section 2.5, 6.2 |
| 16 | **CRIT-CHAT-03** | Chat / Architecture | Inconsistent AI tool execution between streaming endpoint and background BullMQ processor. | Clarified Dual-Mode execution boundary: direct SSE stream handles interactive conversations with files & RAG; complex multi-step tools route to BullMQ worker queue. | Section 2.5, 6.1 |
| 17 | **CRIT-AUDIT-01** | Audit / Cryptography | `generateIntegrityHash` signed an on-the-fly timestamp, while DB saved `createdAt` independently, making verification impossible. | Passed fixed `createdAt: Date` into `generateIntegrityHash` and saved that exact timestamp in `prisma.auditLog.create`. Exported timing-safe `verifyAuditEntryIntegrity`. | Section 2.6, 7.3 |
| 18 | **CRIT-RATE-01** | Rate Limiting | `req.ip` undefined on self-hosted Node.js servers; falling back to `"unknown"` lumped all users into a single bucket, enabling global DoS. | Added socket remote address fallback, rightmost trusted reverse proxy parsing, and user-level rate limit keying (`rate_limit:user:${userId}`). | Section 2.7, 7.4 |
| 19 | **CRIT-AC** | Acceptance Criteria | Acceptance criteria in v1 were high-level conceptual checkboxes without automated verification commands. | Replaced all criteria with an automated verification matrix specifying exact CLI commands, test flags, and expected exit codes (0 or 1). | Section 9 |

---

## Detailed Section-by-Section Structural Diff

### Section 2: Missing Requirements & Ambiguous Instructions
- **v1**: Had 5 subsections focusing on general ambiguity resolutions.
- **v2**: Expanded to 7 focused subsections (2.1 to 2.7) providing explicit mathematical algorithms and technical resolutions for token rotation race conditions, socket-level SSRF binding, Next.js build phase decoupling, database column/index alignment, chat SSE multi-modality, audit HMAC verification, and rate limiting DoS prevention.

### Section 4: Production Environment Configuration Hardening
- **v1**: Mandated `if (NODE_ENV === 'production' && APP_ENV === 'development') throw Error`, which broke `next build`.
- **v2**: Introduces `isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'`. Skips production secret assertions during static compilation while enforcing strict, non-bypassable runtime assertions at server boot (`next start`).

### Section 5: Refresh-Token Rotation & Session Concurrency
- **v1**:
  - Returned `oldRefreshToken` in grace window (causing cookie poisoning).
  - Used standard `findUnique` and `update` inside `$transaction` (vulnerable to split-brain session creation under `READ COMMITTED`).
  - Lacked database index on `replacedByTokenHash`.
  - Allowed 15-second grace window without IP/fingerprint checks.
- **v2**:
  - Implements atomic conditional locking: `tx.session.updateMany({ where: { token: oldTokenHash, replacedAt: null }, data: ... })`.
  - Caches newly minted `{ accessToken, refreshToken }` pair in Redis under `token_rotation_cache:${oldTokenHash}` for 10 seconds.
  - Returns active cached tokens during the grace window; browser cookie is updated to valid successor token.
  - Validates client IP and User-Agent during grace window; immediately revokes family on cross-network replays.
  - Adds `@@index([replacedByTokenHash])` to `model Session`.

### Section 6: Chat Execution Architecture Reconciliation
- **v1**:
  - Migrated `ChatClient.tsx` to `/api/chat/stream-sse` without `fileId` support in `bodySchema`.
  - Omitted `checkQuota` enforcement.
  - Unclear tool execution behavior.
- **v2**:
  - Adds `fileId: z.string().optional()` to `bodySchema`.
  - Ports multi-modal image base64 injection from `processor.ts:308-336` into `stream-sse/route.ts`.
  - Integrates `await checkQuota(userId)` returning 403 Forbidden on quota depletion.
  - Clarifies dual-mode execution: interactive SSE handles streaming, RAG, and files; heavy background agent workflows route to `/api/chat/stream`.

### Section 7: Structured Security Remediation
- **v1**:
  - SSRF relied on `validateAndResolveSafeUrl` prior to `axios.get`, susceptible to TOCTOU DNS rebinding.
  - CIDR blocklist omitted IPv4-mapped IPv6 formats.
  - `FallbackJob` Prisma model had column `errorMessage` (conflicting with raw SQL `error`).
  - Missing index on `processed_at` and missing visibility timeout in fallback queue.
  - `generateIntegrityHash` signed unpersisted timestamp.
- **v2**:
  - SSRF enforces socket-level connection binding via custom HTTP/HTTPS agent lookup hook and pre-transmission IP check.
  - Comprehensive CIDR blocklist with IPv4-mapped IPv6 normalization and dual-stack lookup.
  - Safe 3-hop redirect interceptor.
  - Renamed model to `FallbackQueue` with column `error String? @db.Text` and added `@@index([processedAt])`.
  - Added 5-minute visibility timeout to `getNextFallbackJob`.
  - Bound HMAC hashing to persisted `createdAt` timestamp and exported timing-safe `verifyAuditEntryIntegrity`.
  - Sourced client IP safely in `rate-limit.ts` to prevent global DoS.

### Section 9: Measurable Acceptance Criteria & CLI Verification Matrix
- **v1**: Contained qualitative checklists (e.g. "Zero instances of continue-on-error").
- **v2**: Upgraded to an empirical verification matrix mapping each criterion (AC-01 through AC-20) to an exact CLI command (PowerShell, Jest test filter, or tool binary) and expected exit code (0 or 1).

---

## Conclusion & Readiness Assessment

Specification v2 completely and systematically resolves every vulnerability, architectural ambiguity, and regression risk identified in Round 1. It provides an airtight, deterministic blueprint ready for Round 2 review by the Independent Critic.
