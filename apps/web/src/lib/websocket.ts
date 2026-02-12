import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer } from 'http';
import Redis from 'ioredis';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';

export interface RealtimeMessage {
  type: 'chat' | 'status' | 'presence' | 'notification' | 'error';
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
  status: 'online' | 'typing' | 'offline';
  lastSeen: string;
}

// Socket.IO server instance (singleton)
let io: SocketIOServer | null = null;

// Redis pub/sub for inter-process communication
let subscriber: Redis | null = null;
let publisher: Redis | null = null;

// Active connections tracking
const activeConnections = new Map<string, Set<string>>();
const userSockets = new Map<string, Set<string>>();

/**
 * Initialize WebSocket server
 * Should be called once on worker startup
 */
export function initializeWebSocketServer(httpServer: any): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  setupSocketHandlers();
  setupRedisPubSub();

  logger.worker('websocket', 'initialized', { port: env.WEBSOCKET_PORT });
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

  io.on('connection', (socket: Socket) => {
    const socketId = socket.id;
    logger.worker('websocket', 'client_connected', { socketId });

    // Join user's personal room
    socket.on('auth', (userId: string) => {
      socket.join(`user:${userId}`);
      socket.data.userId = userId;

      // Track connection
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId)!.add(socketId);

      // Broadcast user online
      broadcastPresence(userId, 'online');
      logger.worker('websocket', 'user_authenticated', { userId, socketId });
    });

    // Join chat room
    socket.on('join-chat', (chatId: string) => {
      const userId = socket.data.userId;
      if (!userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      socket.join(`chat:${chatId}`);

      // Track active connections
      if (!activeConnections.has(chatId)) {
        activeConnections.set(chatId, new Set());
      }
      activeConnections.get(chatId)!.add(userId);

      // Notify others in chat
      io!.to(`chat:${chatId}`).emit('user-joined', { userId, timestamp: new Date().toISOString() });
      logger.worker('websocket', 'user_joined_chat', { userId, chatId });
    });

    // Leave chat room
    socket.on('leave-chat', (chatId: string) => {
      const userId = socket.data.userId;
      socket.leave(`chat:${chatId}`);

      const connections = activeConnections.get(chatId);
      if (connections) {
        connections.delete(userId);
        if (connections.size === 0) {
          activeConnections.delete(chatId);
        }
      }

      io!.to(`chat:${chatId}`).emit('user-left', { userId, timestamp: new Date().toISOString() });
      logger.worker('websocket', 'user_left_chat', { userId, chatId });
    });

    // Typing indicator
    socket.on('typing', (chatId: string, isTyping: boolean) => {
      const userId = socket.data.userId;
      if (!userId) return;

      io!.to(`chat:${chatId}`).emit('user-typing', {
        userId,
        isTyping,
        timestamp: new Date().toISOString(),
      });
    });

    // Chat message
    socket.on('message', (data: RealtimeMessage) => {
      const userId = socket.data.userId;
      if (!userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      data.userId = userId;
      data.timestamp = new Date().toISOString();

      // Emit to chat room
      io!.to(`chat:${data.chatId}`).emit('message', data);

      // Publish to Redis for other processes
      if (publisher) {
        publisher.publish(`chat:${data.chatId}`, JSON.stringify(data));
      }

      logger.worker('websocket', 'message_sent', { userId, chatId: data.chatId });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      const userId = socket.data.userId;
      if (userId) {
        const sockets = userSockets.get(userId);
        if (sockets) {
          sockets.delete(socketId);
          if (sockets.size === 0) {
            userSockets.delete(userId);
            broadcastPresence(userId, 'offline');
          }
        }
      }
      logger.worker('websocket', 'client_disconnected', { socketId, userId });
    });

    // Error handler
    socket.on('error', (error) => {
      logger.error('WebSocket error', error as Error, { socketId });
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
    subscriber.subscribe('broadcast:*', (err) => {
      if (err) {
        logger.error('Redis subscribe failed', err as Error);
      } else {
        logger.worker('websocket', 'redis_subscribed', {});
      }
    });

    subscriber.on('message', (channel, message) => {
      if (!io) return;

      try {
        const data = JSON.parse(message);

        if (channel.startsWith('broadcast:')) {
          const targetRoom = channel.replace('broadcast:', '');
          io.to(targetRoom).emit('broadcast', data);
        }
      } catch (error) {
        logger.error('Redis message parse error', error as Error, { channel });
      }
    });
  } catch (error) {
    logger.error('Redis pub/sub initialization failed', error as Error);
  }
}

/**
 * Broadcast a message to specific chat
 */
export function broadcastToChat(chatId: string, message: RealtimeMessage) {
  if (!io) return;
  io.to(`chat:${chatId}`).emit('message', message);

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
  io.to(`user:${userId}`).emit('notification', message);

  if (publisher) {
    publisher.publish(`broadcast:user:${userId}`, JSON.stringify(message));
  }
}

/**
 * Broadcast presence update
 */
export function broadcastPresence(userId: string, status: 'online' | 'offline') {
  const presence: PresenceData = {
    userId,
    chatId: '',
    status,
    lastSeen: new Date().toISOString(),
  };

  if (io) {
    io.emit('presence-update', presence);
  }

  if (publisher) {
    publisher.publish('broadcast:presence', JSON.stringify(presence));
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
  logger.worker('websocket', 'cleaned_up', {});
}
