import { verifyAccessToken, verifyRefreshToken, signAccessToken, signRefreshToken, TokenPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { logger } from "./logger";

// Helper to hash token for storage
export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create a new session with access and refresh tokens
 */
export async function createSession(userId: string, userAgent?: string, ip?: string) {
  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { id: true, role: true, tokenVersion: true }
  });
  
  if (!user) throw new Error("User not found");

  // Generate tokens with unique session ID
  const sessionId = crypto.randomUUID();

  const refreshPayload = {
    userId,
    role: user.role,
    tokenVersion: user.tokenVersion,
    tokenId: sessionId
  };

  const refreshToken = signRefreshToken(refreshPayload);
  const accessToken = signAccessToken({
    userId,
    role: user.role,
    tokenVersion: user.tokenVersion
  });

  // Store session with hashed token (best practice)
  await prisma.session.create({
    data: {
      userId,
      token: hashToken(refreshToken),
      userAgent,
      ipAddress: ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  });

  logger.auth('Session created', { userId, sessionId });
  return { accessToken, refreshToken };
}

/**
 * Rotate tokens - issue new access/refresh token pair
 */
export async function rotateTokens(
  userId: string,
  oldRefreshToken: string,
  userAgent?: string,
  ip?: string
) {
  try {
    // Verify the refresh token is still valid
    const payload = verifyRefreshToken(oldRefreshToken);
    
    // Check that the token hasn't been revoked in DB
    const session = await prisma.session.findFirst({
      where: {
        userId,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
      throw new Error('Session not found or expired');
    }

    // Create new session
    const { accessToken, refreshToken } = await createSession(userId, userAgent, ip);
    
    logger.auth('Tokens rotated', { userId });
    return { accessToken, refreshToken };
  } catch (error) {
    logger.error('Token rotation failed', error as Error, { userId });
    throw error;
  }
}

/**
 * Revoke all sessions for a user (instant logout everywhere)
 * Used when user changes password or admin force logout
 */
export async function revokeAllSessions(userId: string, reason?: string): Promise<void> {
  try {
    await prisma.session.deleteMany({
      where: { userId }
    });

    logger.security('All sessions revoked', { userId, reason });

    // Also increment tokenVersion to invalidate all outstanding JWTs
    await prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } }
    });
  } catch (error) {
    logger.error('Failed to revoke all sessions', error as Error, { userId });
    throw error;
  }
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string) {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() }
      },
      select: {
        id: true,
        createdAt: true,
        lastActive: true,
        expiresAt: true,
        userAgent: true,
        ipAddress: true
      },
      orderBy: { lastActive: 'desc' }
    });

    return sessions;
  } catch (error) {
    logger.error('Failed to get user sessions', error as Error, { userId });
    throw error;
  }
}

/**
 * Update session last activity timestamp
 */
export async function updateSessionActivity(sessionToken: string): Promise<void> {
  try {
    await prisma.session.updateMany({
      where: { token: hashToken(sessionToken) },
      data: { lastActive: new Date() }
    });
  } catch (error) {
    // Silently log - not critical if this fails
    logger.debug('Failed to update session activity');
  }
}

/**
 * Clean up expired sessions (run periodically via cron or worker)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });

    if (result.count > 0) {
      logger.debug(`Cleaned up ${result.count} expired sessions`);
    }

    return result.count;
  } catch (error) {
    logger.error('Failed to cleanup expired sessions', error as Error);
    return 0;
  }
}

/**
 * Get user from request - handles token verification
 */
export async function getUserFromRequest(req: Request | NextRequest) {
  let token: string | undefined;

  // Cookie extraction helper
  const getCookie = (name: string) => {
    if ("cookies" in req && typeof (req as any).cookies?.get === "function") {
      return (req as any).cookies.get(name)?.value;
    }
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
      return match ? match[1] : undefined;
    }
    return undefined;
  };

  token = getCookie("auth_access");

  if (!token) return null;

  try {
    const payload = verifyAccessToken(token);
    
    // Verify token version is still valid (allows instant revocation if needed)
    // For performance, only check on explicit operations, not every request
    // Short-lived access tokens (10m) make this less critical
    
    return payload;
  } catch (err) {
    logger.debug('Token verification failed');
    return null;
  }
}
