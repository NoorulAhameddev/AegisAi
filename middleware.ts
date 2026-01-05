import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export async function middleware(req: NextRequest) {
	const ip = req.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";
	const path = req.nextUrl.pathname;

	// Diagnostic Log
	console.log(`[DEBUG] Middleware: ${req.method} ${path} from ${ip}`);


	// Protected UI Routes
	if (path.startsWith("/chat") || path.startsWith("/dashboard") || path.startsWith("/admin")) {
		const token = req.cookies.get("auth_access")?.value || req.cookies.get("auth_refresh")?.value;
		if (!token) {
			const url = req.nextUrl.clone();
			url.pathname = "/login";
			return NextResponse.redirect(url);
		}
	}

	if (path.startsWith("/api/chat") || path.startsWith("/api/files") || path.startsWith("/api/admin")) {
		const token = req.cookies.get("auth_access")?.value;
		if (!token) {
			console.log(`[DEBUG] 401 Unauthorized: ${path}`);
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		// Verification deferred to Route Handler (Node.js runtime) to avoid Edge issues with jsonwebtoken
	}

	const requestHeaders = new Headers(req.headers);
	requestHeaders.set("x-pathname", path);

	return NextResponse.next({
		request: {
			headers: requestHeaders,
		},
	});
}

export const config = {
	matcher: ["/api/:path*", "/chat/:path*", "/dashboard/:path*", "/admin/:path*"],
};
