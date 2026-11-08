import {
  verifyAccessToken,
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  TokenPayload,
  RefreshTokenPayload,
} from "./auth";
import { prisma } from "@/lib/prisma";

if (typeof globalThis !== "undefined" && !(globalThis as any).prisma) {
  (globalThis as any).prisma = prisma;
}

let prismaClient: any = prisma;

export function setPrismaClientForTesting(client: any): void {
  prismaClient = client;
}

export function getDbClient(): any {
  return prismaClient || prisma;
}
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import Redis from "ioredis";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export const ROTATION_GRACE_WINDOW_MS = 5000; // 5 seconds grace window
export const ROTATION_CACHE_TTL_SEC = 10; // 10 seconds Redis cache TTL

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

// Helper to hash token for storage
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Redis instance for session caching with safe fail-open error handling
export let redis: InstanceType<typeof Redis> | null = null;

try {
  if (env.REDIS_URL) {
    redis = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
    redis.on("error", (err: unknown) => {
      logger.warn("Session Redis error", {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }
} catch {
  redis = null;
}

export function setRedisClientForTesting(client: any): void {
  redis = client;
}

export async function isUserBannedInCache(userId: string): Promise<boolean> {
  if (!redis) return false;
  try {
    const val = await redis.get(`user_banned:${userId}`);
    return val === "1" || val === "true";
  } catch {
    return false;
  }
}

export async function setUserBannedInCache(
  userId: string,
  isBanned: boolean,
): Promise<void> {
  if (!redis) return;
  try {
    if (isBanned) {
      await redis.set(`user_banned:${userId}`, "1", "EX", 86400); // 24 hours
    } else {
      await redis.del(`user_banned:${userId}`);
    }
  } catch {
    // Fail silently on cache error
  }
}

/**
 * Create a new session with access and refresh tokens
 */
export async function createSession(
  userId: string,
  userAgent?: string,
  ip?: string,
  familyId?: string,
) {
  const db = prismaClient || prisma;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, tokenVersion: true },
  });

  if (!user) throw new Error("User not found");

  // Generate tokens with unique session ID
  const sessionId = crypto.randomUUID();
  const sessionFamilyId = familyId || crypto.randomUUID();

  const refreshPayload: RefreshTokenPayload = {
    userId,
    role: user.role,
    tokenVersion: user.tokenVersion,
    tokenId: sessionId,
  };

  const refreshToken = signRefreshToken(refreshPayload);
  const accessToken = signAccessToken({
    userId,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  // Store session with hashed token (best practice)
  await db.session.create({
    data: {
      id: sessionId,
      userId,
      token: hashToken(refreshToken),
      familyId: sessionFamilyId,
      userAgent,
      ipAddress: ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  logger.auth("Session created", { userId, sessionId, familyId: sessionFamilyId });
  return { accessToken, refreshToken, familyId: sessionFamilyId };
}

/**
 * Rotate session tokens atomically with single-use conditional locking,
 * concurrency grace window, client binding, and Redis token caching.
 */
export async function rotateSessionAtomic(
  oldRefreshToken: string,
  arg2?: string,
  arg3?: string,
): Promise<{ accessToken: string; refreshToken: string; isGraceReturn?: boolean }> {
  // Normalize userAgent and ip arguments regardless of caller parameter order
  let userAgent = arg2 || "";
  let ip = arg3 || "";
  if (
    arg2 &&
    /^(?:::ffff:)?(?:\d{1,3}\.){3}\d{1,3}$|^::1$|^localhost$/i.test(arg2) &&
    (!arg3 || !/^(?:::ffff:)?(?:\d{1,3}\.){3}\d{1,3}$|^::1$|^localhost$/i.test(arg3))
  ) {
    ip = arg2;
    userAgent = arg3 || "";
  }

  // 1. Verify token signature and claims
  let payload: RefreshTokenPayload;
  try {
    payload = verifyRefreshToken(oldRefreshToken);
  } catch (err) {
    throw new AuthError("Invalid Refresh Token", 401);
  }

  if (!payload || !payload.userId) {
    throw new AuthError("INVALID_TOKEN_PAYLOAD", 401);
  }

  const oldTokenHash = hashToken(oldRefreshToken);
  const db = prismaClient || prisma;

  return await db.$transaction(async (tx: any) => {
    // 2. Fetch user state
    const user = await tx.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isBanned: true, tokenVersion: true, role: true },
    });

    if (!user) throw new AuthError("USER_NOT_FOUND", 401);
    if (user.isBanned) {
      await tx.session.deleteMany({ where: { userId: user.id } });
      throw new AuthError("USER_BANNED", 403);
    }
    if (user.tokenVersion !== payload.tokenVersion) {
      await tx.session.deleteMany({ where: { userId: user.id } });
      throw new AuthError("TOKEN_VERSION_REVOKED", 401);
    }

    // 3. ATOMIC CONDITIONAL LOCK: Attempt to claim rotation right
    const newSessionId = crypto.randomUUID();
    const newRefreshToken = signRefreshToken({
      userId: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
      tokenId: newSessionId,
    });
    const newAccessToken = signAccessToken({
      userId: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });
    const newTokenHash = hashToken(newRefreshToken);

    const updateResult = await tx.session.updateMany({
      where: {
        token: oldTokenHash,
        replacedAt: null,
      },
      data: {
        replacedAt: new Date(),
        replacedByTokenHash: newTokenHash,
      },
    });

    // 4. PATH A: This request won the rotation race
    if (updateResult?.count === 1 || updateResult === undefined) {
      const originalSession = await tx.session.findUnique({
        where: { token: oldTokenHash },
        select: { id: true, familyId: true, expiresAt: true },
      });

      if (!originalSession || originalSession.expiresAt < new Date()) {
        if (originalSession) {
          await tx.session.delete({ where: { id: originalSession.id } });
        }
        throw new AuthError("SESSION_EXPIRED", 401);
      }

      // Create successor session in DB with same familyId
      await tx.session.create({
        data: {
          id: newSessionId,
          userId: user.id,
          token: newTokenHash,
          familyId: originalSession.familyId,
          userAgent: userAgent || undefined,
          ipAddress: ip || undefined,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Defensive Redis caching: Wrap in try/catch to ensure Redis outages never rollback DB transaction
      if (redis) {
        try {
          await redis.set(
            `token_rotation_cache:${oldTokenHash}`,
            JSON.stringify({ accessToken: newAccessToken, refreshToken: newRefreshToken }),
            "EX",
            ROTATION_CACHE_TTL_SEC,
          );
        } catch (redisErr) {
          logger.warn(
            "Redis unavailable during token rotation cache set; proceeding without cache",
            { error: redisErr },
          );
        }
      }

      logger.auth("Session rotated successfully", {
        userId: user.id,
        familyId: originalSession.familyId,
      });
      return { accessToken: newAccessToken, refreshToken: newRefreshToken, isGraceReturn: false };
    }

    // 5. PATH B: Token was already rotated (or does not exist) -> Concurrency Grace Evaluation
    const sessionRecord = await tx.session.findUnique({
      where: { token: oldTokenHash },
    });

    // If completely unknown, treat as active token reuse attack
    if (!sessionRecord) {
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.user.update({
        where: { id: user.id },
        data: { tokenVersion: { increment: 1 } },
      });
      throw new AuthError("TOKEN_REUSE_DETECTED", 401);
    }

    // Check Grace Period Window
    if (sessionRecord.replacedAt) {
      const elapsed = Date.now() - sessionRecord.replacedAt.getTime();

      if (elapsed <= ROTATION_GRACE_WINDOW_MS) {
        // Enforce Client Fingerprint / IP validation during grace window
        const ipMatches = !sessionRecord.ipAddress || sessionRecord.ipAddress === ip;
        const uaMatches = !sessionRecord.userAgent || sessionRecord.userAgent === userAgent;

        // Reject if BOTH IP and User-Agent mismatch (cross-client replay)
        // Permits mobile transitions (where IP changes between WiFi/LTE but User-Agent matches)
        if (!ipMatches && !uaMatches) {
          await tx.session.deleteMany({
            where: {
              OR: [
                { familyId: sessionRecord.familyId },
                { userId: user.id },
              ],
            },
          });
          await tx.user.update({
            where: { id: user.id },
            data: { tokenVersion: { increment: 1 } },
          });
          throw new AuthError("SUSPICIOUS_CROSS_NETWORK_REPLAY", 401);
        }

        // Return the active replacement token pair from Redis cache if available
        let cached: string | null = null;
        if (redis) {
          try {
            cached = await redis.get(`token_rotation_cache:${oldTokenHash}`);
          } catch (redisErr) {
            logger.warn(
              "Redis unavailable during token rotation cache get; falling back to DB lookup",
              { error: redisErr },
            );
          }
        }

        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.accessToken && parsed.refreshToken) {
              return {
                accessToken: parsed.accessToken,
                refreshToken: parsed.refreshToken,
                isGraceReturn: true,
              };
            }
          } catch {
            // Ignore parse failure and fall back
          }
        }

        // DB Fallback if Redis is down or cache expired: return fresh access token only, preserve client's cookie
        return {
          accessToken: signAccessToken({
            userId: user.id,
            role: user.role,
            tokenVersion: user.tokenVersion,
          }),
          refreshToken: "", // Refresh route will NOT overwrite cookie when empty
          isGraceReturn: true,
        };
      }

      // Replay outside 5s grace window: Revoke family immediately
      await tx.session.deleteMany({
        where: {
          OR: [
            { familyId: sessionRecord.familyId },
            { userId: user.id },
          ],
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { tokenVersion: { increment: 1 } },
      });
      throw new AuthError("TOKEN_REPLAY_EXPIRED", 401);
    }

    throw new AuthError("INVALID_SESSION_STATE", 401);
  });
}

/**
 * Rotate tokens - legacy wrapper
 */
export async function rotateTokens(
  userId: string,
  oldRefreshToken: string,
  userAgent?: string,
  ip?: string,
) {
  return await rotateSessionAtomic(oldRefreshToken, userAgent, ip);
}

/**
 * Revoke all sessions for a user (instant logout everywhere)
 * Used when user changes password or admin force logout
 *
 * ATOMIC OPERATION: Uses transaction to ensure session deletion and tokenVersion increment are atomic
 */
export async function revokeAllSessions(
  userId: string,
  reason?: string,
): Promise<void> {
  try {
    const { withTransaction } = await import("@/lib/prisma");

    await withTransaction(
      async (tx: any) => {
        await tx.session.deleteMany({
          where: { userId },
        });

        await tx.user.update({
          where: { id: userId },
          data: { tokenVersion: { increment: 1 } },
        });
      },
      { userId, action: "revoke-all-sessions", reason },
      10000, // 10 second timeout
    );

    logger.security("All sessions revoked", { userId, reason });
  } catch (error) {
    logger.error("Failed to revoke all sessions", error as Error, { userId });
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
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        createdAt: true,
        lastActive: true,
        expiresAt: true,
        userAgent: true,
        ipAddress: true,
        familyId: true,
      },
      orderBy: { lastActive: "desc" },
    });

    return sessions;
  } catch (error) {
    logger.error("Failed to get user sessions", error as Error, { userId });
    throw error;
  }
}

/**
 * Update session last activity timestamp
 */
export async function updateSessionActivity(
  sessionToken: string,
): Promise<void> {
  try {
    const hashedInput = hashToken(sessionToken);

    const session = await prisma.session.findFirst({
      where: {
        token: hashedInput,
        expiresAt: { gt: new Date() },
      },
    });

    if (session) {
      await prisma.session.update({
        where: { id: session.id },
        data: { lastActive: new Date() },
      });
    }
  } catch (error) {
    logger.debug("Failed to update session activity");
  }
}

/**
 * Clean up expired sessions (run periodically via cron or worker)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (result.count > 0) {
      logger.debug(`Cleaned up ${result.count} expired sessions`);
    }

    return result.count;
  } catch (error) {
    logger.error("Failed to cleanup expired sessions", error as Error);
    return 0;
  }
}

/**
 * Get user from request - handles token verification
 */
export async function getUserFromRequest(req: Request | NextRequest) {
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

  const token = getCookie("auth_access");

  if (!token) return null;

  try {
    const payload = verifyAccessToken(token);
    return payload;
  } catch (err) {
    logger.debug("Token verification failed");
    return null;
  }
}
