# 🔒 Aegis AI Security Architecture & Policy

## Executive Security Overview

Aegis AI incorporates defense-in-depth security principles across every layer of the platform: authentication, session lifecycle management, request validation, socket-level perimeter defense, cryptographic audit verification, and CI/CD pipeline enforcement.

---

## 1. Authentication & Session Concurrency

### Atomic Refresh-Token Rotation
- **Single-Use Rotation**: Refresh tokens are strictly single-use. When a refresh token is presented, the database session record is atomically claimed and retired via optimistic concurrency locking (`updateMany` with `replacedAt: null`).
- **5-Second Fingerprint Grace Window**: To prevent false-positive replay lockouts caused by concurrent browser tab refreshes, an in-flight rotation is cached in Redis for 5 seconds. Concurrent requests within this window receive the newly issued access token while validating client IP and User-Agent fingerprints to reject cross-client replay attacks.
- **Session Family Revocation**: Detected token reuse or replay attacks outside the grace window immediately trigger automatic revocation of the entire session lineage (`familyId`), preventing compromised token exploitation.
- **Account Status Validation**: Revoked sessions and banned users are deterministically blocked from refreshing tokens or initiating chat streams.
- **Redis Partition Resilience**: All Redis cache interactions inside session transactions are wrapped in non-throwing handlers, guaranteeing that database token rotation succeeds atomically even during total Redis unavailability.

---

## 2. Perimeter & Network Security

### Socket-Level SSRF Protection (`ssrf-guard.ts`)
- **Pre-Connect Interception**: External URL requests (such as web browsing, document fetching, and webhook integration) are intercepted before socket creation.
- **IP Literal Verification**: Direct IP addresses (e.g. `http://169.254.169.254/`) are validated prior to connection attempts, neutralizing Node.js `net.isIP` DNS-hook bypasses.
- **Custom Agent Socket Binding**: Custom HTTP/HTTPS agents override `createConnection` and attach event handlers to socket `connect` and `secureConnect` events, inspecting `socket.remoteAddress` against blocked CIDRs before dispatching any HTTP payloads:
  - Private IPv4 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
  - Loopback addresses (`127.0.0.0/8`, `::1`)
  - Link-local and cloud metadata endpoints (`169.254.0.0/16`, `fe80::/10`)
  - IPv6 Unique Local Addresses (`fc00::/7`)
- **Redirect Chain Enforcement**: Redirect chains are capped at 3 hops, with complete socket-level IP re-validation executed on every redirect target.

### File Upload & Path Traversal Sanitization
- File uploads are validated for MIME type integrity, strictly size-capped, and written to filesystem storage using secure, randomized UUIDs rather than user-supplied filenames, eliminating directory traversal vulnerabilities (`../../`).

---

## 3. Production Environment Lockdown (`env.ts`)

- **Elimination of Validation Bypass**: Setting `SKIP_PROD_VALIDATION=1` in a production runtime (`NODE_ENV=production` or `APP_ENV=production`) throws a fatal error during application initialization, terminating the process immediately.
- **Removal of Insecure Defaults**: Insecure development fallback secrets (`dev-access-secret-...`) have been eliminated from production pathways. Production runtimes mandate high-entropy secrets (≥64 characters) for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `AUDIT_SIGNING_KEY`.
- **Compile-Time Build Decoupling**: Standalone static generation during Next.js build (`NEXT_PHASE === 'phase-production-build'`) uses dummy compile-time placeholders, allowing reproducible CI builds without exposing or requiring live production secrets.
- **CORS & Origin Hardening**: Wildcard origins (`*`) are strictly prohibited in production, requiring explicit HTTPS origins in `ALLOWED_ORIGINS`.

---

## 4. Cryptographic Integrity & Logging Safety

- **Data Encryption at Rest**: All sensitive user data, messages, and API keys are encrypted at rest using AES-256-GCM with key versioning (`v1:iv:authTag:ciphertext`).
- **Timing-Safe HMAC Verification**: Audit log HMAC verification utilizes `crypto.timingSafeEqual` with explicit buffer byte-length assertions to prevent Node.js `RangeError` crashes and timing attack vulnerabilities.
- **100% PII Redaction in Logs**: Structured application loggers automatically mask tokens, passwords, authorization headers, email addresses, and cryptographic keys as `"[REDACTED]"`.

---

## 5. CI/CD & Pipeline Enforcement

- **Genuinely Blocking Workflows**: All GitHub Actions workflows (`ci.yml`, `tests.yml`, `security.yml`, etc.) strictly enforce step failure. All instances of `continue-on-error: true` and `npm audit ... || true` have been removed.
- **Blocking Secret Scanning**: Gitleaks secret scanning runs with full Git history (`fetch-depth: 0`) and halts pull request and push workflows on confirmed plaintext secrets.
- **Explicit Vulnerability Allowlist Policy**: Dependency auditing is enforced via `audit-ci` (`audit-ci.json`), blocking unexpected Critical and High CVEs while documenting approved upstream exceptions.
- **Node.js 20 LTS Standardization**: All 8 CI/CD workflows are locked to Node.js 20 LTS and `actions/setup-node@v4`.

---

## 6. Vulnerability Reporting Policy

If you discover a potential security vulnerability in Aegis AI, please disclose it responsibly:

- **Do NOT open a public GitHub issue.**
- Email the security maintainer at **security@aegis-ai.com** (or use GitHub Private Vulnerability Reporting under **Security → Report a vulnerability**).
- Please include reproduction steps, impacted components, and proof-of-concept details.
- We acknowledge vulnerability reports within 48 hours and provide regular progress updates through remediation.
