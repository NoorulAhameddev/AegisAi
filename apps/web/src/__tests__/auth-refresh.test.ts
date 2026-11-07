/**
 * Automated Regression Tests for Refresh-Token Rotation & Session Concurrency
 * Covers Acceptance Criteria AC-06 through AC-10 per DISPATCH.md and
 * SPECIFICATION_FINAL_APPROVAL_READY.md Section 5 & Section 9.
 */

import crypto from "crypto";

// Polyfill Response.json if missing in jest-dom environment
if (
  typeof (globalThis as any).Response !== "undefined" &&
  typeof (globalThis as any).Response.json !== "function"
) {
  (globalThis as any).Response.json = (data: any, init?: any) => {
    const headers = new Headers(init?.headers || {});
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    const res = new Response(JSON.stringify(data), {
      ...init,
      headers,
    });
    return res;
  };
}

// Prefix all hoisted mock objects with 'mock' for Babel/Jest hoist compatibility
const mockDbUsers = new Map<string, any>();
const mockDbSessions = new Map<string, any>();
const mockRedisStore = new Map<string, { value: string; expiresAt: number }>();

const mockPrisma = {
  user: {
    findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
      const u = mockDbUsers.get(where.id);
      return u ? { ...u } : null;
    }),
    update: jest.fn(
      async ({
        where,
        data,
      }: {
        where: { id: string };
        data: {
          isBanned?: boolean;
          tokenVersion?: { increment: number } | number;
        };
      }) => {
        const u = mockDbUsers.get(where.id);
        if (!u) throw new Error("User not found");
        if (typeof data.isBanned === "boolean") u.isBanned = data.isBanned;
        if (data.tokenVersion) {
          if (typeof data.tokenVersion === "object" && "increment" in data.tokenVersion) {
            u.tokenVersion += data.tokenVersion.increment;
          } else if (typeof data.tokenVersion === "number") {
            u.tokenVersion = data.tokenVersion;
          }
        }
        return { ...u };
      },
    ),
  },
  session: {
    create: jest.fn(async ({ data }: { data: any }) => {
      const record = {
        id: data.id || crypto.randomUUID(),
        userId: data.userId,
        token: data.token,
        familyId: data.familyId || crypto.randomUUID(),
        replacedAt: data.replacedAt || null,
        replacedByTokenHash: data.replacedByTokenHash || null,
        expiresAt: data.expiresAt,
        createdAt: new Date(),
        lastActive: new Date(),
        userAgent: data.userAgent || null,
        ipAddress: data.ipAddress || null,
      };
      mockDbSessions.set(record.id, record);
      return { ...record };
    }),
    findUnique: jest.fn(async ({ where }: { where: { id?: string; token?: string } }) => {
      if (where.id) {
        const s = mockDbSessions.get(where.id);
        return s ? { ...s } : null;
      }
      if (where.token) {
        for (const s of mockDbSessions.values()) {
          if (s.token === where.token) return { ...s };
        }
      }
      return null;
    }),
    findFirst: jest.fn(async ({ where }: { where: any }) => {
      for (const s of mockDbSessions.values()) {
        let match = true;
        if (where.userId && s.userId !== where.userId) match = false;
        if (where.token && s.token !== where.token) match = false;
        if (where.familyId && s.familyId !== where.familyId) match = false;
        if (match) return { ...s };
      }
      return null;
    }),
    findMany: jest.fn(async ({ where }: { where: any }) => {
      const results: any[] = [];
      for (const s of mockDbSessions.values()) {
        let match = true;
        if (where.userId && s.userId !== where.userId) match = false;
        if (where.familyId && s.familyId !== where.familyId) match = false;
        if (match) results.push({ ...s });
      }
      return results;
    }),
    updateMany: jest.fn(
      async ({ where, data }: { where: { token: string; replacedAt?: null; id?: string }; data: any }) => {
        let count = 0;
        for (const [id, s] of mockDbSessions.entries()) {
          const tokenMatches = s.token === where.token;
          const idMatches = !where.id || s.id === where.id;
          const replacedAtMatches = where.replacedAt === undefined || s.replacedAt === where.replacedAt;

          if (tokenMatches && idMatches && replacedAtMatches) {
            mockDbSessions.set(id, {
              ...s,
              replacedAt: data.replacedAt || new Date(),
              replacedByTokenHash: data.replacedByTokenHash || null,
            });
            count++;
          }
        }
        return { count };
      },
    ),
    delete: jest.fn(async ({ where }: { where: { id: string } }) => {
      const s = mockDbSessions.get(where.id);
      mockDbSessions.delete(where.id);
      return s || null;
    }),
    deleteMany: jest.fn(async ({ where }: { where: any }) => {
      let count = 0;
      const idsToDelete: string[] = [];

      for (const [id, s] of mockDbSessions.entries()) {
        let shouldDelete = false;
        if (where.userId && s.userId === where.userId) shouldDelete = true;
        if (where.familyId && s.familyId === where.familyId) shouldDelete = true;
        if (where.token && s.token === where.token) shouldDelete = true;
        if (Array.isArray(where.OR)) {
          for (const cond of where.OR) {
            if (cond.familyId && s.familyId === cond.familyId) shouldDelete = true;
            if (cond.userId && s.userId === cond.userId) shouldDelete = true;
          }
        }
        if (shouldDelete) idsToDelete.push(id);
      }

      for (const id of idsToDelete) {
        mockDbSessions.delete(id);
        count++;
      }
      return { count };
    }),
  },
  auditLog: {
    create: jest.fn(async ({ data }: { data: any }) => ({
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date(),
    })),
  },
  $transaction: jest.fn(async (cb: any) => {
    if (typeof cb === "function") {
      return await cb(mockPrisma);
    }
    return Promise.all(cb);
  }),
};

