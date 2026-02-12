import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/services/auth/auth";
import { loginSchema } from "@/lib/validations";
import { parseBody } from "@/lib/request-validation";
import { env } from "@/lib/env";
import { errorResponse, successResponse, rateLimitResponse } from "@/lib/response";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  // CRITICAL: Rate limit login attempts to prevent brute force
  const limit = await rateLimit(req, { limit: 20, window: 3600 }); // 20 attempts per hour per IP
  if (!limit.success) {
    logger.security('Login rate limit exceeded', { ip: req.headers.get('x-forwarded-for') });
    return rateLimitResponse();
  }

  const { data, response } = await parseBody(req, loginSchema);
  if (response) return response;

  const { email, password } = data;
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    return errorResponse("Invalid credentials", { status: 401 });
  }

  const isValid = await comparePassword(password, user.password);

  if (!isValid) {
    return errorResponse("Invalid credentials", { status: 401 });
  }

  if ((user as any).isBanned) {
    return errorResponse("Your account has been permanently suspended.", { status: 403 });
  }

  // Get IP and UserAgent
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  const { createSession } = await import("@/services/auth/session");
  const { accessToken, refreshToken } = await createSession(user.id, userAgent, ip);

  // Audit Log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "LOGIN",
    }
  });

  const res = successResponse({ message: "Logged in" });

  const isProd = env.NODE_ENV === "production";

  res.cookies.set("auth_access", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax", // allow mobile/web dev origin
    path: "/",
    maxAge: 600, // 10 minutes
  });

  res.cookies.set("auth_refresh", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax",
    path: "/",
    maxAge: 604800, // 7 days
  });

  return res;
}
