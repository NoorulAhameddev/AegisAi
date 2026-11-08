/**
 * Automated Regression Tests for Chat SSE Streaming (Milestone M6 / R5)
 * Acceptance Criteria Covered:
 * - AC-11: SSE token streaming emits message events with low latency
 * - AC-12: Client disconnect triggers provider abort and saves partial message with isPartial: true
 * - AC-13: Token budget reservation and usage metrics recorded
 * - AC-14: Multi-modal file attachment (fileId) supported
 */

import { ReadableStream as NodeReadableStream } from "stream/web";
import { MessagePort, MessageChannel } from "worker_threads";

if (typeof (global as any).ReadableStream === "undefined") {
  (global as any).ReadableStream = NodeReadableStream;
}
if (typeof (global as any).MessagePort === "undefined") {
  (global as any).MessagePort = MessagePort;
}
if (typeof (global as any).MessageChannel === "undefined") {
  (global as any).MessageChannel = MessageChannel;
}

const undici = require("undici");
(global as any).Response = undici.Response;
(global as any).Request = undici.Request;
(global as any).Headers = undici.Headers;

import { NextRequest } from "next/server";
import fs from "fs";

// Mock dependencies
const mockPrisma: any = {
  chat: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  message: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  file: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  usageMetric: {
    create: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  },
};

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/services/auth/auth", () => ({
  verifyAuth: jest.fn(),
}));

jest.mock("@/lib/response", () => ({
  successResponse: (data: any, options?: any) => ({
    status: options?.status || 200,
    headers: new Headers(),
    json: async () => ({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  }),
  errorResponse: (error: string, options?: any) => ({
    status: options?.status || 400,
    headers: new Headers(),
    json: async () => ({
      success: false,
      error,
      timestamp: new Date().toISOString(),
    }),
  }),
  unauthorizedResponse: () => ({
    status: 401,
    headers: new Headers(),
    json: async () => ({
      success: false,
      error: "Unauthorized",
      timestamp: new Date().toISOString(),
    }),
  }),
  notFoundResponse: () => ({
    status: 404,
    headers: new Headers(),
    json: async () => ({
      success: false,
      error: "Not Found",
      timestamp: new Date().toISOString(),
    }),
  }),
  badRequestResponse: (error: string) => ({
    status: 400,
    headers: new Headers(),
    json: async () => ({
      success: false,
      error,
      timestamp: new Date().toISOString(),
    }),
  }),
}));

jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("@/lib/security", () => ({
  quickModeration: jest.fn().mockReturnValue({ safe: true }),
}));

jest.mock("@/lib/moderation", () => ({
  checkModeration: jest.fn().mockResolvedValue({ flagged: false, categories: [] }),
}));

jest.mock("@/lib/quota", () => ({
  checkQuota: jest.fn(),
}));

jest.mock("@/services/billing/token-budget", () => ({
  tokenBudgetManager: {
    reserveBudget: jest.fn(),
    finalizeUsage: jest.fn(),
  },
}));

jest.mock("@/lib/rag-retrieval", () => ({
  retrieveContext: jest.fn().mockResolvedValue({
    context: "Retrieved knowledge base content",
    sources: new Set(["doc-123"]),
  }),
}));

jest.mock("@/lib/rag-sanitizer", () => ({
  sanitizeRagContext: jest.fn((ctx: string) => `SANITIZED: ${ctx}`),
}));

jest.mock("@/lib/encryption", () => ({
  encrypt: jest.fn(async (text: string) => `encrypted:${text}`),
  decrypt: jest.fn(async (text: string) =>
    text.startsWith("encrypted:") ? text.replace("encrypted:", "") : text,
  ),
}));

const mockOpenAICreate = jest.fn();
jest.mock("@/services/ai/openai", () => ({
  openai: {
    chat: {
      completions: {
        create: (...args: any[]) => mockOpenAICreate(...args),
      },
    },
  },
}));

// Helper to simulate OpenAI async iterable stream
async function* createMockStream(tokens: string[], delayMs = 0) {
  for (const token of tokens) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    yield {
      choices: [
        {
          delta: {
            content: token,
          },
        },
      ],
    };
  }
}

// Helper to read stream output from ReadableStream
async function readAllChunks(response: any): Promise<string> {
  const stream = response.body || response;
  if (stream && typeof stream.getReader === "function") {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += typeof value === "string" ? value : decoder.decode(value, { stream: true });
    }
    return result;
  }

  if (stream && typeof stream[Symbol.asyncIterator] === "function") {
    const decoder = new TextDecoder();
    let result = "";
    for await (const chunk of stream) {
      result += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
    }
    return result;
  }

  return "";
}

