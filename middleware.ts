import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { logger } from "./src/lib/logger";

export async function middleware(req: NextRequest) {
	const ip = req.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";
	const path = req.nextUrl.pathname;
	const requestId = req.headers.get("x-request-id") || crypto.randomUUID();

	// Allow Expo web/clients to access API with credentials in dev
	const allowedOrigins = [
		"http://localhost:8081",
		"http://localhost:8082",
		"http://127.0.0.1:8081",
		"http://127.0.0.1:8082",
		"http://192.168.1.5:8081",
		"http://192.168.1.5:8082",
		"http://192.168.56.1:8081",
		"http://192.168.56.1:8082",
	];
	const origin = req.headers.get("origin") || "";
	const isApiRoute = path.startsWith("/api/");
	const isAllowedOrigin = allowedOrigins.includes(origin);

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
	if (process.env.NODE_ENV === 'development') {
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
		const token = req.cookies.get("auth_access")?.value;
		if (!token) {
			logger.security('Unauthorized API access attempt', { path, ip, requestId });
			return NextResponse.json(
				{ success: false, error: "Unauthorized", timestamp: new Date().toISOString(), requestId },
				{ status: 401 }
			);
		}

		// Verify JWT signature and expiration
		try {
			const accessSecret = process.env.JWT_ACCESS_SECRET;
			if (!accessSecret) {
				throw new Error('JWT_ACCESS_SECRET not configured');
			}

			const payload = jwt.verify(token, accessSecret) as any;
			
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

	return response;
}

export const config = {
	matcher: ["/api/:path*", "/chat/:path*", "/dashboard/:path*", "/admin/:path*", "/login", "/register"],
};
