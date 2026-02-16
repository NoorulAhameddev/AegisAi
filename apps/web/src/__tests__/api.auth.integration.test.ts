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
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/services/auth/auth", () => ({
  verifyAuth: jest.fn(),
  createSession: jest.fn(),
  rotateTokens: jest.fn(),
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("@/lib/response", () => ({
  successResponse: (data: any, options?: any) => ({
    status: options?.status || 200,
    json: async () => ({ success: true, data, timestamp: new Date().toISOString() }),
  }),
  errorResponse: (error: string, options?: any) => ({
    status: options?.status || 400,
    json: async () => ({ success: false, error, timestamp: new Date().toISOString() }),
  }),
  unauthorizedResponse: () => ({
    status: 401,
    json: async () => ({ success: false, error: "Unauthorized", timestamp: new Date().toISOString() }),
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
      prisma.user.findUnique.mockResolvedValue(null); // No existing user
      bcrypt.hash.mockResolvedValue("hashed-password");
      prisma.user.create.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
      });
      createSession.mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      const req = makeRequest({
        email: "test@example.com",
        password: "SecurePassword123!",
        name: "Test User",
      });

      const res = await Register(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.user.email).toBe("test@example.com");
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
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain("already exists");
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
    const bcrypt = require("bcrypt");
    const { createSession } = require("@/services/auth/auth");
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
      bcrypt.compare.mockResolvedValue(true);
      createSession.mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      const req = makeRequest({
        email: "test@example.com",
        password: "SecurePassword123!",
      });

      const res = await Login(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.accessToken).toBeDefined();
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
      bcrypt.compare.mockResolvedValue(false);

      const req = makeRequest({
        email: "test@example.com",
        password: "WrongPassword",
      });

      const res = await Login(req);
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/refresh", () => {
    const { rotateTokens } = require("@/services/auth/auth");
    const { POST: Refresh } = require("@/app/api/auth/refresh/route");

    function makeRequest(refreshToken?: string): Request {
      const headers = new Headers({
        "content-type": "application/json",
        "x-request-id": "test-request-id",
      });
      
      if (refreshToken) {
        headers.set("cookie", `refreshToken=${refreshToken}`);
      }

      return {
        method: "POST",
        headers,
        cookies: {
          get: (name: string) => (name === "refreshToken" ? { value: refreshToken } : null),
        },
      } as unknown as Request;
    }

    it("successfully refreshes tokens", async () => {
      rotateTokens.mockResolvedValue({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      });

      const req = makeRequest("valid-refresh-token");
      const res = await Refresh(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.accessToken).toBe("new-access-token");
    });

    it("returns 401 when refresh token missing", async () => {
      const req = makeRequest();
      const res = await Refresh(req);

      expect(res.status).toBe(401);
    });

    it("returns 401 when refresh token is invalid", async () => {
      rotateTokens.mockResolvedValue(null);

      const req = makeRequest("invalid-token");
      const res = await Refresh(req);

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/logout", () => {
    const { prisma } = require("@/lib/prisma");
    const { verifyAuth } = require("@/services/auth/auth");
    const { POST: Logout } = require("@/app/api/auth/logout/route");

    function makeRequest(userId?: string): Request {
      return {
        method: "POST",
        headers: new Headers({
          "content-type": "application/json",
          "x-request-id": "test-request-id",
          ...(userId ? { "x-user-id": userId } : {}),
        }),
      } as unknown as Request;
    }

    it("successfully logs out user", async () => {
      verifyAuth.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      });
      prisma.session.updateMany.mockResolvedValue({ count: 1 });

      const req = makeRequest("user-1");
      const res = await Logout(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("returns 401 when not authenticated", async () => {
      verifyAuth.mockResolvedValue(null);

      const req = makeRequest();
      const res = await Logout(req);

      expect(res.status).toBe(401);
    });
  });
});