describe("Chat SSE Streaming Execution Architecture (R5)", () => {
  const { POST } = require("@/app/api/chat/stream-sse/route");
  const { verifyAuth } = require("@/services/auth/auth");
  const { checkQuota } = require("@/lib/quota");
  const { tokenBudgetManager } = require("@/services/billing/token-budget");

  const testUserId = "11111111-1111-1111-1111-111111111111";
  const testChatId = "22222222-2222-2222-2222-222222222222";
  const testFileId = "33333333-3333-3333-3333-333333333333";

  function makeRequest(
    body: any,
    options: { userId?: string; signal?: AbortSignal } = {},
  ): NextRequest {
    const bodyStr = JSON.stringify(body);
    const headers = new Headers({
      "content-type": "application/json",
      "x-request-id": "test-req-id",
      ...(options.userId ? { "x-user-id": options.userId } : {}),
    });

    return {
      method: "POST",
      url: "http://localhost:3000/api/chat/stream-sse",
      headers,
      json: async () => JSON.parse(bodyStr),
      text: async () => bodyStr,
      signal: options.signal || new AbortController().signal,
      cookies: {
        get: () => ({ value: "valid-auth-token" }),
      },
    } as unknown as NextRequest;
  }

  beforeEach(() => {
    jest.clearAllMocks();

    verifyAuth.mockResolvedValue({
      id: testUserId,
      email: "engineer@aegis-ai.internal",
    });

    checkQuota.mockResolvedValue({
      allowed: true,
      remaining: 50000,
    });

    tokenBudgetManager.reserveBudget.mockResolvedValue({
      approved: true,
      reservedAt: new Date(),
    });

    tokenBudgetManager.finalizeUsage.mockResolvedValue(undefined);

    mockPrisma.chat.findFirst.mockResolvedValue({
      id: testChatId,
      userId: testUserId,
      Message: [],
    });

    mockPrisma.message.findFirst.mockResolvedValue(null);
    mockPrisma.message.create.mockImplementation(async ({ data }: any) => ({
      id: "msg-" + Math.random().toString(36).substring(7),
      ...data,
      createdAt: new Date(),
    }));

    mockPrisma.usageMetric.create.mockResolvedValue({
      id: "metric-1",
      userId: testUserId,
      tokens: 42,
    });
  });

  describe("AC-11: SSE token streaming emits message events with low latency", () => {
    it("streams tokens as real-time server-sent events and marks message completed", async () => {
      const tokens = ["Hello", ", ", "this", " is", " Aegis AI."];
      mockOpenAICreate.mockResolvedValue(createMockStream(tokens));

      const req = makeRequest({
        chatId: testChatId,
        message: "Hello world",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");

      const streamText = await readAllChunks(res);

      // Verify each token is emitted as an SSE event
      for (const token of tokens) {
        expect(streamText).toContain(
          JSON.stringify({ content: token, text: token, done: false }),
        );
      }

      // Verify completion event and [DONE] marker
      expect(streamText).toContain("data: [DONE]\n\n");
      expect(streamText).toContain('"done":true');
      expect(streamText).toContain('"isPartial":false');

      // Verify assistant message was saved to database with isPartial: false
      expect(mockPrisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            chatId: testChatId,
            role: "ASSISTANT",
            isPartial: false,
          }),
        }),
      );
    });
  });

  describe("AC-12: Client disconnect triggers provider abort and saves partial message with isPartial: true", () => {
    it("persists partial message with isPartial: true when client aborts stream", async () => {
      const abortController = new AbortController();

      // Stream that yields one token then triggers abort
      async function* abortingStream() {
        yield { choices: [{ delta: { content: "Partial start..." } }] };
        // Trigger client disconnect abort
        abortController.abort();
        // Give event listener time to fire
        await new Promise((r) => setTimeout(r, 20));
        yield { choices: [{ delta: { content: "Should not be processed" } }] };
      }

      mockOpenAICreate.mockResolvedValue(abortingStream());

      const req = makeRequest(
        {
          chatId: testChatId,
          message: "Explain quantum physics",
        },
        { signal: abortController.signal },
      );

      const res = await POST(req);
      expect(res.status).toBe(200);

      await readAllChunks(res);

      // Verify assistant message was saved with isPartial: true
      expect(mockPrisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            chatId: testChatId,
            role: "ASSISTANT",
            isPartial: true,
          }),
        }),
      );
    });
  });

  describe("AC-13: Token budget reservation and usage metrics recorded", () => {
    it("reserves token budget, logs usage metrics, and finalizes budget upon completion", async () => {
      mockOpenAICreate.mockResolvedValue(createMockStream(["Budget", " verified"]));

      const req = makeRequest({
        chatId: testChatId,
        message: "Calculate token budget metrics",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      await readAllChunks(res);

      // 1. Verify token budget was checked and reserved before generation
      expect(tokenBudgetManager.reserveBudget).toHaveBeenCalledWith(
        testUserId,
        expect.any(Number),
      );

      // 2. Verify usage metrics persisted in Prisma
      expect(mockPrisma.usageMetric.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: testUserId,
            model: "openai/gpt-4o-mini",
            tokens: expect.any(Number),
          }),
        }),
      );

      // 3. Verify token budget finalized with actual tokens
      expect(tokenBudgetManager.finalizeUsage).toHaveBeenCalledWith(
        testUserId,
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({
          model: "openai/gpt-4o-mini",
          chatId: testChatId,
        }),
        expect.any(Date),
      );
    });

    it("rejects request with 429 when token budget reservation is exceeded", async () => {
      tokenBudgetManager.reserveBudget.mockResolvedValueOnce({
        approved: false,
        reason: "Daily token limit of 50,000 exceeded",
      });

      const req = makeRequest({
        chatId: testChatId,
        message: "Another prompt",
      });

      const res = await POST(req);
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toContain("reached your token usage limit");
      expect(mockOpenAICreate).not.toHaveBeenCalled();
    });

    it("rejects request with 403 when monthly plan quota is exhausted", async () => {
      checkQuota.mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
      });

      const req = makeRequest({
        chatId: testChatId,
        message: "Exceeded quota prompt",
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Monthly token quota exceeded");
      expect(mockOpenAICreate).not.toHaveBeenCalled();
    });
  });

  describe("AC-14: Multi-modal file attachment (fileId) supported", () => {
    it("resolves image file attachment and injects base64 data URL into OpenAI payload", async () => {
      mockOpenAICreate.mockResolvedValue(createMockStream(["Vision analysis complete."]));

      // Mock file lookup in Prisma
      mockPrisma.file.findFirst.mockResolvedValue({
        id: testFileId,
        userId: testUserId,
        name: "architecture-diagram.png",
        type: "image/png",
        path: "/var/storage/architecture-diagram.png",
        deletedAt: null,
      });

      // Mock filesystem checks
      jest.spyOn(fs, "existsSync").mockReturnValue(true);
      jest.spyOn(fs, "readFileSync").mockReturnValue(Buffer.from("mock-png-binary-data"));

      const req = makeRequest({
        chatId: testChatId,
        message: "What does this diagram show?",
        fileId: testFileId,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      await readAllChunks(res);

      // Verify OpenAI was called with multi-modal payload including base64 image data URL
      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: "text",
                  text: expect.stringContaining("What does this diagram show?"),
                }),
                expect.objectContaining({
                  type: "image_url",
                  image_url: {
                    url: "data:image/png;base64,bW9jay1wbmctYmluYXJ5LWRhdGE=",
                  },
                }),
              ]),
            }),
          ]),
        }),
      );
    });

    it("rejects invalid non-UUID fileId payload with 400", async () => {
      const req = makeRequest({
        chatId: testChatId,
        message: "Invalid fileId test",
        fileId: "not-a-valid-uuid",
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(mockOpenAICreate).not.toHaveBeenCalled();
    });
  });
});
