# Project: Aegis AI Engineering Remediation Campaign

## Architecture
- **Monorepo Topology**: npm workspaces (`apps/*`, `packages/*`, `services/*`).
- **Core Applications**:
  - `apps/web`: Next.js 16 core web application with App Router, API routes, middleware, and Prisma ORM.
  - `apps/dashboard`: Turbopack dashboard application with embedded worker logic.
  - `apps/mobile`: Expo React Native client.
- **Backend & Data Tier**:
  - PostgreSQL 16 + pgvector extension via Prisma ORM.
  - Redis 7 for BullMQ queues, caching, and distributed rate limiting.
  - AWS KMS / Local fallback secrets encryption provider.
- **Execution Tracks**:
  - **Direct Stream Track**: `/api/chat/stream-sse` provides real-time SSE token streaming over HTTP connection with client disconnect abort handling and partial message persistence.
  - **Asynchronous Queue Track**: `/api/chat/stream` enqueues jobs to BullMQ `chatQueue` for background processing and polling clients.

---

## Feature Inventory

| # | Feature / Requirement | Description | Milestone | Source | Status |
|---|---|---|---|---|---|
| 1 | R1 Spec Refinement Round 1 | Review requirements, identify ambiguities/missing items, rewrite v1, critique | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 2 | R1 Spec Refinement Round 2 | Challenge architecture, security/reliability analysis, measurable criteria, critique | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 3 | R1 Spec Refinement Round 3 | Final approval-ready spec v3, final critique, present for approval | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 4 | Change Management & Branching | Setup `remediation/engineering-hardening`, preserve user changes, isolate PR #30, clean port from PR #25 | M2 | ORIGINAL_REQUEST §R1 | DONE (commit `4c1465b`) |
| 5 | Baseline Verification Harness | Execute baseline commands, fix duplicate scripts, setup local mocks | M2 | ORIGINAL_REQUEST §Verification | DONE (`baseline_results.md`) |
| 6 | Eliminate CI Fail-Open Steps | Remove `continue-on-error: true` in `ci.yml` and `tests.yml` | M3 | ORIGINAL_REQUEST §R2 | DONE (commit `d28902a`) |
| 7 | Eliminate npm audit Suppression | Remove `|| true` from `security.yml`, enforce explicit vulnerability policy | M3 | ORIGINAL_REQUEST §R2 | DONE (`audit-ci.json`) |
| 8 | Blocking Gitleaks Secret Scanning | Fix arguments, remove `--no-git`, make secret scanning blocking | M3 | ORIGINAL_REQUEST §R2 | DONE |
| 9 | Node.js Version Alignment | Harmonize all workflows to Node 20 LTS and `actions/setup-node@v4` | M3 | ORIGINAL_REQUEST §R2 | DONE |
| 10 | Workflow Deduplication & Triggers | Consolidate `ci.yml`/`tests.yml`/`lint.yml`, align branch triggers | M3 | ORIGINAL_REQUEST §R2 | DONE |
| 11 | Eliminate SKIP_PROD_VALIDATION Bypass | Remove production bypass capability in `apps/web/src/lib/env.ts` | M4 | ORIGINAL_REQUEST §R3 | DONE (commit `e291795`) |
| 12 | Insecure Secret Defaults Removal | Eliminate dev secret fallbacks for JWT and audit-signing keys | M4 | ORIGINAL_REQUEST §R3 | DONE |
| 13 | APP_ENV & NODE_ENV Harmonization | Prevent contradictory security behaviors between env flags | M4 | ORIGINAL_REQUEST §R3 | DONE |
| 14 | Secrets Provider & Worker Env | Ensure conditional AWS KMS validation based on `SECRET_PROVIDER` | M4 | ORIGINAL_REQUEST §R3 | DONE |
| 15 | Env Validation Regression Tests | Automated tests rejecting invalid production configs (AC-01 to AC-05) | M4 | ORIGINAL_REQUEST §R3 | DONE (31/31 passed) |
| 16 | Atomic Refresh-Token Rotation | Atomic transaction replacing session and deleting old token | M5 | ORIGINAL_REQUEST §R4 | DONE (commit `a8cbb7e`) |
| 17 | Concurrent Refresh & Grace Window | Handle concurrent requests safely with grace period / family tracking | M5 | ORIGINAL_REQUEST §R4 | DONE |
| 18 | Safe Replay Detection | Distinguish concurrency from replay without false-positive session wipeouts | M5 | ORIGINAL_REQUEST §R4 | DONE |
| 19 | Revocation Consistency & Banned Users | Enforce immediate ban and revocation checks across DB & middleware | M5 | ORIGINAL_REQUEST §R4 | DONE |
| 20 | Auth & Session Regression Tests | Automated concurrency, replay, expiration, and failure tests (AC-06 to AC-10) | M5 | ORIGINAL_REQUEST §R4 | DONE (15/15 passed) |
| 21 | Chat SSE Endpoint Hardening | Port token budgeting, usage tracking, and RAG sanitization to `/api/chat/stream-sse` | M6 | ORIGINAL_REQUEST §R5 | DONE (commit `bc33eb3`) |
| 22 | Frontend Chat Streaming Migration | Migrate `ChatClient.tsx` from 1s polling to `/api/chat/stream-sse` | M6 | ORIGINAL_REQUEST §R5 | DONE |
| 23 | Chat Queue Preservation | Retain `/api/chat/stream` and BullMQ workers for mobile & background tasks | M6 | ORIGINAL_REQUEST §R5 | DONE |
| 24 | Chat Technical Documentation | Update architecture docs to reflect reconciled dual-mode execution | M6 | ORIGINAL_REQUEST §R5 | DONE (`CHAT_EXECUTION_ARCHITECTURE.md`) |
| 25 | SSRF Remediation | Implement strict URL validation & private IP blocking in ingestion & web-browser | M7 | ORIGINAL_REQUEST §R6 | DONE (commit `5d0fbac`) |
| 26 | Path Traversal Remediation | Sanitize uploaded filenames and enforce UUID storage paths | M7 | ORIGINAL_REQUEST §R6 | DONE |
| 27 | Fallback Queue Database Schema | Add `fallback_queue` model and migration for Redis failure resilience | M7 | ORIGINAL_REQUEST §R6 | DONE |
| 28 | Vector Provider Query Bug Fix | Fix nested Promise interpolation in `pgvector-provider.ts` | M7 | ORIGINAL_REQUEST §R6 | DONE |
| 29 | Rate Limiting IP Spoofing Guard | Enforce trusted proxy hop indexing or socket IP resolution | M7 | ORIGINAL_REQUEST §R6 | DONE |
| 30 | CSRF & PII Logging Hardening | Enforce CSRF on logout and strict redaction of sensitive credentials in logs | M7 | ORIGINAL_REQUEST §R6 | DONE |
| 31 | 10 Final Deliverables & Audit | Produce 10 deliverables, verify post-remediation baseline, final forensic audit | M8 | ORIGINAL_REQUEST §R6 | DONE (Commit `22a95a9`, Verdict: CLEAN) |

