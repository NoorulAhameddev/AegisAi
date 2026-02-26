import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGoogleUserInfo } from "@/services/auth/google-oauth";
import { createSession } from "@/services/auth/session";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  try {
    if (!env.ENABLE_GOOGLE_OAUTH) {
      return NextResponse.redirect(`${SITE_URL}/login?error=oauth_disabled`);
    }
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
      logger.security("Google OAuth callback error", { error });
      return NextResponse.redirect(`${SITE_URL}/login?error=oauth_denied`);
    }

    // Get user info from Google
    const googleUser = await getGoogleUserInfo(code);

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: googleUser.email },
          { provider: "google", providerId: googleUser.providerId },
        ],
      },
    });

    if (user) {
      // Update existing user with OAuth info if needed
      if (!user.provider || !user.providerId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            provider: "google",
            providerId: googleUser.providerId,
            picture: googleUser.picture,
          },
        });
      }
    } else {
      // Create new OAuth user
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          provider: "google",
          providerId: googleUser.providerId,
          picture: googleUser.picture,
          role: "USER",
        },
      });

      logger.auth("New OAuth user registered", {
        userId: user.id,
        provider: "google",
      });
    }

    // Check if banned
    if (user.isBanned) {
      return NextResponse.redirect(`${SITE_URL}/login?error=account_banned`);
    }

    // Create session
    const userAgent = req.headers.get("user-agent") || "unknown";
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const { accessToken, refreshToken } = await createSession(
      user.id,
      userAgent,
      ip,
    );

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN_OAUTH",
        metadata: { provider: "google" },
      },
    });

    // Set cookies and redirect
    const response = NextResponse.redirect(`${SITE_URL}/dashboard`);
    const isProd = env.NODE_ENV === "production";

    response.cookies.set("auth_access", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      path: "/",
      maxAge: 600, // 10 minutes
    });

    response.cookies.set("auth_refresh", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      path: "/",
      maxAge: 604800, // 7 days
    });

    return response;
  } catch (error) {
    logger.error("Google OAuth callback failed", error as Error);
    return NextResponse.redirect(`${SITE_URL}/login?error=oauth_failed`);
  }
}
