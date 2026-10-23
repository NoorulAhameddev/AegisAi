import { Server as SocketIOServer, Socket } from "socket.io";
import { createServer } from "http";
import type { Server as HTTPServer } from "http";
import Redis from "ioredis";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import { prisma } from "./prisma";

export interface RealtimeMessage {
  type: "chat" | "status" | "presence" | "notification" | "error";
  userId: string;
  chatId: string;
  content?: string;
  data?: Record<string, any>;
  timestamp: string;
  requestId?: string;
}

export interface PresenceData {
  userId: string;
  chatId: string;
  status: "online" | "typing" | "away" | "offline";
  lastSeen: string;
}

// Socket.IO server instance (singleton)
let io: SocketIOServer | null = null;

// Redis pub/sub for inter-process communication
let subscriber: InstanceType<typeof Redis> | null = null;
let publisher: InstanceType<typeof Redis> | null = null;

// Active connections tracking
const activeConnections = new Map<string, Set<string>>();
const userSockets = new Map<string, Set<string>>();

// WebSocket rate limiting
const messageRateLimitMap = new Map<
  string,
  { count: number; resetTime: number }
>();
const MESSAGE_RATE_LIMIT = 30; // messages per minute
const MESSAGE_RATE_WINDOW = 60000; // 1 minute

/**
 * Initialize WebSocket server
 * Should be called once on worker startup
 */
export function initializeWebSocketServer(
  httpServer: HTTPServer,
): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  setupSocketHandlers();
  setupRedisPubSub();

  logger.worker("websocket", "initialized", { port: env.WEBSOCKET_PORT });
  return io;
}

/**
 * Get WebSocket server instance
 */
export function getWebSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Setup Socket.IO connection handlers
 */
function setupSocketHandlers() {
  if (!io) return;

  io.on("connection", (socket: Socket) => {
    const socketId = socket.id;
    logger.worker("websocket", "client_connected", { socketId });

    // Join user's personal room - validates JWT token
    socket.on("auth", async (token: string) => {
      try {
        const { verifyAccessToken } = await import("@/services/auth/auth");
        const payload = verifyAccessToken(token);
        const userId = payload.userId;

        socket.join(`user:${userId}`);
        socket.data.userId = userId;
        socket.data.tokenVersion = payload.tokenVersion;

        // Track connection
        if (!userSockets.has(userId)) {
          userSockets.set(userId, new Set());
        }
        userSockets.get(userId)!.add(socketId);

        // Broadcast user online
        broadcastPresence(userId, "online");
        logger.worker("websocket", "user_authenticated", { userId, socketId });
      } catch (error) {
        socket.emit("error", { message: "Invalid authentication token" });
        socket.disconnect(true);
        logger.worker("websocket", "auth_failed", {
          socketId,
          error: (error as Error).message,
        });
      }
    });

    // Join chat room
    socket.on("join-chat", async (chatId: string) => {
      const userId = socket.data.userId;
      if (!userId) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }

      // SECURITY: Verify user has permission to access this chat
      try {
        const chat = await prisma.chat.findFirst({
          where: {
            id: chatId,
            OR: [
              { userId }, // Chat owner
              { isShared: true }, // Shared chat
              { ChatPermission: { some: { userId } } }, // Has explicit permission
            ],
            deletedAt: null,
          },
          select: { id: true },
        });

        if (!chat) {
          socket.emit("error", { message: "Chat not found or access denied" });
          logger.security("WebSocket join-chat denied", { userId, chatId });
          return;
        }
      } catch (error) {
        socket.emit("error", { message: "Failed to verify chat access" });
        logger.error("Chat access verification failed", error as Error, {
          userId,
          chatId,
        });
        return;
      }

      socket.join(`chat:${chatId}`);

      // Track active connections
      if (!activeConnections.has(chatId)) {
        activeConnections.set(chatId, new Set());
      }
      activeConnections.get(chatId)!.add(userId);

      // Notify others in chat
      io!
        .to(`chat:${chatId}`)
        .emit("user-joined", { userId, timestamp: new Date().toISOString() });
      logger.worker("websocket", "user_joined_chat", { userId, chatId });
    });

    // Leave chat room
    socket.on("leave-chat", (chatId: string) => {
      const userId = socket.data.userId;
      socket.leave(`chat:${chatId}`);

      const connections = activeConnections.get(chatId);
      if (connections) {
        connections.delete(userId);
        if (connections.size === 0) {
          activeConnections.delete(chatId);
        }
      }

      io!
        .to(`chat:${chatId}`)
        .emit("user-left", { userId, timestamp: new Date().toISOString() });
      logger.worker("websocket", "user_left_chat", { userId, chatId });
    });

    // Typing indicator
    socket.on("typing", (chatId: string, isTyping: boolean) => {
      const userId = socket.data.userId;
      if (!userId) return;

      io!.to(`chat:${chatId}`).emit("user-typing", {
        userId,
        isTyping,
        timestamp: new Date().toISOString(),
      });
    });

    // Chat message
    socket.on("message", (data: RealtimeMessage) => {
      const userId = socket.data.userId;
      if (!userId) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }

      // WebSocket rate limiting: prevent message flooding
      const now = Date.now();
      const rateKey = `${userId}:${data.chatId}`;
      let rateRecord = messageRateLimitMap.get(rateKey);

      if (!rateRecord || now > rateRecord.resetTime) {
        rateRecord = { count: 0, resetTime: now + MESSAGE_RATE_WINDOW };
        messageRateLimitMap.set(rateKey, rateRecord);
      }

      rateRecord.count++;
      if (rateRecord.count > MESSAGE_RATE_LIMIT) {
        socket.emit("error", {
          message: "Rate limit exceeded. Please slow down.",
        });
        logger.security("WebSocket rate limit exceeded", {
          userId,
          chatId: data.chatId,
          count: rateRecord.count,
        });
        return;
      }

      data.userId = userId;
      data.timestamp = new Date().toISOString();

      // Emit to chat room
      io!.to(`chat:${data.chatId}`).emit("message", data);

      // Publish to Redis for other processes
      if (publisher) {
        publisher.publish(`chat:${data.chatId}`, JSON.stringify(data));
      }

      logger.worker("websocket", "message_sent", {
        userId,
        chatId: data.chatId,
      });
    });

    // Disconnect handler
    socket.on("disconnect", () => {
      const userId = socket.data.userId;
      if (userId) {
        const sockets = userSockets.get(userId);
        if (sockets) {
          sockets.delete(socketId);
          if (sockets.size === 0) {
            userSockets.delete(userId);
            broadcastPresence(userId, "offline");
          }
        }
      }
      logger.worker("websocket", "client_disconnected", { socketId, userId });
    });

    // Error handler
    socket.on("error", (error) => {
      logger.error("WebSocket error", error as Error, { socketId });
    });
  });
}

