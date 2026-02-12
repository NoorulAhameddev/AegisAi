/**
 * Presence Tracking System
 * Tracks user online status across chats and manages activity
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { broadcastPresence, getUserSockets } from '@/lib/websocket';

export interface UserPresence {
  userId: string;
  chatId?: string;
  status: 'online' | 'away' | 'offline' | 'typing';
  lastSeen: Date;
  socketIds: string[];
  isActive: boolean;
}

// In-memory presence store (synced with Redis for multi-process)
const presenceStore = new Map<string, UserPresence>();

/**
 * Update user presence in a chat
 */
export async function updateUserPresence(
  userId: string,
  chatId: string,
  status: 'online' | 'away' | 'offline' = 'online'
) {
  const now = new Date();
  const socketIds = Array.from(getUserSockets(userId));

  const presence: UserPresence = {
    userId,
    chatId,
    status,
    lastSeen: now,
    socketIds,
    isActive: status === 'online',
  };

  presenceStore.set(`${userId}:${chatId}`, presence);

  // Save to database for persistence
  try {
    await prisma.userPresence.upsert({
      where: { userId_chatId: { userId, chatId } },
      update: { status, lastSeen: now },
      create: { userId, chatId, status, lastSeen: now },
    });
  } catch (error) {
    logger.error('Failed to save presence', error as Error, { userId, chatId });
  }

  // Broadcast to other users
  broadcastPresence(userId, status);

  return presence;
}

/**
 * Mark user as away (idle timeout)
 */
export async function markUserAway(userId: string, chatId: string) {
  const key = `${userId}:${chatId}`;
  const presence = presenceStore.get(key);

  if (presence && presence.status !== 'offline') {
    presence.status = 'away';
    presence.lastSeen = new Date();

    presenceStore.set(key, presence);

    // Update database
    try {
      await prisma.userPresence.update({
        where: { userId_chatId: { userId, chatId } },
        data: { status: 'away', lastSeen: new Date() },
      });
    } catch (error) {
      logger.error('Failed to mark user away', error as Error, { userId, chatId });
    }

    broadcastPresence(userId, 'away');
  }
}

/**
 * Mark user as offline
 */
export async function markUserOffline(userId: string, chatId?: string) {
  if (chatId) {
    const key = `${userId}:${chatId}`;
    presenceStore.delete(key);

    try {
      await prisma.userPresence.deleteMany({
        where: { userId, chatId },
      });
    } catch (error) {
      logger.error('Failed to delete presence', error as Error, { userId, chatId });
    }
  } else {
    // Mark user offline in all chats
    for (const [key] of presenceStore) {
      if (key.startsWith(`${userId}:`)) {
        presenceStore.delete(key);
      }
    }

    try {
      await prisma.userPresence.deleteMany({
        where: { userId },
      });
    } catch (error) {
      logger.error('Failed to delete all presences', error as Error, { userId });
    }
  }

  broadcastPresence(userId, 'offline');
}

/**
 * Get users currently active in a chat
 */
export async function getActiveChatUsers(chatId: string): Promise<UserPresence[]> {
  const activeUsers: UserPresence[] = [];

  for (const [key, presence] of presenceStore) {
    if (key.includes(chatId) && presence.chatId === chatId && presence.status !== 'offline') {
      activeUsers.push(presence);
    }
  }

  return activeUsers;
}

/**
 * Get user's presence data across all chats
 */
export async function getUserPresenceData(userId: string): Promise<UserPresence[]> {
  const userPresences: UserPresence[] = [];

  for (const [key, presence] of presenceStore) {
    if (key.startsWith(`${userId}:`) && presence.status !== 'offline') {
      userPresences.push(presence);
    }
  }

  return userPresences;
}

/**
 * Cleanup presence data for user leaving chat
 */
export async function cleanupUserPresence(userId: string, chatId: string) {
  await markUserOffline(userId, chatId);
  logger.worker('presence', 'user_cleanup', { userId, chatId });
}

/**
 * Get presence statistics for a chat
 */
export async function getChatPresenceStats(chatId: string) {
  const activeUsers = await getActiveChatUsers(chatId);

  return {
    totalActive: activeUsers.length,
    online: activeUsers.filter((u) => u.status === 'online').length,
    away: activeUsers.filter((u) => u.status === 'away').length,
    typing: activeUsers.filter((u) => u.status === 'typing').length,
    users: activeUsers.map((u) => ({
      userId: u.userId,
      status: u.status,
      lastSeen: u.lastSeen,
    })),
  };
}

/**
 * Idle timeout handler
 * Call this periodically to mark inactive users as away
 */
export async function handleIdleTimeout(thresholdMs: number = 5 * 60 * 1000) {
  const now = Date.now();

  for (const [key, presence] of presenceStore) {
    if (
      presence.status === 'online' &&
      now - presence.lastSeen.getTime() > thresholdMs
    ) {
      const [userId, chatId] = key.split(':');
      await markUserAway(userId, chatId);
    }
  }
}

/**
 * Periodic cleanup (e.g., every hour)
 * Remove stale presence data
 */
export async function cleanupStalePresence(staleThresholdHours: number = 24) {
  const staleDate = new Date(Date.now() - staleThresholdHours * 60 * 60 * 1000);

  try {
    const deleted = await prisma.userPresence.deleteMany({
      where: {
        lastSeen: { lt: staleDate },
        status: 'offline', // Only delete offline records
      },
    });

    logger.worker('presence-cleanup', 'stale_records_deleted', { count: deleted.count });
  } catch (error) {
    logger.error('Stale presence cleanup failed', error as Error);
  }
}
