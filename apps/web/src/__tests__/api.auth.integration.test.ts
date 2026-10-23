/**
 * Integration tests for Auth endpoints
 * Tests registration, login, token refresh, and logout flows
 */

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
    chat: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (cb: any) =>
      typeof cb === "function" ? cb(prisma) : Promise.all(cb),
    ),
  },
}));

jest.mock("@/services/auth/auth", () => ({
  verifyAuth: jest.fn(),
  createSession: jest.fn(),
  rotateTokens: jest.fn(),
  hashPassword: jest.fn().mockResolvedValue("hashed-pass"),
  comparePassword: jest.fn().mockResolvedValue(true),
  signAccessToken: jest.fn().mockReturnValue("mock-access-token"),
  signRefreshToken: jest.fn().mockReturnValue("mock-refresh-token"),
  verifyAccessToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const createMockResponse = (status: number, data: any) => ({
  status,
  cookies: {
    set: jest.fn(),
    delete: jest.fn(),
  },
  json: async () => data,
});

jest.mock("@/lib/response", () => ({
  successResponse: (data: any, options?: any) =>
    createMockResponse(options?.status || 200, {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  errorResponse: (error: string, options?: any) =>
    createMockResponse(options?.status || 400, {
      success: false,
      error,
      timestamp: new Date().toISOString(),
    }),
  unauthorizedResponse: () =>
    createMockResponse(401, {
      success: false,
      error: "Unauthorized",
      timestamp: new Date().toISOString(),
    }),
  badRequestResponse: (error: string) =>
    createMockResponse(400, {
      success: false,
      error,
      timestamp: new Date().toISOString(),
    }),
}));

describe("Auth Endpoints Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    const { prisma } = require("@/lib/prisma");
    const bcrypt = require("bcrypt");
    const { createSession } = require("@/services/auth/auth");
    const { POST: Register } = require("@/app/api/auth/register/route");

    function makeRequest(body: any): Request {
      return {
        method: "POST",
        json: async () => body,
        headers: new Headers({
          "content-type": "application/json",
          "x-request-id": "test-request-id",
        }),
      } as unknown as Request;
    }

    it("successfully registers a new user", async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: "user-1",
          email: "test@example.com",
          name: "Test User",
          tokenVersion: 1,
        });
      prisma.user.create.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        tokenVersion: 1,
      });
      prisma.session.create.mockResolvedValue({
        id: "session-1",
        userId: "user-1",
        token: "hashed-token",
        expiresAt: new Date(Date.now() + 3600000),
      });

      const req = makeRequest({
        email: "test@example.com",
        password: "SecurePassword123!",
        name: "Test User",
      });

      const res = await Register(req);
      expect([200, 201]).toContain(res.status);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(res.cookies.set).toHaveBeenCalledWith(
        "auth_access",
        expect.any(String),
        expect.any(Object),
      );
    });

    it("returns 400 when email already exists", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "existing-user",
        email: "test@example.com",
      });

      const req = makeRequest({
        email: "test@example.com",
        password: "SecurePassword123!",
        name: "Test User",
      });

      const res = await Register(req);
      expect([400, 409]).toContain(res.status);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain("exists");
    });

    it("returns 400 when password is too weak", async () => {
      const req = makeRequest({
        email: "test@example.com",
        password: "weak",
        name: "Test User",
      });

      const res = await Register(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("returns 400 when email is invalid", async () => {
      const req = makeRequest({
        email: "invalid-email",
        password: "SecurePassword123!",
        name: "Test User",
      });

      const res = await Register(req);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    const { prisma } = require("@/lib/prisma");
    const { comparePassword } = require("@/services/auth/auth");
    const { POST: Login } = require("@/app/api/auth/login/route");

    function makeRequest(body: any): Request {
      return {
        method: "POST",
        json: async () => body,
        headers: new Headers({
          "content-type": "application/json",
          "x-request-id": "test-request-id",
        }),
      } as unknown as Request;
    }

    it("successfully logs in with valid credentials", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        password: "hashed-password",
        name: "Test User",
        tokenVersion: 1,
      });
      comparePassword.mockResolvedValue(true);
      prisma.session.create.mockResolvedValue({
        id: "session-1",
        userId: "user-1",
        token: "hashed-token",
        expiresAt: new Date(Date.now() + 3600000),
      });

      const req = makeRequest({
        email: "test@example.com",
        password: "SecurePassword123!",
      });

      const res = await Login(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(res.cookies.set).toHaveBeenCalledWith(
        "auth_access",
        expect.any(String),
        expect.any(Object),
      );
    });

    it("returns 401 when user not found", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const req = makeRequest({
        email: "nonexistent@example.com",
        password: "SecurePassword123!",
      });

      const res = await Login(req);
      expect(res.status).toBe(401);
    });

    it("returns 401 when password is incorrect", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        password: "hashed-password",
      });
      comparePassword.mockResolvedValueOnce(false);

      const req = makeRequest({
        email: "test@example.com",
        password: "WrongPassword",
      });

      const res = await Login(req);
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/refresh", () => {
    const { prisma } = require("@/lib/prisma");
    const { verifyRefreshToken } = require("@/services/auth/auth");
    const { POST: Refresh } = require("@/app/api/auth/refresh/route");

    function makeRequest(refreshToken?: string): Request {
      return {
        method: "POST",
        headers: new Headers({
          "content-type": "application/json",
          "x-request-id": "test-request-id",
        }),
        cookies: {
          get: (name: string) =>
            name === "auth_refresh" && refreshToken
              ? { value: refreshToken }
              : undefined,
        },
      } as unknown as Request;
    }

    it("successfully refreshes tokens", async () => {
      verifyRefreshToken.mockReturnValue({
        userId: "user-1",
        tokenVersion: 1,
        tokenId: "session-1",
      });
      prisma.session.findUnique.mockResolvedValue({
        id: "session-1",
        userId: "user-1",
        token: "hashed-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      prisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        tokenVersion: 1,
      });
      prisma.session.create.mockResolvedValue({
        id: "session-2",
        userId: "user-1",
        token: "hashed-token-2",
        expiresAt: new Date(Date.now() + 3600000),
      });
      prisma.session.findFirst.mockResolvedValue({ id: "session-2" });

      const req = makeRequest("valid-refresh-token");
      const res = await Refresh(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(res.cookies.set).toHaveBeenCalledWith(
        "auth_access",
        expect.any(String),
        expect.any(Object),
      );
    });

    it("returns 401 when refresh token missing", async () => {
      const req = makeRequest();
      const res = await Refresh(req);

      expect(res.status).toBe(401);
    });

    it("returns 401 when refresh token is invalid", async () => {
      verifyRefreshToken.mockImplementationOnce(() => {
        throw new Error("Invalid token");
      });

      const req = makeRequest("invalid-token");
      const res = await Refresh(req);

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/logout", () => {
    const { prisma } = require("@/lib/prisma");
    const { verifyAccessToken } = require("@/services/auth/auth");
    const { POST: Logout } = require("@/app/api/auth/logout/route");

    function makeRequest(accessToken?: string): Request {
      return {
        method: "POST",
        headers: new Headers({
          "content-type": "application/json",
          "x-request-id": "test-request-id",
        }),
        cookies: {
          get: (name: string) =>
            name === "auth_access" && accessToken
              ? { value: accessToken }
              : undefined,
        },
      } as unknown as Request;
    }

    it("successfully logs out user", async () => {
      verifyAccessToken.mockReturnValue({
        userId: "user-1",
        tokenVersion: 1,
      });
      prisma.user.update.mockResolvedValue({ id: "user-1", tokenVersion: 2 });

      const req = makeRequest("valid-access-token");
      const res = await Logout(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("returns 200 when not authenticated", async () => {
      verifyAccessToken.mockImplementationOnce(() => {
        throw new Error("No token");
      });

      const req = makeRequest();
      const res = await Logout(req);

      expect(res.status).toBe(200);
    });
  });
});