---

## Milestones

| # | Name | Scope | Dependencies | Status | Key Artifacts |
|---|---|---|---|---|---|
| M0 | Initial Repository Audit & Survey | Codebase survey, working tree inspection, Deliverable 1 | None | DONE | `INITIAL_REPOSITORY_AUDIT.md` |
| M1 | Specification Refinement (R1) | 3 refinement rounds, independent criticism, approval-ready spec | M0 | DONE | `SPECIFICATION_FINAL_APPROVAL_READY.md` |
| M2 | Branch Setup & Verification Harness | Branch `remediation/engineering-hardening`, package scripts, baseline run | M1 (Approval Gate) | DONE | Commit `4c1465b`, `baseline_results.md` |
| M3 | CI/CD & Security Hardening (R2) | GitHub Actions repair, blocking Gitleaks, explicit CVE policy | M2 | DONE | Commit `d28902a`, `audit-ci.json` |
| M4 | Production Environment Hardening (R3) | `env.ts` hardening, secret defaults removal, regression tests | M2 | DONE | Commit `e291795`, `env.test.ts` (31/31 passed) |
| M5 | Refresh-Token Rotation & Sessions (R4) | Atomic rotation, concurrency grace period, Prisma session updates | M2, M4 | DONE | Commit `a8cbb7e`, `auth-refresh.test.ts` (15/15 passed) |
| M6 | Chat Architecture Reconciliation (R5) | `/api/chat/stream-sse` hardening, `ChatClient.tsx` migration, docs | M2, M4 | DONE | Commit `bc33eb3`, `chat-sse.test.ts` (7/7 passed) |
| M7 | Security Remediation (R6) | SSRF, path traversal, `fallback_queue`, SQL bug, CSRF, logging | M2, M4, M5 | DONE | Commit `5d0fbac`, `security-remediation.test.ts` (22/22 passed) |
| M8 | Final Integration & 10 Deliverables | Verification outputs, test suite, final production audit | M3, M4, M5, M6, M7 | DONE | `FINAL_AUDIT_REPORT.md` (Verdict: CLEAN, Commit `22a95a9`) |
