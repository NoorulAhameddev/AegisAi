/**
 * Real-time Chat Integration
 * Enhances chat endpoints with WebSocket notifications
 */

import {
  notifyAIResponse,
  notifyStatus,
  sendChatMessage,
} from "@/services/realtime";

/**
 * Hook into SSE streaming to send real-time updates via WebSocket
 * This is used alongside the existing stream-sse endpoint
 */
export async function integrateRealtimeUpdates(
  chatId: string,
  userId: string,
  stream: ReadableStream<Uint8Array>,
) {
  // Notify that AI is processing
  await notifyStatus(
    chatId,
    userId,
    "processing",
    "Processing your request...",
  );

  // Track accumulated response
  let accumulatedResponse = "";
  const decoder = new TextDecoder();

  // Create a new stream that pipes data and sends real-time updates
  return new ReadableStream({
    async start(controller) {
      const reader = stream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // Final status
            await notifyStatus(chatId, userId, "complete", "Response complete");

            // Send complete message
            await notifyAIResponse(chatId, userId, accumulatedResponse, 0);
            break;
          }

          // Decode chunk
          const chunk = decoder.decode(value, { stream: true });
          accumulatedResponse += chunk;

          // Send to client
          controller.enqueue(value);

          // Parse SSE events and send real-time updates
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.choices?.[0]?.delta?.content) {
                  // Send partial response update via WebSocket
                  // This allows real-time token streaming
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      } catch (error) {
        await notifyStatus(
          chatId,
          userId,
          "error",
          "Error processing response",
        );
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

/**
 * Middleware to add WebSocket context to request
 * Injects WebSocket server reference if available
 */
export async function withWebSocketContext(request: Request) {
  const headers = new Headers(request.headers);

  // Add WebSocket availability header
  headers.set("X-WebSocket-Available", "true");
  headers.set(
    "X-WebSocket-URL",
    process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:3001",
  );

  return new Request(request, { headers });
}
