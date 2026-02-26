jest.mock("@/services/auth/auth", () => ({
  verifyAuth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    chat: {
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    message: {
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

// Mock standardized response helpers to avoid Next.js Request/Response deps
jest.mock("@/lib/response", () => ({
  successResponse: (data: any, options?: any) => ({
    status: options?.status || 200,
    json: async () => ({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  }),
  errorResponse: (error: string, options?: any) => ({
    status: options?.status || 400,
    json: async () => ({
      success: false,
      error,
      timestamp: new Date().toISOString(),
    }),
  }),
  unauthorizedResponse: () => ({
    status: 401,
    json: async () => ({
      success: false,
      error: "Unauthorized",
      timestamp: new Date().toISOString(),
    }),
  }),
  notFoundResponse: () => ({
    status: 404,
    json: async () => ({
      success: false,
      error: "Not Found",
      timestamp: new Date().toISOString(),
    }),
  }),
  badRequestResponse: (error: string) => ({
    status: 400,
    json: async () => ({
      success: false,
      error,
      timestamp: new Date().toISOString(),
    }),
  }),
}));

describe("DELETE /api/chat/delete", () => {
  const { verifyAuth } = require("@/services/auth/auth");
  const { prisma } = require("@/lib/prisma");
  const { POST: DeleteChat } = require("@/app/api/chat/delete/route");

  // Use valid UUIDs for testing
  const testChatId = "00000000-0000-0000-0000-000000000001";
  const testUserId = "00000000-0000-0000-0000-000000000002";

  function makeRequest(body: any, userId?: string) {
    return {
      method: "POST",
      json: async () => body,
      headers: new Headers({
        "content-type": "application/json",
        "x-request-id": "test-request-id",
        ...(userId ? { "x-user-id": userId } : {}),
      }),
      cookies: {
        get: () => null,
      },
    } as unknown as Request;
  }

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns 401 when unauthorized", async () => {
    verifyAuth.mockResolvedValue(null);
    const req = makeRequest({ chatId: testChatId });
    const res = await DeleteChat(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when chatId missing", async () => {
    verifyAuth.mockResolvedValue({ id: testUserId });
    const req = makeRequest({}, testUserId);
    const res = await DeleteChat(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when chat not found", async () => {
    verifyAuth.mockResolvedValue({ id: testUserId });
    prisma.chat.findFirst.mockResolvedValue(null);
    const req = makeRequest({ chatId: testChatId }, testUserId);
    const res = await DeleteChat(req);
    expect(res.status).toBe(404);
  });

  it("deletes chat and returns success", async () => {
    verifyAuth.mockResolvedValue({ id: testUserId });
    prisma.chat.findFirst.mockResolvedValue({
      id: testChatId,
      userId: testUserId,
    });
    prisma.message.deleteMany.mockResolvedValue({ count: 5 });
    prisma.chat.delete.mockResolvedValue({
      id: testChatId,
      userId: testUserId,
    });
    prisma.auditLog.create.mockResolvedValue({ id: "audit-1" });

    const req = makeRequest({ chatId: testChatId }, testUserId);
    const res = await DeleteChat(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(prisma.message.deleteMany).toHaveBeenCalledWith({
      where: { chatId: testChatId },
    });
    expect(prisma.chat.delete).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
});
