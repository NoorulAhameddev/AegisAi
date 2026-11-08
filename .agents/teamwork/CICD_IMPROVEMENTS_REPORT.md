# CI/CD Improvements Report (Deliverable 7)

**Report Date**: 2026-11-07  
**Branch**: `remediation/engineering-hardening`  
**Commit**: `d28902a1cc70a9e63d4332b0c0323725b6ba9ef4`  
**Engineer**: DevOps & CI/CD Engineer  

---

## 1. Executive Summary

Prior to this remediation campaign, the GitHub Actions workflows across the repository were configured in a **fail-open** posture where failing test suites, unpatched high/critical security vulnerabilities, and committed plaintext secrets were systematically ignored, resulting in misleading green pipeline checkmarks.

Milestone M3 comprehensively re-engineered all 8 workflow pipelines under `.github/workflows/`, eliminating fail-open escape hatches, standardizing runners on Node 20 LTS, establishing an explicit vulnerability governance policy, and hardening secret scanning to be strictly blocking.

---

## 2. Detailed Pipeline Remediations

### 2.1 Elimination of Fail-Open Testing Configurations
- **`.github/workflows/ci.yml:132`**:
  - *Pre-remediation*: Contained `continue-on-error: true` on step `npm run test:coverage`. Failing unit tests did not block CI merge.
  - *Post-remediation*: Removed `continue-on-error: true`. Test suite failures immediately fail the job and block pull request merging.
- **`.github/workflows/tests.yml:59`**:
  - *Pre-remediation*: Contained `continue-on-error: true` on step `npm test`.
  - *Post-remediation*: Removed `continue-on-error: true`. Test suite failures genuinely block execution.

### 2.2 Explicit Dependency Vulnerability Policy
- **`.github/workflows/security.yml:40`**:
  - *Pre-remediation*: Contained `npm audit --audit-level=high || true`, silently converting vulnerability exit codes into 0 and providing zero security enforcement.
  - *Post-remediation*: Replaced with `npm run audit:ci`, executing an explicit vulnerability policy against `audit-ci.json`.
- **`audit-ci.json`**:
  - Created a centralized, version-controlled vulnerability management policy at repository root.
  - Formally documents each known unpatched upstream dependency CVE (`@langchain/core`, `ws`, `websocket-driver`, `zod`, `bullmq`, `@modelcontextprotocol/sdk`, `@hono/node-server`, `axios`) with advisory IDs, severity ratings, and explicit architectural rationale, preventing pipeline failures on unpatched upstream libraries while blocking any newly introduced unvetted vulnerabilities.

### 2.3 Blocking Secret Scanning
- **`.github/workflows/security.yml:41-47`**:
  - *Pre-remediation*: Configured with `continue-on-error: true` and arguments `--staged --no-git`, causing the scanner to skip committed files and never block on detected secrets.
  - *Post-remediation*: Updated to `gitleaks/gitleaks-action@v2` with `fetch-depth: 0`, removed `continue-on-error: true`, and enforced strict blocking on confirmed secrets.

### 2.4 Node.js Version & Action Standardization
- Standardized all 8 workflow files (`ci.yml`, `tests.yml`, `lint.yml`, `security.yml`, `prisma-dry-run.yml`, `dashboard-ci.yml`, `deploy.yml`, `docker.yml`) to:
  - `node-version: 20` (Node.js 20 LTS).
  - Official GitHub Action `actions/setup-node@v4` (replacing all instances of unofficial/non-existent `@v7`).

### 2.5 Branch Trigger Alignment & Workflow Deduplication
- Consolidated branch triggers across `ci.yml`, `tests.yml`, `lint.yml`, and `security.yml` to execute consistently on `branches: [main, develop]` for both `push` and `pull_request` events.
- Removed duplicate DB test execution in `deploy.yml` that lacked database service containers.
- Reconfigured `docker.yml` to trigger container image publication on release tags.
- Bound PostgreSQL `5432` and Redis `6379` ports to `127.0.0.1` in `infra/docker/docker-compose.yml`.

### 2.6 Removal of CI Production Validation Bypass
- Removed hardcoded `SKIP_PROD_VALIDATION: "1"` environment variables from `.github/workflows/ci.yml:131, 202` and `.github/workflows/tests.yml:70`. CI pipelines now execute with genuine production environment validation rules.