// Mock Prisma at module level
jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
  withTransaction: jest.fn(async (cb: any) => cb(mockPrisma)),
}));

// Mock rate limiting
jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn().mockResolvedValue({ success: true } as never),
}));

// Mock audit log creation
jest.mock("@/lib/audit", () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined as never),
}));

// Mock token version cache to avoid external Redis
jest.mock("@/lib/token-version-cache", () => ({
  getCachedTokenVersion: jest.fn().mockResolvedValue(null),
  cacheTokenVersion: jest.fn().mockResolvedValue(undefined as never),
  invalidateTokenVersion: jest.fn().mockImplementation(async (userId: string) => {
    mockRedisStore.delete(`token_version:${userId}`);
  }),
}));

// In-Memory Mock Redis Client
const mockRedis = {
  get: jest.fn(async (key: string) => {
    const entry = mockRedisStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      mockRedisStore.delete(key);
      return null;
    }
    return entry.value;
  }),
  set: jest.fn(async (key: string, value: string, _mode?: string, ttlSec: number = 10) => {
    mockRedisStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSec * 1000,
    });
    return "OK";
  }),
  del: jest.fn(async (key: string) => {
    mockRedisStore.delete(key);
    return 1;
  }),
};

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  rotateSessionAtomic,
  hashToken,
  AuthError,
  setRedisClientForTesting,
  setPrismaClientForTesting,
} from "@/services/auth/session";
import {
  signRefreshToken,
  signAccessToken,
  verifyRefreshToken,
  setPrismaClientForAuthTesting,
} from "@/services/auth/auth";
import { POST as refreshRoute } from "@/app/api/auth/refresh/route";
import {
  POST as banRoute,
  setPrismaClientForTesting as setBanPrisma,
} from "@/app/api/admin/users/[id]/ban/route";
import { NextRequest } from "next/server";

