/**
 * Real-Time Collaboration WebSocket Server
 * Handles presence, message sync, and collaborative editing
 */

import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/services/auth/auth';

export interface PresenceData {
  userId: string;
  userName: string;
  chatId: string;
  cursor?: { line: number; column: number };
  typing?: boolean;
  lastSeen: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: string;
  content: string;
  userId: string;
  createdAt: string;
}

export class CollaborationServer {
  private io: SocketServer;
  private presenceMap: Map<string, PresenceData[]> = new Map(); // chatId -> users[]

  constructor(httpServer: HttpServer) {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: '/api/socket',
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    logger.info('Collaboration WebSocket server initialized');
  }

  private setupEventHandlers() {
    this.io.on('connection', async (socket) => {
      logger.info('Client connected', { socketId: socket.id });

      // Authenticate socket connection
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        logger.warn('Socket connection without auth token', { socketId: socket.id });
        socket.emit('error', { message: 'Authentication required' });
        socket.disconnect();
        return;
      }

      try {
        const payload = verifyAccessToken(token);
        if (!payload || !payload.userId) {
          socket.emit('error', { message: 'Invalid token' });
          socket.disconnect();
          return;
        }

        const userId = payload.userId as string;
        socket.data.userId = userId;

        // Handle joining a chat room
        socket.on('join-chat', async (chatId: string) => {
          await this.handleJoinChat(socket, userId, chatId);
        });

        // Handle leaving a chat room
        socket.on('leave-chat', async (chatId: string) => {
          await this.handleLeaveChat(socket, userId, chatId);
        });

        // Handle presence updates (typing, cursor position)
        socket.on('presence-update', (data: Partial<PresenceData>) => {
          this.handlePresenceUpdate(socket, userId, data);
        });

        // Handle new message broadcast
        socket.on('message-sent', (message: ChatMessage) => {
          this.handleMessageSent(socket, message);
        });

        // Handle message editing
        socket.on('message-edited', (data: { messageId: string; content: string; chatId: string }) => {
          this.handleMessageEdited(socket, data);
        });

        // Handle message deletion
        socket.on('message-deleted', (data: { messageId: string; chatId: string }) => {
          this.handleMessageDeleted(socket, data);
        });

        // Handle disconnect
        socket.on('disconnect', () => {
          this.handleDisconnect(socket, userId);
        });

      } catch (error) {
        logger.error('Failed to authenticate socket', error as Error, { socketId: socket.id });
        socket.emit('error', { message: 'Authentication failed' });
        socket.disconnect();
      }
    });
  }

  /**
   * Handle user joining a chat room
   */
  private async handleJoinChat(socket: any, userId: string, chatId: string) {
    try {
      // Verify user has permission to access this chat
      const hasAccess = await this.verifyUserChatAccess(userId, chatId);
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied to this chat' });
        return;
      }

      // Join the room
      socket.join(`chat:${chatId}`);

      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
      });

      // Add to presence map
      const presenceData: PresenceData = {
        userId,
        userName: user?.name || 'Unknown',
        chatId,
        lastSeen: Date.now()
      };

      if (!this.presenceMap.has(chatId)) {
        this.presenceMap.set(chatId, []);
      }

      const chatPresence = this.presenceMap.get(chatId)!;
      const existingIndex = chatPresence.findIndex(p => p.userId === userId);
      if (existingIndex >= 0) {
        chatPresence[existingIndex] = presenceData;
      } else {
        chatPresence.push(presenceData);
      }

      // Notify others in the room
      socket.to(`chat:${chatId}`).emit('user-joined', {
        userId,
        userName: presenceData.userName,
        timestamp: Date.now()
      });

      // Send current presence list to the joining user
      socket.emit('presence-list', this.presenceMap.get(chatId) || []);

      // Log activity
      await prisma.chatActivity.create({
        data: {
          chatId,
          userId,
          action: 'joined',
          metadata: { socketId: socket.id }
        }
      });

      logger.info('User joined chat room', { userId, chatId, socketId: socket.id });
    } catch (error) {
      logger.error('Failed to join chat', error as Error, { userId, chatId });
      socket.emit('error', { message: 'Failed to join chat' });
    }
  }

  /**
   * Handle user leaving a chat room
   */
  private async handleLeaveChat(socket: any, userId: string, chatId: string) {
    try {
      socket.leave(`chat:${chatId}`);

      // Remove from presence map
      const chatPresence = this.presenceMap.get(chatId);
      if (chatPresence) {
        const filtered = chatPresence.filter(p => p.userId !== userId);
        if (filtered.length === 0) {
          this.presenceMap.delete(chatId);
        } else {
          this.presenceMap.set(chatId, filtered);
        }
      }

      // Notify others
      socket.to(`chat:${chatId}`).emit('user-left', {
        userId,
        timestamp: Date.now()
      });

      // Log activity
      await prisma.chatActivity.create({
        data: {
          chatId,
          userId,
          action: 'left'
        }
      });

      logger.info('User left chat room', { userId, chatId });
    } catch (error) {
      logger.error('Failed to leave chat', error as Error, { userId, chatId });
    }
  }

  /**
   * Handle presence updates (typing indicator, cursor position)
   */
  private handlePresenceUpdate(socket: any, userId: string, data: Partial<PresenceData>) {
    const chatId = data.chatId;
    if (!chatId) return;

    const chatPresence = this.presenceMap.get(chatId);
    if (!chatPresence) return;

    const userPresence = chatPresence.find(p => p.userId === userId);
    if (userPresence) {
      // Update cursor position
      if (data.cursor) {
        userPresence.cursor = data.cursor;
      }
      if (typeof data.typing === 'boolean') {
        userPresence.typing = data.typing;
      }
      userPresence.lastSeen = Date.now();

      // Broadcast to others in room
      socket.to(`chat:${chatId}`).emit('presence-update', {
        userId,
        userName: userPresence.userName,
        cursor: data.cursor,
        typing: userPresence.typing,
        lastSeen: userPresence.lastSeen
      });
    }
  }

  /**
   * Handle new message broadcast
   */
  private handleMessageSent(socket: any, message: ChatMessage) {
    const { chatId } = message;

    // Broadcast to all users in the chat (including sender for confirmation)
    this.io.to(`chat:${chatId}`).emit('message-received', message);

    logger.info('Message broadcasted', { chatId, messageId: message.id });
  }

  /**
   * Handle message editing
   */
  private handleMessageEdited(socket: any, data: { messageId: string; content: string; chatId: string }) {
    const { chatId, messageId, content } = data;

    // Broadcast edit to all users in the chat
    socket.to(`chat:${chatId}`).emit('message-edited', {
      messageId,
      content,
      editedAt: new Date().toISOString()
    });

    logger.info('Message edit broadcasted', { chatId, messageId });
  }

  /**
   * Handle message deletion
   */
  private handleMessageDeleted(socket: any, data: { messageId: string; chatId: string }) {
    const { chatId, messageId } = data;

    // Broadcast deletion to all users
    socket.to(`chat:${chatId}`).emit('message-deleted', {
      messageId,
      deletedAt: new Date().toISOString()
    });

    logger.info('Message deletion broadcasted', { chatId, messageId });
  }

  /**
   * Handle socket disconnect
   */
  private handleDisconnect(socket: any, userId: string) {
    // Remove from all presence maps
    for (const [chatId, presence] of this.presenceMap.entries()) {
      const filtered = presence.filter(p => p.userId !== userId);
      if (filtered.length === 0) {
        this.presenceMap.delete(chatId);
      } else {
        this.presenceMap.set(chatId, filtered);
      }

      // Notify others if user was in this chat
      if (presence.some(p => p.userId === userId)) {
        socket.to(`chat:${chatId}`).emit('user-left', {
          userId,
          timestamp: Date.now()
        });
      }
    }

    logger.info('Client disconnected', { socketId: socket.id, userId });
  }

  /**
   * Verify user has access to chat
   */
  private async verifyUserChatAccess(userId: string, chatId: string): Promise<boolean> {
    try {
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: { userId: true, isShared: true }
      });

      // Owner always has access
      if (chat?.userId === userId) {
        return true;
      }

      // Check if shared and user has permission
      if (chat?.isShared) {
        const permission = await prisma.chatPermission.findUnique({
          where: {
            chatId_userId: {
              chatId,
              userId
            }
          }
        });
        return permission !== null;
      }

      return false;
    } catch (error) {
      logger.error('Failed to verify chat access', error as Error, { userId, chatId });
      return false;
    }
  }

  /**
   * Get presence list for a chat
   */
  getPresence(chatId: string): PresenceData[] {
    return this.presenceMap.get(chatId) || [];
  }

  /**
   * Get Socket.IO instance for advanced operations
   */
  getIO(): SocketServer {
    return this.io;
  }
}

let collaborationServer: CollaborationServer | null = null;

/**
 * Initialize collaboration server
 */
export function initCollaborationServer(httpServer: HttpServer): CollaborationServer {
  if (!collaborationServer) {
    collaborationServer = new CollaborationServer(httpServer);
  }
  return collaborationServer;
}

/**
 * Get existing collaboration server instance
 */
export function getCollaborationServer(): CollaborationServer | null {
  return collaborationServer;
}
