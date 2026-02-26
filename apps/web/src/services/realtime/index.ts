import {
  broadcastToChat,
  broadcastToUser,
  getActiveConnections,
  RealtimeMessage,
} from "@/lib/websocket";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/**
 * Send a chat message to all connected users in a chat
 */
export async function sendChatMessage(
  chatId: string,
  userId: string,
  content: string,
  requestId?: string,
) {
  const message: RealtimeMessage = {
    type: "chat",
    userId,
    chatId,
    content,
    timestamp: new Date().toISOString(),
    requestId,
  };

  broadcastToChat(chatId, message);
  logger.worker(`realtime:${chatId}`, "message_sent", {
    userId,
    content: content.slice(0, 50),
  });
}

/**
 * Notify user of AI response
 */
export async function notifyAIResponse(
  chatId: string,
  userId: string,
  responseContent: string,
  tokenCount: number,
  requestId?: string,
) {
  const message: RealtimeMessage = {
    type: "chat",
    userId: "ai", // AI messages have special userId
    chatId,
    content: responseContent,
    data: { tokenCount, isAI: true },
    timestamp: new Date().toISOString(),
    requestId,
  };

  broadcastToChat(chatId, message);
  logger.worker(`realtime:${chatId}`, "ai_response_sent", {
    tokens: tokenCount,
  });
}

/**
 * Notify user processing status
 */
export async function notifyStatus(
  chatId: string,
  userId: string,
  status: "processing" | "generating" | "complete" | "error",
  message?: string,
  requestId?: string,
) {
  const statusMessage: RealtimeMessage = {
    type: "status",
    userId,
    chatId,
    content: message || status,
    data: { status },
    timestamp: new Date().toISOString(),
    requestId,
  };

  broadcastToChat(chatId, statusMessage);
}

/**
 * Notify specific user
 */
export async function notifyUser(
  userId: string,
  title: string,
  message: string,
  actionUrl?: string,
) {
  const notification: RealtimeMessage = {
    type: "notification",
    userId,
    chatId: "",
    content: message,
    data: { title, actionUrl },
    timestamp: new Date().toISOString(),
  };

  broadcastToUser(userId, notification);
  logger.worker("realtime", "user_notified", { userId, title });
}

/**
 * Notify of file upload completion
 */
export async function notifyFileUploadComplete(
  userId: string,
  fileName: string,
  fileId: string,
  size: number,
) {
  await notifyUser(
    userId,
    "Upload Complete",
    `File "${fileName}" uploaded successfully (${formatFileSize(size)})`,
  );
}

/**
 * Notify of RAG ingestion completion
 */
export async function notifyRAGIngestionComplete(
  userId: string,
  fileName: string,
  documentsCount: number,
) {
  await notifyUser(
    userId,
    "Knowledge Base Updated",
    `"${fileName}" ingested with ${documentsCount} documents`,
  );
}

/**
 * Get active users in a chat
 */
export function getActiveUsersInChat(chatId: string): Set<string> {
  return getActiveConnections(chatId);
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Detect if message contains task request
 */
export function isTaskRequest(message: string): boolean {
  const taskKeywords = [
    "create",
    "generate",
    "write",
    "build",
    "design",
    "implement",
    "analyze",
    "review",
    "debug",
    "fix",
    "optimize",
    "refactor",
  ];

  const lowerMessage = message.toLowerCase();
  return taskKeywords.some((keyword) => lowerMessage.includes(keyword));
}

/**
 * Extract task context from message
 */
export function extractTaskContext(message: string): {
  taskType: string;
  language?: string;
  context?: string;
} {
  const languagePatterns: Record<string, string[]> = {
    python: ["python", "py", "django", "flask"],
    typescript: ["typescript", "ts", "react", "nextjs", "next.js"],
    javascript: ["javascript", "js", "node"],
    java: ["java", "spring", "maven"],
    cpp: ["c++", "cpp"],
    csharp: ["c#", "csharp", ".net"],
    go: ["golang", "go"],
    rust: ["rust"],
  };

  let detectedLanguage = "unknown";
  for (const [lang, patterns] of Object.entries(languagePatterns)) {
    if (patterns.some((p) => message.toLowerCase().includes(p))) {
      detectedLanguage = lang;
      break;
    }
  }

  const taskType = extractTaskType(message);

  return {
    taskType,
    language: detectedLanguage !== "unknown" ? detectedLanguage : undefined,
    context: message.slice(0, 200),
  };
}

/**
 * Extract task type from message
 */
function extractTaskType(message: string): string {
  const taskKeywords = {
    coding: ["write code", "implement", "create function", "build", "develop"],
    analysis: ["analyze", "review", "audit", "evaluate"],
    debugging: ["debug", "fix", "error", "issue"],
    documentation: ["document", "explain", "describe", "comment"],
    optimization: ["optimize", "improve", "refactor", "performance"],
    testing: ["test", "unit test", "test case", "coverage"],
  };

  const lowerMessage = message.toLowerCase();

  for (const [type, keywords] of Object.entries(taskKeywords)) {
    if (keywords.some((kw) => lowerMessage.includes(kw))) {
      return type;
    }
  }

  return "general";
}
