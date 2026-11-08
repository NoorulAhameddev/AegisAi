# Regression and Security Tests Report (Deliverable 6)

**Report Date**: 2026-11-07  
**Branch**: `remediation/engineering-hardening`  
**Test Framework**: Jest / TypeScript  
**Total Automated Tests Added**: 75 tests  
**Pass Rate**: **100% (75/75 passed, 0 failures)**  

---

## 1. Test Suite Catalog & Acceptance Criteria Mapping

| Test Suite File | Domain / Requirement | Acceptance Criteria Covered | Test Count | Pass Rate | Execution Command |
|---|---|---|:---:|:---:|---|
| `apps/web/src/__tests__/env.test.ts` | R3 Production Environment Hardening | AC-01, AC-02, AC-03, AC-04, AC-05 | 31 | 100% (31/31) | `npm --workspace=@aegis-ai/web test -- src/__tests__/env.test.ts` |
| `apps/web/src/__tests__/auth-refresh.test.ts` | R4 Refresh-Token Rotation & Session Concurrency | AC-06, AC-07, AC-08, AC-09, AC-10 | 15 | 100% (15/15) | `npm --workspace=@aegis-ai/web test -- src/__tests__/auth-refresh.test.ts` |
| `apps/web/src/__tests__/chat-sse.test.ts` | R5 Chat Execution Architecture Reconciliation | AC-11, AC-12, AC-13, AC-14 | 7 | 100% (7/7) | `npm --workspace=@aegis-ai/web test -- src/__tests__/chat-sse.test.ts` |
| `apps/web/src/__tests__/security-remediation.test.ts` | R6 Structured Security Auditing & Remediation | AC-15, AC-16, AC-17, AC-18, AC-19, AC-20 | 22 | 100% (22/22) | `npm --workspace=@aegis-ai/web test -- src/__tests__/security-remediation.test.ts` |
| **Total Remediation Test Suite** | **R2–R6 Comprehensive** | **AC-01 through AC-20** | **75** | **100%** | `npm --workspace=@aegis-ai/web test -- src/__tests__` |

---

## 2. Detailed Test Coverage by Acceptance Criterion

### 2.1 Production Environment Hardening (AC-01 to AC-05)
- **AC-01 (Fatal Production Bypass Rejection)**: Verifies that setting `SKIP_PROD_VALIDATION=1` in a production runtime (`NODE_ENV=production` or `APP_ENV=production`) throws a fatal `CRITICAL SECURITY VIOLATION` error and fails to boot.
- **AC-02 (Insecure Secret Defaults Removal)**: Verifies that missing or sub-32-character `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, or `AUDIT_SIGNING_KEY` values are rejected with Zod schema validation errors.
- **AC-03 (Strict Production CORS Origins)**: Verifies that production rejects wildcard `*` origins when credentials are enabled, rejects trailing slashes, and requires valid HTTPS schemas.
- **AC-04 (Environment Contradiction Rejection)**: Verifies that contradictory security configurations (`NODE_ENV=production` while `APP_ENV=development`) are rejected.
- **AC-05 (Build-Phase Decoupling)**: Verifies that `NEXT_PHASE=phase-production-build` compiles cleanly with dummy fallback database and secret credentials without runtime security leakage.

### 2.2 Refresh-Token Rotation & Session Concurrency (AC-06 to AC-10)
- **AC-06 (Atomic Single-Use Rotation)**: Verifies that rotating a valid refresh token generates a newly minted token pair, updates `replacedAt`, and records `replacedByTokenHash`.
- **AC-07 (Concurrent Refresh Safety)**: Verifies that two or more simultaneous refresh requests with the same token execute via atomic conditional updates without generating duplicate active database sessions.
- **AC-08 (5-Second Grace Window Reload)**: Verifies that concurrent requests from the same user within 5 seconds receive newly minted tokens from cache/lineage without false-positive reuse detection.
- **AC-09 (Replay Attack Family Revocation)**: Verifies that presenting an expired or replaced refresh token outside the 5-second grace window immediately revokes all sessions belonging to the `familyId`.
- **AC-10 (Banned User & Revoked Session Blocking)**: Verifies that banned users (`isBanned: true`) and revoked sessions are unconditionally rejected.

### 2.3 Chat Execution Architecture Reconciliation (AC-11 to AC-14)
- **AC-11 (SSE Token Streaming)**: Verifies that `/api/chat/stream-sse` creates a `ReadableStream`, emits SSE formatted chunks, and returns low-latency tokens.
- **AC-12 (Client Disconnect Abort Persistence)**: Verifies that firing the `req.signal` abort listener halts upstream provider requests and saves partial assistant responses with `isPartial: true`.
- **AC-13 (Token Budget & Usage Persistence)**: Verifies that token budget reservation and post-stream `UsageMetric` database records are properly generated.
- **AC-14 (Multi-Modal File Attachment)**: Verifies that providing `fileId` resolves the file and injects image base64 data into the chat completion payload.

### 2.4 Structured Security Auditing & Remediation (AC-15 to AC-20)
- **AC-15 (Socket-Level SSRF Prevention)**: Verifies that requests to loopback (`127.0.0.1`, `::1`), private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), AWS metadata (`169.254.169.254`), IPv4-mapped IPv6, and DNS rebinding hosts are blocked at the socket layer with 400 Bad Request.
- **AC-16 (Batch Upload Path Traversal Prevention)**: Verifies that filenames containing `../`, `..\`, or absolute paths are rejected, sanitized with `path.basename`, and stored with randomized UUID prefixes.
- **AC-17 (Fallback Queue Persistence & Heartbeat)**: Verifies that jobs can be inserted into table `fallback_queue`, reclaimed via `getNextFallbackJob`, and leased/extended via `heartbeatFallbackJob`.
- **AC-18 (pgvector Raw SQL Template Integrity)**: Verifies that pgvector SQL queries execute cleanly without Promise interpolation syntax errors.
- **AC-19 (Rate Limiting IP Spoofing Prevention)**: Verifies that spoofed leftmost `X-Forwarded-For` headers are ignored in favor of trusted rightmost proxy hops or socket IP.
- **AC-20 (Complete PII Redaction in Logs)**: Verifies that passwords, PINs, tokens, and authorization headers are 100% masked (`"[REDACTED]"`) with zero partial character leakage.

