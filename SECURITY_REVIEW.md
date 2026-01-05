# Security Review Report

## Executive Summary
This document outlines the findings from a security review of the application's codebase. The review focused on authentication, authorization, input validation, and data protection.

## Critical Findings (High Priority)

### 1. **Path Traversal Vulnerability in File Uploads**
- **Location**: `src/app/api/files/upload/route.ts`
- **Issue**: The application uses the user-provided filename directly when saving files to the disk:
  ```typescript
  const filePath = `uploads/${Date.now()}-${file.name}`;
  ```
  While `Date.now()` adds a prefix, malicious filenames containing directory traversal characters (e.g., `../`) could potentially allow writing files to arbitrary locations on the server, depending on how the runtime handles the string concatenation and file system permissions.
- **Recommendation**: Sanitize the filename or use a generated UUID for the storage filename.

### 2. **Insecure Logging of Sensitive Information**
- **Location**: `src/app/api/chat/stream/route.ts`
- **Issue**: The application logs parts of the OpenAI API key and attempts to read the `.env` file directly from disk, logging its content pattern.
  ```typescript
  console.log("[DEBUG] Route loaded key from disk:", apiKey.substring(0, 10) + "...");
  ```
- **Recommendation**: Remove all logging of API keys and secrets. Use environment variables defined in the process, not by reading `.env` manually in production.

### 3. **Inconsistent and Duplicated Authentication Logic**
- **Location**: `middleware.ts`, `src/app/api/chat/stream/route.ts`, `src/app/api/files/upload/route.ts`, `src/lib/auth.ts`
- **Issue**: 
    - The `middleware.ts` checks for the presence of a token but explicitly defers verification to the Node.js runtime. 
    - The API routes (`stream`, `upload`) implement their own manual JWT verification using `jsonwebtoken` and `process.env.JWT_ACCESS_SECRET`, duplicating logic and bypassing the `verifyAccessToken` helper in `src/lib/auth.ts`.
    - `src/lib/auth.ts` uses a default fallback secret ("default_access_secret") if the environment variable is missing, which is insecure for production.
- **Recommendation**: Centralize authentication verification in a single helper (e.g., `src/lib/session.ts`) and ensure all protected routes use it. Remove default fallbacks for secrets in production.

## Medium Priority

### 1. **Weak Input Sanitization**
- **Location**: `src/lib/security.ts`
- **Issue**: The `sanitize` function only removes `<` and `>` characters. This is insufficient for preventing Cross-Site Scripting (XSS) if the output is used in HTML contexts outside of React's automatic escaping.
- **Recommendation**: Use a robust sanitization library like `dompurify` if raw HTML handling is needed, or rely on strict type validation (Zod).

## Low Priority / Best Practices

- **Database**: Refresh tokens are likely stored as plain JWTs in the database. Consider hashing them if you need to protect against database leaks.
- **Error Handling**: Some API routes return raw error details in 500 responses (e.g. `details: fatal.message`), which might leak internal implementation details.

## Proposed Remediation Plan

1.  **Refactor Upload Route**: Use UUIDs for filenames.
2.  **Consolidate Auth**: Update API routes to use `src/lib/session.ts` or `src/lib/auth.ts`.
3.  **Clean Logging**: Remove sensitive debug logs.
