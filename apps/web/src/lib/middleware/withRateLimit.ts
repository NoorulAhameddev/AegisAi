/**
 * Rate Limiting Middleware Wrapper
 * Apply to API routes to enforce rate limits universally
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '../rate-limit';
import { errorResponse } from '../response';

interface RateLimitOptions {
  limit: number;
  window: number; // seconds
  message?: string;
}

/**
 * Default rate limits for different route types
 */
export const RATE_LIMITS = {
  // Chat operations (most frequent)
  CHAT: { limit: 20, window: 60 }, // 20 requests/minute
  
  // Chat streaming (separate limit to prevent abuse)
  CHAT_STREAM: { limit: 10, window: 60 }, // 10 streams/minute
  
  // Admin operations (stricter for security)
  ADMIN: { limit: 100, window: 60 }, // 100 requests/minute
  
  // File operations
  FILE_UPLOAD: { limit: 10, window: 60 }, // 10 uploads/minute
  FILE_DOWNLOAD: { limit: 50, window: 60 }, // 50 downloads/minute
  
  // Auth operations (very strict to prevent brute force)
  AUTH_LOGIN: { limit: 5, window: 300 }, // 5 attempts per 5 minutes
  AUTH_REGISTER: { limit: 3, window: 3600 }, // 3 registrations per hour
  AUTH_REFRESH: { limit: 30, window: 60 }, // 30 refreshes/minute
  
  // RAG/Search operations
  RAG_INGEST: { limit: 20, window: 60 }, // 20 ingestions/minute
  RAG_SEARCH: { limit: 30, window: 60 }, // 30 searches/minute
  
  // General API (fallback)
  DEFAULT: { limit: 100, window: 60 }, // 100 requests/minute
} as const;

/**
 * Adds rate-limit response headers per RFC 6585
 */
function addRateLimitHeaders(response: NextResponse, remaining: number, limit: number, window: number): NextResponse {
  response.headers.set('RateLimit-Limit', String(limit));
  response.headers.set('RateLimit-Remaining', String(Math.max(0, remaining)));
  response.headers.set('RateLimit-Reset', String(Math.floor(Date.now() / 1000) + window));
  return response;
}

/**
 * Wrap an API route handler with rate limiting
 * 
 * @example
 * ```typescript
 * export const POST = withRateLimit(
 *   async (req: NextRequest) => {
 *     // Your handler logic
 *     return successResponse({ data: 'hello' });
 *   },
 *   RATE_LIMITS.CHAT
 * );
 * ```
 */
export function withRateLimit<T extends (req: NextRequest, ...args: any[]) => Promise<Response>>(
  handler: T,
  options: RateLimitOptions = RATE_LIMITS.DEFAULT
): T {
  return (async (req: NextRequest, ...args: any[]) => {
    const rateLimitResult = await rateLimit(req, {
      limit: options.limit,
      window: options.window,
    });

    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        {
          success: false,
          error: options.message || `Rate limit exceeded. Please wait before trying again.`,
          timestamp: new Date().toISOString(),
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(options.window),
          }
        }
      );
      
      return addRateLimitHeaders(response, 0, options.limit, options.window);
    }

    // Execute the actual handler
    const response = await handler(req, ...args);
    
    // Add rate limit headers to successful responses
    return addRateLimitHeaders(
      response instanceof NextResponse ? response : NextResponse.json(response),
      rateLimitResult.remaining,
      options.limit,
      options.window
    );
  }) as T;
}
