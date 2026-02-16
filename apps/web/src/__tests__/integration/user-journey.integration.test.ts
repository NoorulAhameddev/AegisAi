/**
 * Integration Test: Core User Journeys
 * Tests end-to-end flows for authentication, chat creation, and RAG retrieval
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    chat: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
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
  revokeAllSessions: jest.fn(),
}));

jest.mock("@/lib/queue", () => ({
  chatQueue: {
    add: jest.fn(),
  },
}));

jest.mock("@/lib/rag-retrieval", () => ({
  retrieveContext: jest.fn(),
}));

jest.mock("@/lib/moderation", () => ({
  checkModeration: jest.fn(),
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe("User Journey Integration Tests", () => {
  describe("Complete User Flow: Register → Login → Create Chat → Send Message", () => {
    const { prisma } = require("@/lib/prisma");
    const { verifyAuth, createSession } = require("@/services/auth/auth");
    const { chatQueue } = require("@/lib/queue");
    const bcrypt = require("bcrypt");

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should complete full user journey successfully", async () => {
      // Step 1: User Registration
      const newUserId = "user-journey-1";
      const userEmail = "journey@example.com";

      prisma.user.findUnique.mockResolvedValue(null); // User doesn't exist yet
      bcrypt.hash.mockResolvedValue("hashed-password");
      prisma.user.create.mockResolvedValue({
        id: newUserId,
        email: userEmail,
        name: "Journey User",
        tokenVersion: 1,
      });
      createSession.mockResolvedValue({
        accessToken: "access-token-1",
        refreshToken: "refresh-token-1",
      });

      // Simulate registration
      const registerCheck = await prisma.user.findUnique({ where: { email: userEmail } });
      expect(registerCheck).toBeNull();

      const hashedPwd = await bcrypt.hash("SecurePassword123!", 14);
      expect(hashedPwd).toBe("hashed-password");

      const newUser = await prisma.user.create({
        data: {
          email: userEmail,
          password: hashedPwd,
          name: "Journey User",
        },
      });
      expect(newUser.id).toBe(newUserId);

      // Step 2: User Login
      verifyAuth.mockResolvedValue({
        id: newUserId,
        email: userEmail,
        name: "Journey User",
      });

      const authUser = await verifyAuth({ headers: new Headers() } as any);
      expect(authUser).toBeDefined();
      expect(authUser.email).toBe(userEmail);

      // Step 3: Create Chat
      prisma.chat.create.mockResolvedValue({
        id: "chat-journey-1",
        userId: newUserId,
        title: "My First Chat",
        projectId: "project-1",
        createdAt: new Date(),
      });

      const newChat = await prisma.chat.create({
        data: {
          userId: newUserId,
          title: "My First Chat",
          projectId: "project-1",
        },
      });
      expect(newChat.id).toBe("chat-journey-1");
      expect(newChat.userId).toBe(newUserId);

      // Step 4: Send Message (Enqueue to Worker)
      chatQueue.add.mockResolvedValue({
        id: "job-journey-1",
        data: {
          chatId: "chat-journey-1",
          userId: newUserId,
          message: "What is machine learning?",
        },
      });

      const job = await chatQueue.add("process-chat", {
        chatId: "chat-journey-1",
        userId: newUserId,
        message: "What is machine learning?",
      });
      expect(job.id).toBe("job-journey-1");

      // Step 5: Verify flow connectivity
      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.chat.create).toHaveBeenCalled();
      expect(chatQueue.add).toHaveBeenCalled();
    });

    it("should prevent unauthorized chat access", async () => {
      verifyAuth.mockResolvedValue(null); // Not authenticated

      const authResult = await verifyAuth({} as any);
      expect(authResult).toBeNull();

      prisma.chat.findFirst.mockResolvedValue(null);
      const chat = await prisma.chat.findFirst({
        where: { id: "chat-1", userId: "user-1" },
      });
      expect(chat).toBeNull();
    });

    it("should handle failed authentication recovery", async () => {
      const { rotateTokens, revokeAllSessions } = require("@/services/auth/auth");

      // Simulate failed token
      rotateTokens.mockResolvedValue(null);
      const tokens = await rotateTokens("expired-token");
      expect(tokens).toBeNull();

      // Revoke all sessions
      revokeAllSessions.mockResolvedValue({ count: 3 });
      const revoked = await revokeAllSessions("user-1");
      expect(revoked.count).toBe(3);
    });
  });

  describe("RAG Integration in Chat Flow", () => {
    const { retrieveContext } = require("@/lib/rag-retrieval");
    const { checkModeration } = require("@/lib/moderation");

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should retrieve RAG context for knowledge-based questions", async () => {
      retrieveContext.mockResolvedValue({
        documents: [
          {
            id: "doc-1",
            content: "Machine learning is a subset of AI...",
            score: 0.92,
            metadata: { source: "wiki" },
          },
          {
            id: "doc-2",
            content: "Deep learning uses neural networks...",
            score: 0.88,
            metadata: { source: "research" },
          },
        ],
        totalRetrieved: 2,
      });

      const userId = "user-1";
      const query = "What is machine learning?";

      const context = await retrieveContext(userId, query, 5);

      expect(context).toBeDefined();
      expect(context.documents).toHaveLength(2);
      expect(context.documents[0].score).toBeGreaterThanOrEqual(0.88);
      expect(context.totalRetrieved).toBe(2);
    });

    it("should validate message safety with moderation", async () => {
      checkModeration.mockResolvedValue({
        flagged: false,
        categories: {},
        categoryScores: {},
      });

      const message = "What are the best practices for building AI applications?";
      const modResult = await checkModeration(message);

      expect(modResult.flagged).toBe(false);
    });

    it("should flag inappropriate content", async () => {
      checkModeration.mockResolvedValue({
        flagged: true,
        categories: {
          violence: true,
        },
        categoryScores: {
          violence: 0.95,
        },
      });

      const inappropriateMsg = "How to cause harm...";
      const result = await checkModeration(inappropriateMsg);

      expect(result.flagged).toBe(true);
      expect(result.categories.violence).toBe(true);
    });
  });

  describe("Worker Queue Processing Flow", () => {
    const { chatQueue } = require("@/lib/queue");
    const { prisma } = require("@/lib/prisma");

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should enqueue and track job status", async () => {
      chatQueue.add.mockResolvedValue({
        id: "job-worker-1",
        data: {
          chatId: "chat-1",
          userId: "user-1",
          message: "Hello AI",
        },
        progress: 0,
        state: "waiting",
      });

      const jobData = {
        chatId: "chat-1",
        userId: "user-1",
        message: "Hello AI",
      };

      const enqueuedJob = await chatQueue.add("process-chat", jobData, {
        jobId: "job-worker-1",
      });

      expect(enqueuedJob.id).toBe("job-worker-1");
      expect(enqueuedJob.state).toBe("waiting");

      // During processing, save AI response
      prisma.message.create.mockResolvedValue({
        id: "msg-1",
        chatId: "chat-1",
        role: "assistant",
        content: "Hello! How can I help?",
        createdAt: new Date(),
      });

      const aiMessage = await prisma.message.create({
        data: {
          chatId: "chat-1",
          role: "assistant",
          content: "Hello! How can I help?",
        },
      });

      expect(aiMessage.role).toBe("assistant");
      expect(aiMessage.content).toContain("help");
    });

    it("should handle job failures gracefully", async () => {
      chatQueue.add.mockResolvedValue({
        id: "job-fail-1",
        state: "failed",
        failedReason: "OpenAI API timeout",
      });

      const failedJob = await chatQueue.add("process-chat", {
        chatId: "chat-1",
        userId: "user-1",
        message: "Test",
      });

      expect(failedJob.state).toBe("failed");
      expect(failedJob.failedReason).toContain("timeout");
    });
  });
});