/**
 * Setup Redis pub/sub for inter-process communication
 */
function setupRedisPubSub() {
  const redisUrl = env.REDIS_URL;

  try {
    subscriber = new Redis(redisUrl);
    publisher = new Redis(redisUrl);

    // Subscribe to broadcast channels
    subscriber.subscribe("broadcast:*", (err: Error | null) => {
      if (err) {
        logger.error("Redis subscribe failed", err as Error);
      } else {
        logger.worker("websocket", "redis_subscribed", {});
      }
    });

    subscriber.on("message", (channel: string, message: string) => {
      if (!io) return;

      try {
        const data = JSON.parse(message);

        if (channel.startsWith("broadcast:")) {
          const targetRoom = channel.replace("broadcast:", "");
          io.to(targetRoom).emit("broadcast", data);
        }
      } catch (error) {
        logger.error("Redis message parse error", error as Error, { channel });
      }
    });
  } catch (error) {
    logger.error("Redis pub/sub initialization failed", error as Error);
  }
}

/**
 * Broadcast a message to specific chat
 */
export function broadcastToChat(chatId: string, message: RealtimeMessage) {
  if (!io) return;
  io.to(`chat:${chatId}`).emit("message", message);

  // Also publish to Redis for other processes
  if (publisher) {
    publisher.publish(`broadcast:chat:${chatId}`, JSON.stringify(message));
  }
}

/**
 * Broadcast to specific user
 */
export function broadcastToUser(userId: string, message: RealtimeMessage) {
  if (!io) return;
  io.to(`user:${userId}`).emit("notification", message);

  if (publisher) {
    publisher.publish(`broadcast:user:${userId}`, JSON.stringify(message));
  }
}

/**
 * Broadcast presence update
 */
export function broadcastPresence(
  userId: string,
  status: "online" | "away" | "offline",
) {
  const presence: PresenceData = {
    userId,
    chatId: "",
    status,
    lastSeen: new Date().toISOString(),
  };

  if (io) {
    io.emit("presence-update", presence);
  }

  if (publisher) {
    publisher.publish("broadcast:presence", JSON.stringify(presence));
  }
}

/**
 * Get active connections for a chat
 */
export function getActiveConnections(chatId: string): Set<string> {
  return activeConnections.get(chatId) || new Set();
}

/**
 * Get user's active socket connections
 */
export function getUserSockets(userId: string): Set<string> {
  return userSockets.get(userId) || new Set();
}

// Cleanup rate limit map periodically to prevent memory leak
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];

  for (const [key, value] of messageRateLimitMap.entries()) {
    if (now > value.resetTime) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => messageRateLimitMap.delete(key));
}, 60000);

/**
 * Cleanup on shutdown
 */
export function cleanupWebSocket() {
  if (subscriber) {
    subscriber.unsubscribe();
    subscriber.disconnect();
  }
  if (publisher) {
    publisher.disconnect();
  }
  if (io) {
    io.close();
  }
  logger.worker("websocket", "cleaned_up", {});
}
