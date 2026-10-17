import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/services/auth/auth";
import { getSettings } from "@/lib/settings";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { parseBody } from "@/lib/request-validation";
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  rateLimitResponse,
} from "@/lib/response";
import { registerSchema } from "@/lib/validations";
import { rateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // CRITICAL: Rate limit registration endpoint to prevent brute force
    const limit = await rateLimit(req, { limit: 3, window: 3600, key: "auth:register" }); // 3 registrations per hour per IP
    if (!limit.success) {
      return rateLimitResponse();
    }

    const settings = getSettings();
    if (!settings.allowRegistrations) {
      return forbiddenResponse();
    }

    const { data, response } = await parseBody(req, registerSchema);
    if (response) return response;

    const { name, email, password } = data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return errorResponse("Email exists", { status: 409 });
    }

    const hashed = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
      },
    });

    // Auto-login
    const ip = getTrustedClientIp(req);
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Dynamic import to avoid cycles/issues
    const { createSession } = await import("@/services/auth/session");
    const { accessToken, refreshToken } = await createSession(
      user.id,
      userAgent,
      ip,
    );

    // Audit
    await prisma.auditLog.create({
      data: { userId: user.id, action: "REGISTER" },
    });

    const res = successResponse(
      { message: "Registered & Logged in" },
      { status: 201 },
    );

    const isProd = env.NODE_ENV === "production";

    res.cookies.set("auth_access", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      path: "/",
      maxAge: 600,
    });

    res.cookies.set("auth_refresh", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      path: "/",
      maxAge: 604800,
    });

    return res;
  } catch (e: any) {
    logger.error("Auth: register failed", e);
    return errorResponse("Server error", { status: 500 });
  }
}
