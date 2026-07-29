"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { logger } from "@/lib/logger";

export interface RealtimeMessage {
  type: "chat" | "status" | "presence" | "notification" | "error";
  userId: string;
  chatId: string;
  content?: string;
  data?: Record<string, any>;
  timestamp: string;
  requestId?: string;
}

interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
}

/**
 * Hook for WebSocket connection management
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:3001",
    autoConnect = true,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoConnect) return;

    try {
      setConnecting(true);
      socketRef.current = io(url, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ["websocket", "polling"],
      });

      socketRef.current.on("connect", () => {
        setConnected(true);
        setConnecting(false);
        setError(null);
        logger.info("WebSocket connected");
      });

      socketRef.current.on("disconnect", () => {
        setConnected(false);
        logger.info("WebSocket disconnected");
      });

      socketRef.current.on("error", (err) => {
        setError(err.message || "WebSocket error");
        logger.error("WebSocket error:", err);
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to connect";
      setError(errorMsg);
      setConnecting(false);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [url, autoConnect]);

  const send = useCallback((event: string, data: any) => {
    if (!socketRef.current?.connected) {
      logger.warn("WebSocket not connected");
      return;
    }
    socketRef.current.emit(event, data);
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (!socketRef.current) return;
    socketRef.current.on(event, callback);
  }, []);

  const off = useCallback((event: string, callback?: (data: any) => void) => {
    if (!socketRef.current) return;
    socketRef.current.off(event, callback);
  }, []);

  return {
    socket: socketRef.current,
    connected,
    connecting,
    error,
    send,
    on,
    off,
  };
}

/**
 * Hook for real-time chat functionality
 */
export function useRealtimeChat(chatId: string, userId: string | null) {
  const { socket, connected, send, on, off } = useWebSocket();
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [activeUsers, setActiveUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string>("idle");

  // Authenticate and join chat
  useEffect(() => {
    if (!connected || !userId) return;

    // Authenticate
    send("auth", userId);

    // Join chat room
    send("join-chat", chatId);

    return () => {
      if (socket?.connected) {
        send("leave-chat", chatId);
      }
    };
  }, [connected, userId, chatId, send, socket]);

  // Listen for messages
  useEffect(() => {
    on("message", (message: RealtimeMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    on("status", (data: any) => {
      setStatus(data.status);
    });

    on("user-joined", (data: any) => {
      setActiveUsers((prev) => new Set([...prev, data.userId]));
    });

    on("user-left", (data: any) => {
      setActiveUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    });

    on("user-typing", (data: any) => {
      if (data.isTyping) {
        setTypingUsers((prev) => new Set([...prev, data.userId]));
      } else {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(data.userId);
          return next;
        });
      }
    });

    return () => {
      off("message");
      off("status");
      off("user-joined");
      off("user-left");
      off("user-typing");
    };
  }, [on, off]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!connected || !userId) return;

      send("message", {
        type: "chat",
        userId,
        chatId,
        content,
        timestamp: new Date().toISOString(),
      });
    },
    [connected, userId, chatId, send],
  );

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!connected) return;
      send("typing", chatId, isTyping);
    },
    [connected, chatId, send],
  );

  return {
    messages,
    activeUsers,
    typingUsers,
    status,
    connected,
    sendMessage,
    setTyping,
  };
}
