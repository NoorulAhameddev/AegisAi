import { NextRequest } from "next/server";
import { rotateSessionAtomic } from "@/services/auth/session";
import { successResponse, errorResponse } from "@/lib/response";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limiting: 30 refreshes per minute (prevent token refresh abuse)
  const rateLimitResult = await rateLimit(req, { limit: 30, window: 60 });
  if (!rateLimitResult.success) {
    return errorResponse("Rate limit exceeded", { status: 429 });
  }

  try {
    const refreshToken = req.cookies.get("auth_refresh")?.value;
    if (!refreshToken) {
      return errorResponse("Missing refresh token", { status: 401 });
    }

    const userAgent = req.headers.get("user-agent") || "";
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      (req as any).socket?.remoteAddress ||
      "";

    const result = await rotateSessionAtomic(refreshToken, userAgent, ip);

    const res = successResponse({ message: "Refreshed" });
    const isProdOrTest = env.NODE_ENV === "production" || env.NODE_ENV === "test";

    res.cookies.set("auth_access", result.accessToken, {
      httpOnly: true,
      secure: isProdOrTest,
      sameSite: "strict",
      path: "/",
      maxAge: 600, // 10 minutes
    });

    // Only set auth_refresh if a valid replacement token is present (prevents cookie poisoning)
    if (result.refreshToken) {
      res.cookies.set("auth_refresh", result.refreshToken, {
        httpOnly: true,
        secure: isProdOrTest,
        sameSite: "strict",
        path: "/",
        maxAge: 604800, // 7 days
      });
    }

    return res;
  } catch (error: any) {
    return errorResponse(error.message || "Failed to refresh session", {
      status: error.statusCode || 401,
    });
  }
}