describe("Milestone M5: Refresh-Token Rotation & Session Concurrency (R4)", () => {
  const testUser = {
    id: "user-test-uuid",
    email: "user@aegis.ai",
    role: "USER",
    isBanned: false,
    tokenVersion: 1,
  };

  const clientUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AegisBrowser/1.0";
  const clientIP = "192.0.2.1";

  beforeEach(() => {
    mockDbUsers.clear();
    mockDbSessions.clear();
    mockRedisStore.clear();

    mockDbUsers.set(testUser.id, { ...testUser });
    setRedisClientForTesting(mockRedis);
    setPrismaClientForTesting(mockPrisma);
    setPrismaClientForAuthTesting(mockPrisma);
    setBanPrisma(mockPrisma);
    jest.clearAllMocks();
  });

  function createActiveSessionInDb(
    userId: string = testUser.id,
    familyId: string = crypto.randomUUID(),
    expiresAt: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    userAgent: string = clientUA,
    ipAddress: string = clientIP,
  ) {
    const sessionId = crypto.randomUUID();
    const token = signRefreshToken({
      userId,
      role: testUser.role,
      tokenVersion: testUser.tokenVersion,
      tokenId: sessionId,
    });
    const sessionRecord = {
      id: sessionId,
      userId,
      token: hashToken(token),
      familyId,
      replacedAt: null,
      replacedByTokenHash: null,
      expiresAt,
      createdAt: new Date(),
      lastActive: new Date(),
      userAgent,
      ipAddress,
    };
    mockDbSessions.set(sessionId, sessionRecord);
    return { token, sessionRecord };
  }

  // =========================================================================
  // AC-06: Atomic rotation single-use test
  // =========================================================================
  describe("AC-06: Atomic Single-Use Token Rotation", () => {
    it("should successfully rotate valid session atomically and create successor session with matching familyId", async () => {
      const { token: oldToken, sessionRecord: initialSession } = createActiveSessionInDb();

      const result = await rotateSessionAtomic(oldToken, clientUA, clientIP);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.isGraceReturn).toBe(false);

      // Verify the new tokens decode properly
      const accessClaims = verifyRefreshToken(result.refreshToken);
      expect(accessClaims.userId).toBe(testUser.id);
      expect(accessClaims.tokenVersion).toBe(testUser.tokenVersion);

      // DB Verification: Old session marked as replaced
      const updatedOld = mockDbSessions.get(initialSession.id);
      expect(updatedOld).toBeDefined();
      expect(updatedOld!.replacedAt).toBeInstanceOf(Date);
      expect(updatedOld!.replacedByTokenHash).toBe(hashToken(result.refreshToken));

      // DB Verification: Exactly 2 sessions exist (original replaced + successor active)
      expect(mockDbSessions.size).toBe(2);
      const newSession = Array.from(mockDbSessions.values()).find((s: any) => s.id !== initialSession.id);
      expect(newSession).toBeDefined();
      expect(newSession!.familyId).toBe(initialSession.familyId); // Family lineage preserved
      expect(newSession!.token).toBe(hashToken(result.refreshToken));
      expect(newSession!.replacedAt).toBeNull();

      // Redis Verification: Replacement cached
      const cached = await mockRedis.get(`token_rotation_cache:${hashToken(oldToken)}`);
      expect(cached).toBeDefined();
      const parsed = JSON.parse(cached!);
      expect(parsed.accessToken).toBe(result.accessToken);
      expect(parsed.refreshToken).toBe(result.refreshToken);
    });

    it("should reject token when session is not found in database (unknown token / active reuse)", async () => {
      const fakeToken = signRefreshToken({
        userId: testUser.id,
        role: testUser.role,
        tokenVersion: testUser.tokenVersion,
        tokenId: "unknown-session",
      });

      await expect(rotateSessionAtomic(fakeToken, clientUA, clientIP)).rejects.toThrow(
        "TOKEN_REUSE_DETECTED",
      );

      // User tokenVersion incremented and all sessions purged
      const user = mockDbUsers.get(testUser.id);
      expect(user!.tokenVersion).toBe(testUser.tokenVersion + 1);
      expect(mockDbSessions.size).toBe(0);
    });

    it("should throw AuthError on tampered or invalid JWT signature", async () => {
      const invalidToken = "not.a.valid.jwt";
      await expect(rotateSessionAtomic(invalidToken, clientUA, clientIP)).rejects.toThrow(
        AuthError,
      );
    });
  });

  // =========================================================================
  // AC-07 & AC-08: Concurrency & Grace Window
  // =========================================================================
  describe("AC-07 & AC-08: Concurrency Grace Window & Tab Reloads", () => {
    it("handles 5 concurrent refresh requests using the same token without session duplication", async () => {
      const { token: oldToken, sessionRecord: initialSession } = createActiveSessionInDb();

      // Dispatch 5 parallel refresh requests with identical token
      const promises = [
        rotateSessionAtomic(oldToken, clientUA, clientIP),
        rotateSessionAtomic(oldToken, clientUA, clientIP),
        rotateSessionAtomic(oldToken, clientUA, clientIP),
        rotateSessionAtomic(oldToken, clientUA, clientIP),
        rotateSessionAtomic(oldToken, clientUA, clientIP),
      ];

      const results = await Promise.all(promises);

      // Verify all 5 received valid access tokens
      expect(results).toHaveLength(5);
      results.forEach((r) => {
        expect(r.accessToken).toBeDefined();
      });

      // Exactly 1 request won the atomic rotation race
      const primaryRotations = results.filter((r) => !r.isGraceReturn);
      const graceReturns = results.filter((r) => r.isGraceReturn);

      expect(primaryRotations).toHaveLength(1);
      expect(graceReturns).toHaveLength(4);

      // Zero sessions were deleted due to false positive reuse detection
      expect(mockDbSessions.size).toBe(2); // 1 replaced session + 1 new session

      // Active session matches the replacement token
      const activeSession = Array.from(mockDbSessions.values()).find((s: any) => s.id !== initialSession.id);
      expect(activeSession).toBeDefined();
      expect(activeSession!.familyId).toBe(initialSession.familyId);
      expect(activeSession!.token).toBe(hashToken(primaryRotations[0].refreshToken));
    });

    it("should permit tab reload within 5-second grace window returning active replacement pair", async () => {
      const { token: oldToken } = createActiveSessionInDb();

      // First call rotates token
      const rotation1 = await rotateSessionAtomic(oldToken, clientUA, clientIP);
      expect(rotation1.isGraceReturn).toBe(false);

      // Second tab reload 1 second later with same old token
      const reload = await rotateSessionAtomic(oldToken, clientUA, clientIP);

      expect(reload.isGraceReturn).toBe(true);
      expect(reload.accessToken).toBe(rotation1.accessToken);
      expect(reload.refreshToken).toBe(rotation1.refreshToken);
    });

    it("should gracefully degrade when Redis is down during grace window without rolling back DB transaction", async () => {
      const { token: oldToken } = createActiveSessionInDb();

      // First rotation succeeds
      await rotateSessionAtomic(oldToken, clientUA, clientIP);

      // Simulate Redis downtime during second request
      mockRedis.get.mockRejectedValueOnce(new Error("ECONNREFUSED - Redis Down"));

      // Grace window request proceeds via DB fallback
      const fallbackResult = await rotateSessionAtomic(oldToken, clientUA, clientIP);

      expect(fallbackResult.isGraceReturn).toBe(true);
      expect(fallbackResult.accessToken).toBeDefined();
      // refreshToken is empty string to prevent overwriting client's valid cookie
      expect(fallbackResult.refreshToken).toBe("");
    });
  });

  // =========================================================================
  // AC-09: Replay Attack Outside Grace Window Revoking Family
  // =========================================================================
  describe("AC-09: Replay Attack Outside Grace Window", () => {
    it("revokes family on expired replay (token replayed 6s after rotation)", async () => {
      const familyId = crypto.randomUUID();
      const { token: oldToken, sessionRecord: initialSession } = createActiveSessionInDb(
        testUser.id,
        familyId,
      );

      // Rotate session
      await rotateSessionAtomic(oldToken, clientUA, clientIP);

      // Advance replacedAt timestamp by 6 seconds (beyond 5000ms grace window)
      const replacedSession = mockDbSessions.get(initialSession.id);
      expect(replacedSession).toBeDefined();
      replacedSession!.replacedAt = new Date(Date.now() - 6000);

      // Adversary replays expired token
      await expect(rotateSessionAtomic(oldToken, clientUA, clientIP)).rejects.toThrow(
        "TOKEN_REPLAY_EXPIRED",
      );

      // Verify all sessions in family / user are deleted
      expect(mockDbSessions.size).toBe(0);

      // User tokenVersion is incremented to invalidate any active access tokens
      const user = mockDbUsers.get(testUser.id);
      expect(user!.tokenVersion).toBe(testUser.tokenVersion + 1);
    });
  });

  // =========================================================================
  // AC-10: Client Binding, Revocation & Banned Users
  // =========================================================================
  describe("AC-10: Client Binding, Revocation, and Banned User Protection", () => {
    it("detects cross-client replay (foreign IP and User-Agent) during grace window", async () => {
      const { token: oldToken } = createActiveSessionInDb();

      // Legitimate client rotates token
      await rotateSessionAtomic(oldToken, clientUA, clientIP);

      // Adversary replays token from foreign network with foreign User-Agent within 1 second
      const adversaryUA = "curl/8.4.0 MaliciousBot/2.0";
      const adversaryIP = "203.0.113.99";

      await expect(rotateSessionAtomic(oldToken, adversaryUA, adversaryIP)).rejects.toThrow(
        "SUSPICIOUS_CROSS_NETWORK_REPLAY",
      );

      // Entire session family wiped out
      expect(mockDbSessions.size).toBe(0);

      // Global tokenVersion incremented
      const user = mockDbUsers.get(testUser.id);
      expect(user!.tokenVersion).toBe(testUser.tokenVersion + 1);
    });

    it("permits mobile transition during grace window (IP changes from WiFi to LTE but User-Agent matches)", async () => {
      const wifiIP = "192.168.1.100";
      const mobileUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) MobileAegis/1.0";
      const { token: oldToken } = createActiveSessionInDb(
        testUser.id,
        crypto.randomUUID(),
        undefined,
        mobileUA,
        wifiIP,
      );

      // Rotation happens on WiFi IP
      const res1 = await rotateSessionAtomic(oldToken, mobileUA, wifiIP);
      expect(res1.isGraceReturn).toBe(false);

      // Second tab / background poll switches to LTE cellular IP with same User-Agent
      const lteIP = "172.56.21.89";
      const res2 = await rotateSessionAtomic(oldToken, mobileUA, lteIP);

      expect(res2.isGraceReturn).toBe(true);
      expect(res2.accessToken).toBe(res1.accessToken);
    });

    it("rejects refresh request when user is banned and purges active sessions", async () => {
      const { token } = createActiveSessionInDb();

      // Ban user in DB
      const user = mockDbUsers.get(testUser.id);
      user!.isBanned = true;

      await expect(rotateSessionAtomic(token, clientUA, clientIP)).rejects.toThrow(
        "USER_BANNED",
      );

      // Active sessions purged
      expect(mockDbSessions.size).toBe(0);
    });

    it("rejects refresh request when tokenVersion is stale (global logout/revocation)", async () => {
      const { token } = createActiveSessionInDb();

      // Simulate global logout incrementing tokenVersion in user record
      const user = mockDbUsers.get(testUser.id);
      user!.tokenVersion = 99;

      await expect(rotateSessionAtomic(token, clientUA, clientIP)).rejects.toThrow(
        "TOKEN_VERSION_REVOKED",
      );

      // Active sessions purged
      expect(mockDbSessions.size).toBe(0);
    });

    it("rejects refresh request when session has expired in DB", async () => {
      const expiredDate = new Date(Date.now() - 1000); // Expired 1 second ago
      const { token } = createActiveSessionInDb(testUser.id, crypto.randomUUID(), expiredDate);

      await expect(rotateSessionAtomic(token, clientUA, clientIP)).rejects.toThrow(
        "SESSION_EXPIRED",
      );
    });
  });

  // =========================================================================
  // Full Route Integration Tests
  // =========================================================================
  describe("API Route Integration: /api/auth/refresh and /api/admin/users/[id]/ban", () => {
    it("POST /api/auth/refresh sets secure HttpOnly cookies with strict SameSite", async () => {
      const { token } = createActiveSessionInDb();

      const req = new NextRequest("http://localhost:3000/api/auth/refresh", {
        method: "POST",
        headers: {
          cookie: `auth_refresh=${token}`,
          "user-agent": clientUA,
          "x-forwarded-for": clientIP,
        },
      });

      const res = await refreshRoute(req);
      expect(res.status).toBe(200);

      // Check cookies
      const cookies = res.cookies;
      const accessCookie = cookies.get("auth_access");
      const refreshCookie = cookies.get("auth_refresh");

      expect(accessCookie).toBeDefined();
      expect(accessCookie?.httpOnly).toBe(true);
      expect(accessCookie?.sameSite).toBe("strict");

      expect(refreshCookie).toBeDefined();
      expect(refreshCookie?.httpOnly).toBe(true);
      expect(refreshCookie?.sameSite).toBe("strict");
    });

    it("POST /api/auth/refresh returns 401 when refresh cookie is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/refresh", {
        method: "POST",
      });

      const res = await refreshRoute(req);
      expect(res.status).toBe(401);
    });

    it("POST /api/admin/users/[id]/ban increments tokenVersion, deletes DB sessions, and invalidates Redis cache", async () => {
      // Create admin user and target user
      const adminId = "admin-uuid-123";
      const targetId = "target-uuid-456";

      mockDbUsers.set(adminId, {
        id: adminId,
        email: "admin@aegis.ai",
        role: "SUPER_ADMIN",
        isBanned: false,
        tokenVersion: 1,
      });

      mockDbUsers.set(targetId, {
        id: targetId,
        email: "target@aegis.ai",
        role: "USER",
        isBanned: false,
        tokenVersion: 1,
      });

      // Target has 2 active sessions
      createActiveSessionInDb(targetId);
      createActiveSessionInDb(targetId);
      expect(Array.from(mockDbSessions.values()).filter((s: any) => s.userId === targetId)).toHaveLength(2);

      const adminAccessToken = signAccessToken({
        userId: adminId,
        role: "SUPER_ADMIN",
        tokenVersion: 1,
      });

      const req = new NextRequest(`http://localhost:3000/api/admin/users/${targetId}/ban`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `auth_access=${adminAccessToken}`,
        },
        body: JSON.stringify({
          ban: true,
          reason: "Violated terms of service",
        }),
      });

      const res = await banRoute(req, { params: Promise.resolve({ id: targetId }) });
      expect(res.status).toBe(200);

      // Verify target user state in DB
      const targetUser = mockDbUsers.get(targetId);
      expect(targetUser!.isBanned).toBe(true);
      expect(targetUser!.tokenVersion).toBe(2); // Incremented

      // Verify active sessions purged from DB
      const targetSessions = Array.from(mockDbSessions.values()).filter((s: any) => s.userId === targetId);
      expect(targetSessions).toHaveLength(0);

      // Verify Redis token version cache was invalidated
      expect(mockRedisStore.has(`token_version:${targetId}`)).toBe(false);
    });
  });
});
