import { NextResponse } from "next/server";

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    timestamp: string;
    requestId?: string;
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
    data: T,
    options?: {
        message?: string;
        requestId?: string;
        status?: number;
    }
): NextResponse<ApiResponse<T>> {
    return NextResponse.json(
        {
            success: true,
            data,
            message: options?.message,
            timestamp: new Date().toISOString(),
            requestId: options?.requestId,
        },
        { status: options?.status || 200 }
    );
}

/**
 * Create a standardized error response
 */
export function errorResponse(
    error: string,
    options?: {
        message?: string;
        requestId?: string;
        status?: number;
    }
): NextResponse<ApiResponse> {
    return NextResponse.json(
        {
            success: false,
            error,
            message: options?.message || error,
            timestamp: new Date().toISOString(),
            requestId: options?.requestId,
        },
        { status: options?.status || 400 }
    );
}

/**
 * Create 401 Unauthorized response
 */
export function unauthorizedResponse(options?: { requestId?: string }) {
    return errorResponse("Unauthorized", {
        status: 401,
        requestId: options?.requestId,
    });
}

/**
 * Create 403 Forbidden response
 */
export function forbiddenResponse(options?: { requestId?: string }) {
    return errorResponse("Forbidden", {
        status: 403,
        requestId: options?.requestId,
    });
}

/**
 * Create 404 Not Found response
 */
export function notFoundResponse(options?: { requestId?: string }) {
    return errorResponse("Not Found", {
        status: 404,
        requestId: options?.requestId,
    });
}

/**
 * Add rate limit headers to any response (success or error)
 */
export function withRateLimitHeaders(
    response: NextResponse,
    options: {
        limit: number;
        remaining: number;
        resetAfter?: number; // seconds until reset
    }
) {
    response.headers.set("RateLimit-Limit", String(options.limit));
    response.headers.set("RateLimit-Remaining", String(Math.max(0, options.remaining)));
    if (options.resetAfter !== undefined) {
        response.headers.set("RateLimit-Reset", String(Math.ceil(Date.now() / 1000) + options.resetAfter));
    }
    return response;
}

/**
 * Create 429 Too Many Requests response with rate limit headers
 */
export function rateLimitResponse(options?: { 
    requestId?: string;
    limit?: number;
    remaining?: number;
    resetAfter?: number; // seconds until reset
}) {
    const response = errorResponse("Too many requests. Please try again later.", {
        status: 429,
        requestId: options?.requestId,
    });
    
    // Add standard RateLimit headers per RFC 6585
    if (options?.limit !== undefined) {
        response.headers.set("RateLimit-Limit", String(options.limit));
    }
    if (options?.remaining !== undefined) {
        response.headers.set("RateLimit-Remaining", String(Math.max(0, options.remaining)));
    }
    if (options?.resetAfter !== undefined) {
        response.headers.set("RateLimit-Reset", String(Math.ceil(Date.now() / 1000) + options.resetAfter));
        response.headers.set("Retry-After", String(options.resetAfter));
    }
    
    return response;
}

/**
 * Create 400 Bad Request response
 */
export function badRequestResponse(error: string, options?: { requestId?: string }) {
    return errorResponse(error, {
        status: 400,
        requestId: options?.requestId,
    });
}
