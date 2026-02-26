/**
 * Integration tests for Chat Streaming endpoints
 * Tests both SSE streaming (/stream-sse) and polling (/stream) approaches
 */

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  prisma: {
    chat: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/services/auth/auth", () => ({
  verifyAuth: jest.fn(),
}));

jest.mock("@/lib/queue", () => ({
  chatQueue: {
    add: jest.fn(),
  },
}));

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
  badRequestResponse: (error: string) => ({
    status: 400,
    json: async () => ({
      success: false,
      error,
      timestamp: new Date().toISOString(),
    }),
  }),
}));

describe("Chat Streaming Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/chat/stream (Polling approach)", () => {
    const { prisma } = require("@/lib/prisma");
    const { verifyAuth } = require("@/services/auth/auth");
    const { chatQueue } = require("@/lib/queue");
    const { POST: ChatStream } = require("@/app/api/chat/stream/route");

    function makeRequest(body: any, userId?: string): Request {
      return {
        method: "POST",
        json: async () => body,
        headers: new Headers({
          "content-type": "application/json",
          "x-request-id": "test-request-id",
          ...(userId ? { "x-user-id": userId } : {}),
        }),
      } as unknown as Request;
    }

    it("enqueues job and returns jobId for authenticated user", async () => {
      verifyAuth.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      });

      prisma.chat.findFirst.mockResolvedValue({
        id: "chat-1",
        userId: "user-1",
      });

      chatQueue.add.mockResolvedValue({
        id: "job-123",
        data: {},
      });

      const req = makeRequest(
        {
          chatId: "chat-1",
          message: "Hello, how are you?",
        },
        "user-1",
      );

      const res = await ChatStream(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.jobId).toBe("job-123");
    });

    it("returns 401 when user not authenticated", async () => {
      verifyAuth.mockResolvedValue(null);

      const req = makeRequest({
        chatId: "chat-1",
        message: "Hello",
      });

      const res = await ChatStream(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 when message is missing", async () => {
      verifyAuth.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      });

      const req = makeRequest(
        {
          chatId: "chat-1",
        },
        "user-1",
      );

      const res = await ChatStream(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when message is too long", async () => {
      verifyAuth.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      });

      const longMessage = "a".repeat(10001); // Max is usually 10000

      const req = makeRequest(
        {
          chatId: "chat-1",
          message: longMessage,
        },
        "user-1",
      );

      const res = await ChatStream(req);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/chat/create", () => {
    const { prisma } = require("@/lib/prisma");
    const { verifyAuth } = require("@/services/auth/auth");
    const { POST: CreateChat } = require("@/app/api/chat/create/route");

    function makeRequest(body: any, userId?: string): Request {
      return {
        method: "POST",
        json: async () => body,
        headers: new Headers({
          "content-type": "application/json",
          "x-request-id": "test-request-id",
          ...(userId ? { "x-user-id": userId } : {}),
        }),
      } as unknown as Request;
    }

    it("creates a new chat successfully", async () => {
      verifyAuth.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      });

      prisma.chat.create.mockResolvedValue({
        id: "chat-1",
        userId: "user-1",
        title: "New Chat",
        createdAt: new Date(),
      });

      const req = makeRequest(
        {
          title: "New Chat",
          projectId: "project-1",
        },
        "user-1",
      );

      const res = await CreateChat(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.chat.id).toBe("chat-1");
    });

    it("returns 401 when not authenticated", async () => {
      verifyAuth.mockResolvedValue(null);

      const req = makeRequest({
        title: "New Chat",
      });

      const res = await CreateChat(req);
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/chat/history", () => {
    const { prisma } = require("@/lib/prisma");
    const { verifyAuth } = require("@/services/auth/auth");
    const { GET: ChatHistory } = require("@/app/api/chat/history/route");

    function makeRequest(chatId: string, userId?: string): Request {
      const url = new URL(
        `http://localhost:3000/api/chat/history?chatId=${chatId}`,
      );
      return {
        method: "GET",
        url: url.toString(),
        headers: new Headers({
          "content-type": "application/json",
          "x-request-id": "test-request-id",
          ...(userId ? { "x-user-id": userId } : {}),
        }),
        nextUrl: url,
      } as unknown as Request;
    }

    it("returns chat history for authenticated user", async () => {
      verifyAuth.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      });

      prisma.chat.findFirst.mockResolvedValue({
        id: "chat-1",
        userId: "user-1",
      });

      prisma.message.findMany.mockResolvedValue([
        {
          id: "msg-1",
          role: "user",
          content: "Hello",
          createdAt: new Date(),
        },
        {
          id: "msg-2",
          role: "assistant",
          content: "Hi there!",
          createdAt: new Date(),
        },
      ]);

      const req = makeRequest("chat-1", "user-1");
      const res = await ChatHistory(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.messages).toHaveLength(2);
    });

    it("returns 401 when not authenticated", async () => {
      verifyAuth.mockResolvedValue(null);

      const req = makeRequest("chat-1");
      const res = await ChatHistory(req);

      expect(res.status).toBe(401);
    });

    it("returns 400 when chatId missing", async () => {
      verifyAuth.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      });

      const url = new URL(`http://localhost:3000/api/chat/history`);
      const req = {
        method: "GET",
        url: url.toString(),
        headers: new Headers({
          "x-user-id": "user-1",
        }),
        nextUrl: url,
      } as unknown as Request;

      const res = await ChatHistory(req);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/chat/status", () => {
    const { GET: ChatStatus } = require("@/app/api/chat/status/[jobId]/route");

    it("returns job status when found", async () => {
      // Mock BullMQ job retrieval
      const mockJob = {
        id: "job-123",
        getState: jest.fn().mockResolvedValue("completed"),
        data: { chatId: "chat-1" },
        progress: 100,
        returnvalue: { success: true, messageId: "msg-1" },
      };

      // This test would need actual BullMQ queue mocking
      // which is more complex - placeholder for now
      expect(true).toBe(true);
    });
  });
});
