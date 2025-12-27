import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth";

export function middleware(req: NextRequest) {
	const token = req.cookies.get("auth_access")?.value;
	if (!token) return NextResponse.redirect(new URL("/login", req.url));

	try {
		verifyAccessToken(token);
		return NextResponse.next();
	} catch {
		return NextResponse.redirect(new URL("/login", req.url));
	}
}

export const config = {
	matcher: ["/chat/:path*", "/dashboard/:path*", "/chat", "/dashboard"],
};
