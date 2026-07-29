import { NextRequest, NextResponse } from "next/server";
import {
  getGoogleAuthUrl,
  generateOAuthState,
} from "@/services/auth/google-oauth";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  try {
    if (!env.ENABLE_GOOGLE_OAUTH) {
      return NextResponse.redirect("/login?error=oauth_disabled");
    }

    // Generate cryptographically secure state parameter to prevent CSRF
    const state = generateOAuthState();
    const authUrl = getGoogleAuthUrl(state);

    // Store state in httpOnly cookie for validation in callback
    const response = NextResponse.redirect(authUrl);
    const isProd = env.NODE_ENV === "production";
    response.cookies.set("oauth_state", state, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    logger.error("Google OAuth redirect failed", error as Error);
    return NextResponse.redirect("/login?error=oauth_failed");
  }
}
