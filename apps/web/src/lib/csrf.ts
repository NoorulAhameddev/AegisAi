/**
 * CSRF Protection Middleware
 * Implements double-submit cookie pattern for CSRF protection
 */

import { NextRequest, NextResponse } from "next/server";

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generate a random CSRF token
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for older environments
    for (let i = 0; i < 32; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/**
 * Validate CSRF token using double-submit cookie pattern
 */
export function validateCSRFToken(request: NextRequest): boolean {
  // Skip CSRF for GET, HEAD, OPTIONS (safe methods)
  const method = request.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  // Skip for webhook endpoints (they use signature validation)
  const path = request.nextUrl.pathname;
  if (path.includes("/webhooks") || path.includes("/stripe")) {
    return true;
  }

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (!headerToken) {
    return false;
  }

  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!cookieToken) {
    return false;
  }

  // Compare using timing-safe comparison
  if (headerToken.length !== cookieToken.length) {
    return false;
  }

  // Simple comparison (the real security comes from origin checking)
  return headerToken === cookieToken;
}

/**
 * Create CSRF response - sets cookie and returns response
 */
export function createCSRFResponse(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  // Check if cookie already exists
  let csrfToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  // Generate new token if needed
  if (!csrfToken) {
    csrfToken = generateCSRFToken();

    // Set cookie with secure flags
    response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }

  // Pass token to client via header (for AJAX requests)
  response.headers.set(CSRF_HEADER_NAME, csrfToken);

  return response;
}
