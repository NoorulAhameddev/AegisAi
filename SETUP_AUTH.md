# Authentication & Security Implementation

This phase introduced a robust, production-ready authentication and security system.

## 1. Architecture
- **Sessions**: Database-backed sessions using the `Session` Prisma model.
- **Tokens**: 
  - `Access Token` (JWT, 10m): Short-lived for API access.
  - `Refresh Token` (JWT, 7d): Rotated on every use. Stored as a hash in DB.
- **Revocation**: 
  - `tokenVersion` in User model allows global revocation of all tokens for a user.
  - Deleting a `Session` record revokes that specific device/session.

## 2. Security Controls
- **RBAC**: Role-Based Access Control implemented in `src/lib/rbac.ts`. Admin-only routes are protected.
- **Rate Limiting**: `rate-limit.ts` protects API endpoints (20 req/min).
- **Quota**: `quota.ts` enforces daily token limits (50k tokens/day) per user.
- **Content Security**: `security.ts` provides:
  - Input Validation (Jailbreak detection, length limits).
  - Output Validation (PII/Key leak detection).
- **Encryption**: `encryption.ts` available for encrypting sensitive fields at rest.

## 3. Configuration
Ensure your `.env` is updated:

```env
JWT_ACCESS_SECRET="complex_secret_here"
JWT_REFRESH_SECRET="complex_secret_here"
ENCRYPTION_KEY="32_character_random_string_here"
```

## 4. Maintenance
- **Cleanup**: The AI Worker (`npm run worker`) now includes a periodic task to clean up expired sessions and old audit logs.
- **Auditing**: Critical actions (Login, Register, Chat) are logged to `AuditLog`.
