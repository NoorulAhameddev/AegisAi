# Updated Technical Documentation (Deliverable 8)

**Report Date**: 2026-11-07  
**Branch**: `remediation/engineering-hardening`  
**Author**: Principal Architect  

---

## 1. Executive Summary

This deliverable catalogs the technical documentation updates authored during the remediation campaign, synchronizing architectural design with actual codebase implementation. In particular, it details the reconciled **dual-mode chat execution model**, the **atomic single-use refresh token rotation architecture**, and the **perimeter security guards**.

---

## 2. Updated and Authored Documentation Artifacts

### 2.1 `docs/architecture/CHAT_EXECUTION_ARCHITECTURE.md` (Newly Authored)
- Authored a comprehensive 200+ line technical architecture document detailing the reconciled chat execution architecture.
- **Dual-Mode Execution Model**:
  1. **Direct Interactive Track (`/api/chat/stream-sse`)**:
     - Consumed by `apps/web/src/app/chat/ChatClient.tsx` via direct SSE stream.
     - Delivers zero-latency token streaming over HTTP connection, eliminating the previous 1-second BullMQ status polling bottleneck.
     - Includes integrated token budget reservation (`reserveBudget`), user plan quota validation (`checkQuota`), RAG prompt sanitization (`sanitizeRagContext`), multi-modal base64 image resolution (`fileId`), buffer backpressure (`MAX_BUFFER_SIZE = 50`), and post-stream `UsageMetric` persistence.
     - Implements real-time client abort detection via `req.signal.addEventListener("abort")`, saving partial assistant responses with `isPartial: true`.
  2. **Asynchronous Background Queue Track (`/api/chat/stream` + BullMQ)**:
     - Preserved for mobile clients (`apps/mobile`), background queue jobs, tool calling agents, and asynchronous task execution.
     - Enqueues to Redis `chatQueue` with PostgreSQL fallback via `FallbackQueue` during Redis outages.

### 2.2 `docs/architecture/ARCHITECTURE_DEEP_DIVE.md` (Synchronized)
- Updated Section 4 ("Chat Request Lifecycle") to replace contradictory design notes with the authoritative dual-mode specification.
- Removed legacy notes suggesting that `/api/chat/stream-sse` bypassed worker safety controls; documented the ported token budgeting and RAG sanitization controls.

### 2.3 Authentication & Session Concurrency Architecture
- Documented in `SPECIFICATION_FINAL_APPROVAL_READY.md § Section 5` and `docs/architecture/`:
  - **Single-Use Atomic Rotation**: Refresh tokens are single-use SHA-256 hashes. Replacement is executed using an atomic conditional update (`updateMany` with `replacedAt: null`).
  - **Session Lineage & Family Tracking**: Every session belongs to an immutable `familyId`. When a legitimate token is refreshed, the old session records `replacedAt = now` and `replacedByTokenHash = newTokenHash`.
  - **5-Second Grace Window**: Handles concurrent browser tab reloads by caching newly minted tokens in Redis (`token_rotation_cache:${oldTokenHash}`) for 10 seconds. Concurrent requests with matching client fingerprints receive active tokens without session invalidation.
  - **Replay Protection**: Replay attempts outside the 5-second window immediately revoke all sessions associated with the `familyId`.
  - **Banned User Enforcement**: Banning a user immediately increments `tokenVersion`, deletes all active database sessions, and invalidates Redis token version caches.

### 2.4 Perimeter Defense Architecture
- Documented in `SPECIFICATION_FINAL_APPROVAL_READY.md § Section 7`:
  - **Socket-Level SSRF Protection**: In `apps/web/src/lib/security/ssrf-guard.ts`, HTTP requests pre-validate hostnames via `net.isIP()` and override `createConnection` in custom HTTP/HTTPS agents. The resolved socket IP is validated before TCP handshake, neutralizing DNS rebinding (TTL=0) attacks, IPv4-mapped IPv6 representations, and private CIDR ranges.
  - **Path Traversal Elimination**: Batch file uploads enforce `path.basename` stripping and randomized UUID storage paths.
  - **Redis Fallback Schema**: Codified `FallbackQueue` into Prisma migrations and database schema with composite indexes and `heartbeatFallbackJob` lease renewal.

