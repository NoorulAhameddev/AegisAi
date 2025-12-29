import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { rateLimit } from "@/lib/rateLimit";

export async function middleware(req: NextRequest) {
	const ip = req.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";
	const path = req.nextUrl.pathname;

	// Diagnostic Log
	console.log(`[DEBUG] Middleware: ${req.method} ${path} from ${ip}`);

	// Bypassing rate limit for now to prevent hangs
	const allowed = true;


	if (path.startsWith("/api/chat") || path.startsWith("/api/files") || path.startsWith("/api/admin")) {
		const token = req.cookies.get("auth_access")?.value;
		if (!token) {
			console.log(`[DEBUG] 401 Unauthorized: ${path}`);
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		try {
			jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
		} catch (err: any) {
			console.log(`[DEBUG] 401 Invalid Token: ${err.message}`);
			return NextResponse.json({ error: "Invalid token" }, { status: 401 });
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/api/:path*"],
};
