import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { logger } from "./src/lib/logger";
import { env } from "./src/lib/env";
import { isAdminRole } from "./src/services/auth/permissions";

export async function middleware(req: NextRequest) {
	const ip = req.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";
	const path = req.nextUrl.pathname;
	const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
	
	// Generate CSP nonce for inline scripts (security hardening)
	const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

	// Allow Expo web/clients to access API with credentials in dev
	// CRITICAL: Read from environment to avoid hardcoding production origins
	const allowedOriginsList = env.ALLOWED_ORIGINS 
		? env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
		: [
			"http://localhost:8081",
			"http://localhost:8082",
			"http://127.0.0.1:8081",
			"http://127.0.0.1:8082",
		];
	
	const origin = req.headers.get("origin") || "";
	const isApiRoute = path.startsWith("/api/");
	const isAllowedOrigin = allowedOriginsList.includes(origin);

	// Handle CORS preflight for API routes
	if (isApiRoute && req.method === "OPTIONS") {
		const res = new NextResponse(null, { status: 204 });
		if (isAllowedOrigin) {
			res.headers.set("Access-Control-Allow-Origin", origin);
			res.headers.set("Access-Control-Allow-Credentials", "true");
			res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
			res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-request-id");
		}
		return res;
	}

	// Diagnostic Log (development only)
	if (env.NODE_ENV === 'development') {
		console.log(`[DEBUG] Middleware: ${req.method} ${path} from ${ip}`);
	}

	// Protected UI Routes
	if (path.startsWith("/chat") || path.startsWith("/dashboard") || path.startsWith("/admin")) {
		const token = req.cookies.get("auth_access")?.value || req.cookies.get("auth_refresh")?.value;
		if (!token) {
			const url = req.nextUrl.clone();
			url.pathname = "/login";
			return NextResponse.redirect(url);
		}

		if (path.startsWith("/admin")) {
			try {
				const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
				if (!isAdminRole(payload.role)) {
					const url = req.nextUrl.clone();
					url.pathname = "/dashboard";
					return NextResponse.redirect(url);
				}
			} catch {
				const url = req.nextUrl.clone();
				url.pathname = "/login";
				return NextResponse.redirect(url);
			}
		}
	}

	// Redirect authenticated users away from auth pages
	if (path === "/login" || path === "/register") {
		const token = req.cookies.get("auth_access")?.value || req.cookies.get("auth_refresh")?.value;
		if (token) {
			const url = req.nextUrl.clone();
			url.pathname = "/dashboard";
			return NextResponse.redirect(url);
		}
	}

	// Verify JWT for API routes
	if (path.startsWith("/api/chat") || path.startsWith("/api/files") || path.startsWith("/api/admin")) {
		// Support both cookie and Bearer token authentication
		let token = req.cookies.get("auth_access")?.value;
		
		// If no cookie, check Authorization Bearer header
		if (!token) {
			const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
			if (authHeader?.startsWith("Bearer ")) {
				token = authHeader.substring(7); // Remove "Bearer " prefix
			}
		}
		
		if (!token) {
			logger.security('Unauthorized API access attempt', { path, ip, requestId });
			return NextResponse.json(
				{ success: false, error: "Unauthorized", timestamp: new Date().toISOString(), requestId },
				{ status: 401 }
			);
		}

		// Verify JWT signature and expiration
		try {
			const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;

			if (path.startsWith("/api/admin") && !isAdminRole(payload.role)) {
				logger.security('Forbidden admin API access attempt', { path, ip, requestId });
				return NextResponse.json(
					{ success: false, error: "Forbidden", timestamp: new Date().toISOString(), requestId },
					{ status: 403 }
				);
			}
			
			// Check token version hasn't been revoked (will verify in route handler against DB)
			const requestHeaders = new Headers(req.headers);
			requestHeaders.set("x-user-id", payload.userId);
			requestHeaders.set("x-token-version", payload.tokenVersion?.toString() || "0");
			requestHeaders.set("x-request-id", requestId);

			return NextResponse.next({
				request: {
					headers: requestHeaders,
				},
			});
		} catch (error) {
			if (error instanceof jwt.TokenExpiredError) {
				logger.security('Expired token used', { path, ip, requestId });
				return NextResponse.json(
					{ success: false, error: "Token expired", timestamp: new Date().toISOString(), requestId },
					{ status: 401 }
				);
			} else if (error instanceof jwt.JsonWebTokenError) {
				logger.security('Invalid token signature', { path, ip, requestId });
				return NextResponse.json(
					{ success: false, error: "Invalid token", timestamp: new Date().toISOString(), requestId },
					{ status: 401 }
				);
			}
			logger.error('Token verification error', error as Error, { path, ip, requestId });
			return NextResponse.json(
				{ success: false, error: "Authentication failed", timestamp: new Date().toISOString(), requestId },
				{ status: 401 }
			);
		}
	}

	const requestHeaders = new Headers(req.headers);
	requestHeaders.set("x-pathname", path);
	requestHeaders.set("x-request-id", requestId);
	requestHeaders.set("x-client-ip", ip);
	requestHeaders.set("x-nonce", nonce); // Pass nonce to pages for inline scripts

	const response = NextResponse.next({
		request: {
			headers: requestHeaders,
		},
	});

	// Add CORS headers for API routes when origin is allowed
	if (isApiRoute && isAllowedOrigin) {
		response.headers.set("Access-Control-Allow-Origin", origin);
		response.headers.set("Access-Control-Allow-Credentials", "true");
		response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
		response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-request-id");
	}
	
	// Add strict CSP with nonce for HTML pages (security hardening)
	// This overrides the permissive CSP from next.config.js for better security
	if (!isApiRoute && req.method === 'GET') {
		const cspHeader = `
			default-src 'self';
			script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://cdn.jsdelivr.net;
			style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com;
			img-src 'self' data: https:;
			font-src 'self' https://fonts.gstatic.com;
			connect-src 'self' https://api.openrouter.io;
			frame-ancestors 'none';
			base-uri 'self';
			form-action 'self';
			upgrade-insecure-requests;
		`.replace(/\\s{2,}/g, ' ').trim();
		
		response.headers.set('Content-Security-Policy', cspHeader);
	}

	return response;
}

export const config = {
	matcher: ["/api/:path*", "/chat/:path*", "/dashboard/:path*", "/admin/:path*", "/login", "/register"],
};
