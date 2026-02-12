import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export type PresenceData = {
  userId: string;
  userName: string;
  cursor?: { x: number; y: number };
  typing?: boolean;
  lastSeen: Date;
  isActive: boolean;
};

type PresenceWireData = Omit<PresenceData, "lastSeen"> & { lastSeen: number };

export type ActivityEvent = {
  action: string;
  userName: string;
  userEmail?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
};

export type CollaborationState = {
  isConnected: boolean;
  activeUsers: PresenceData[];
  isShared: boolean;
  userRole?: 'VIEWER' | 'COMMENTER' | 'EDITOR' | 'ADMIN' | 'OWNER';
  shareToken?: string;
};

interface UseCollaborationProps {
  chatId: string;
  jwt: string;
  userId: string;
  userName: string;
  enabled?: boolean;
}

export const useCollaboration = ({
  chatId,
  jwt,
  userId,
  userName,
  enabled = true,
}: UseCollaborationProps) => {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<CollaborationState>({
    isConnected: false,
    activeUsers: [],
    isShared: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!enabled || !chatId || !jwt) return;

    try {
      socketRef.current = io('/', {
        path: '/api/socket',
        auth: { token: jwt },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      socketRef.current.on('connect', () => {
        console.log('[Collaboration] Connected to WebSocket');
        setState((prev: CollaborationState) => ({ ...prev, isConnected: true }));
        setError(null);

        // Join chat room
        socketRef.current?.emit('join-chat', {
          chatId,
          userId,
          userName,
        });
      });

      socketRef.current.on('disconnect', (reason: string) => {
        console.log('[Collaboration] Disconnected:', reason);
        setState((prev: CollaborationState) => ({ ...prev, isConnected: false, activeUsers: [] }));
      });

      socketRef.current.on('connect_error', (error: Error) => {
        console.error('[Collaboration] Connection error:', error);
        setError('Failed to connect to collaboration server');
      });

      socketRef.current.on('error', (error: Error) => {
        console.error('[Collaboration] Socket error:', error);
        setError('Collaboration error');
      });

      // Handle presence updates
      socketRef.current.on('presence-list', (users: PresenceWireData[]) => {
        const now = Date.now();
        setState((prev: CollaborationState) => ({
          ...prev,
          activeUsers: users.map(u => ({
            ...u,
            lastSeen: new Date(u.lastSeen),
            isActive: now - u.lastSeen < 30000,
          })),
        }));
      });

      socketRef.current.on('presence-update', (user: PresenceWireData) => {
        const now = Date.now();
        setState((prev: CollaborationState) => {
          const updated = [...prev.activeUsers];
          const idx = updated.findIndex((u: PresenceData) => u.userId === user.userId);
          if (idx >= 0) {
            updated[idx] = {
              ...user,
              lastSeen: new Date(user.lastSeen),
              isActive: now - user.lastSeen < 30000,
            };
          } else {
            updated.push({
              ...user,
              lastSeen: new Date(user.lastSeen),
              isActive: now - user.lastSeen < 30000,
            });
          }
          return { ...prev, activeUsers: updated };
        });
      });

      socketRef.current.on('user-joined', (user: PresenceWireData) => {
        console.log(`[Collaboration] ${user.userName} joined`);
        setState((prev: CollaborationState) => {
          const updated = prev.activeUsers.filter((u: PresenceData) => u.userId !== user.userId);
          updated.push({
            ...user,
            lastSeen: new Date(user.lastSeen),
            isActive: true,
          });
          return { ...prev, activeUsers: updated };
        });
      });

      socketRef.current.on('user-left', (userId: string) => {
        setState((prev: CollaborationState) => ({
          ...prev,
          activeUsers: prev.activeUsers.filter((u: PresenceData) => u.userId !== userId),
        }));
      });

      // Handle share status
      socketRef.current.on('chat-shared', (data: { isShared: boolean; shareToken?: string }) => {
        setState((prev: CollaborationState) => ({
          ...prev,
          isShared: data.isShared,
          shareToken: data.shareToken,
        }));
      });

      return () => {
        socketRef.current?.emit('leave-chat', { chatId, userId });
        socketRef.current?.disconnect();
        socketRef.current = null;
      };
    } catch (err) {
      console.error('[Collaboration] Setup error:', err);
      setError('Failed to initialize collaboration');
    }
  }, [chatId, jwt, userId, userName, enabled]);

  // Send presence update (e.g., cursor position, typing)
  const updatePresence = useCallback((data: Partial<PresenceData>) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('presence-update', {
      chatId,
      userId,
      ...data,
    });
  }, [chatId, userId]);

  // Broadcast message sent
  const broadcastMessageSent = useCallback((message: any) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('message-sent', {
      chatId,
      userId,
      message,
    });
  }, [chatId, userId]);

  // Broadcast message edited
  const broadcastMessageEdited = useCallback((messageId: string, content: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('message-edited', {
      chatId,
      userId,
      messageId,
      content,
    });
  }, [chatId, userId]);

  // Broadcast message deleted
  const broadcastMessageDeleted = useCallback((messageId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('message-deleted', {
      chatId,
      userId,
      messageId,
    });
  }, [chatId, userId]);

  return {
    // State
    ...state,
    error,

    // Methods
    updatePresence,
    broadcastMessageSent,
    broadcastMessageEdited,
    broadcastMessageDeleted,

    // Socket ref for advanced usage
    socket: socketRef.current,
  };
};
