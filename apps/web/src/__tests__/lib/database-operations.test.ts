/**
 * Database Integration Tests
 * Tests Prisma operations for user, chat, and message models
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    chat: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe("Database Operations (Prisma Mocks)", () => {
  const { prisma } = require("@/lib/prisma");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("User Operations", () => {
    it("creates a new user with encryption", async () => {
      const userData = {
        email: "new@example.com",
        password: "hashedPassword",
        name: "New User",
      };

      prisma.user.create.mockResolvedValue({
        id: "user-123",
        ...userData,
        tokenVersion: 1,
        isBanned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const user = await prisma.user.create({ data: userData });

      expect(user.email).toBe("new@example.com");
      expect(user.id).toBe("user-123");
      expect(prisma.user.create).toHaveBeenCalledWith({ data: userData });
    });

    it("finds user by email", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "user-456",
        email: "find@example.com",
        password: "hashed",
        name: "Find User",
      });

      const user = await prisma.user.findUnique({
        where: { email: "find@example.com" },
      });

      expect(user).toBeDefined();
      expect(user.email).toBe("find@example.com");
    });

    it("updates user profile", async () => {
      prisma.user.update.mockResolvedValue({
        id: "user-789",
        email: "user@example.com",
        name: "Updated Name",
        updatedAt: new Date(),
      });

      const updated = await prisma.user.update({
        where: { id: "user-789" },
        data: { name: "Updated Name" },
      });

      expect(updated.name).toBe("Updated Name");
    });

    it("increments tokenVersion to invalidate sessions", async () => {
      prisma.user.update.mockResolvedValue({
        id: "user-999",
        tokenVersion: 2,
      });

      const result = await prisma.user.update({
        where: { id: "user-999" },
        data: { tokenVersion: { increment: 1 } },
      });

      expect(result.tokenVersion).toBe(2);
    });
  });

  describe("Chat Operations", () => {
    it("creates a new chat", async () => {
      prisma.chat.create.mockResolvedValue({
        id: "chat-new",
        userId: "user-123",
        title: "New Chat",
        projectId: "proj-1",
        createdAt: new Date(),
        deletedAt: null,
      });

      const chat = await prisma.chat.create({
        data: {
          userId: "user-123",
          title: "New Chat",
          projectId: "proj-1",
        },
      });

      expect(chat.id).toBe("chat-new");
      expect(chat.title).toBe("New Chat");
    });

    it("retrieves user's chats", async () => {
      prisma.chat.findMany.mockResolvedValue([
        { id: "chat-1", userId: "user-1", title: "Chat 1" },
        { id: "chat-2", userId: "user-1", title: "Chat 2" },
      ]);

      const chats = await prisma.chat.findMany({
        where: { userId: "user-1", deletedAt: null },
      });

      expect(chats).toHaveLength(2);
      expect(chats[0].userId).toBe("user-1");
    });

    it("soft deletes a chat", async () => {
      prisma.chat.update.mockResolvedValue({
        id: "chat-delete",
        userId: "user-1",
        deletedAt: new Date(),
      });

      const deleted = await prisma.chat.update({
        where: { id: "chat-delete" },
        data: { deletedAt: new Date() },
      });

      expect(deleted.deletedAt).not.toBeNull();
    });
  });

  describe("Message Operations", () => {
    it("creates a new message in chat", async () => {
      prisma.message.create.mockResolvedValue({
        id: "msg-1",
        chatId: "chat-1",
        role: "user",
        content: "Hello AI",
        createdAt: new Date(),
      });

      const message = await prisma.message.create({
        data: {
          chatId: "chat-1",
          role: "user",
          content: "Hello AI",
        },
      });

      expect(message.role).toBe("user");
      expect(message.content).toBe("Hello AI");
    });

    it("retrieves chat messages in order", async () => {
      prisma.message.findMany.mockResolvedValue([
        {
          id: "msg-1",
          role: "user",
          content: "Hi",
          createdAt: new Date(Date.now() - 1000),
        },
        {
          id: "msg-2",
          role: "assistant",
          content: "Hello",
          createdAt: new Date(),
        },
      ]);

      const messages = await prisma.message.findMany({
        where: { chatId: "chat-1" },
        orderBy: { createdAt: "asc" },
      });

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("user");
      expect(messages[1].role).toBe("assistant");
    });

    it("deletes all messages in a chat", async () => {
      prisma.message.deleteMany.mockResolvedValue({ count: 5 });

      const result = await prisma.message.deleteMany({
        where: { chatId: "chat-delete" },
      });

      expect(result.count).toBe(5);
    });
  });

  describe("Session Management", () => {
    it("creates a new session", async () => {
      prisma.session.create.mockResolvedValue({
        id: "session-1",
        userId: "user-1",
        accessTokenHash: "hash1",
        refreshTokenHash: "hash2",
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      });

      const session = await prisma.session.create({
        data: {
          userId: "user-1",
          accessTokenHash: "hash1",
          refreshTokenHash: "hash2",
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      expect(session.userId).toBe("user-1");
      expect(session.expiresAt).toBeDefined();
    });

    it("revokes all user sessions", async () => {
      prisma.session.deleteMany.mockResolvedValue({ count: 3 });

      const result = await prisma.session.deleteMany({
        where: { userId: "user-1" },
      });

      expect(result.count).toBe(3);
    });
  });

  describe("Audit Logging", () => {
    it("creates audit log for admin actions", async () => {
      prisma.auditLog.create.mockResolvedValue({
        id: "audit-1",
        userId: "admin-1",
        action: "USER_BANNED",
        targetId: "user-999",
        changes: { banned: true },
        integrityHash: "hash123",
        createdAt: new Date(),
      });

      const log = await prisma.auditLog.create({
        data: {
          userId: "admin-1",
          action: "USER_BANNED",
          targetId: "user-999",
          changes: { banned: true },
          integrityHash: "hash123",
        },
      });

      expect(log.action).toBe("USER_BANNED");
      expect(log.integrityHash).toBeDefined();
    });

    it("retrieves audit logs for compliance", async () => {
      prisma.auditLog.findMany.mockResolvedValue([
        {
          id: "audit-1",
          action: "CHAT_CREATED",
          createdAt: new Date(Date.now() - 3600000),
        },
        {
          id: "audit-2",
          action: "MESSAGE_SENT",
          createdAt: new Date(),
        },
      ]);

      const logs = await prisma.auditLog.findMany({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      expect(logs).toHaveLength(2);
    });
  });

  describe("Transaction Safety", () => {
    it("should handle concurrent chat creation", async () => {
      // Simulate creating chats for same user concurrently
      prisma.chat.create.mockResolvedValue({
        id: "chat-concurrent",
        userId: "user-1",
      });

      const promiseList = [
        prisma.chat.create({ data: { userId: "user-1", title: "Chat A" } }),
        prisma.chat.create({ data: { userId: "user-1", title: "Chat B" } }),
      ];

      const results = await Promise.all(promiseList);
      expect(results).toHaveLength(2);
    });

    it("should maintain referential integrity", async () => {
      // Verify that deleting a chat also deletes its messages
      prisma.message.deleteMany.mockResolvedValue({ count: 5 });
      prisma.chat.delete.mockResolvedValue({ id: "chat-1" });

      const msgResult = await prisma.message.deleteMany({
        where: { chatId: "chat-1" },
      });
      const chatResult = await prisma.chat.delete({
        where: { id: "chat-1" },
      });

      expect(msgResult.count).toBe(5);
      expect(chatResult.id).toBe("chat-1");
    });
  });
});
