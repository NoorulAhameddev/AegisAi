/**
 * Chat Analytics - Real-Time Stream API
 *
 * GET /api/admin/analytics/chat/stream
 *
 * Returns Server-Sent Events stream with live metrics
 * Updates every 5 seconds
 */

import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { hasAdminPermission } from "@/services/auth/permissions";
import { logger } from "@/lib/logger";
import { getLiveMetrics } from "@/services/analytics/chat-analytics";

export async function GET(req: NextRequest) {
  try {
    // Authentication
    const user = await verifyAuth(req);
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Authorization: ANALYTICS_VIEW permission
    if (!hasAdminPermission(user.role, "ANALYTICS_VIEW")) {
      return new Response("Forbidden", { status: 403 });
    }

    logger.info("[Analytics] SSE stream connected", { userId: user.id });

    // Create SSE stream
    const encoder = new TextEncoder();
    let intervalId: NodeJS.Timeout;
    let isActive = true;
    let inactivityTimer: NodeJS.Timeout;

    const stream = new ReadableStream({
      async start(controller) {
        // Reset inactivity timer on each send
        const resetInactivityTimer = () => {
          if (inactivityTimer) {
            clearTimeout(inactivityTimer);
          }
          inactivityTimer = setTimeout(
            () => {
              logger.info("[Analytics] SSE stream closed due to inactivity", {
                userId: user.id,
              });
              isActive = false;
              if (intervalId) clearInterval(intervalId);
              controller.close();
            },
            5 * 60 * 1000,
          ); // 5 minutes
        };

        // Send initial metrics immediately
        try {
          const metrics = await getLiveMetrics();
          const data = `data: ${JSON.stringify(metrics)}\n\n`;
          controller.enqueue(encoder.encode(data));
          resetInactivityTimer();
        } catch (error) {
          logger.error(
            "[Analytics] Failed to fetch initial metrics",
            error as Error,
          );
        }

        // Set up interval to send metrics every 5 seconds
        intervalId = setInterval(async () => {
          if (!isActive) {
            clearInterval(intervalId);
            return;
          }

          try {
            const metrics = await getLiveMetrics();
            const data = `data: ${JSON.stringify(metrics)}\n\n`;
            controller.enqueue(encoder.encode(data));
            resetInactivityTimer();
          } catch (error) {
            logger.error(
              "[Analytics] Failed to fetch live metrics",
              error as Error,
            );
            // Send error event
            const errorData = `event: error\ndata: ${JSON.stringify({ error: "Failed to fetch metrics" })}\n\n`;
            controller.enqueue(encoder.encode(errorData));
          }
        }, 5000);

        // Send keepalive comment every 30 seconds
        const keepaliveInterval = setInterval(() => {
          if (!isActive) {
            clearInterval(keepaliveInterval);
            return;
          }
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        }, 30000);
      },
      cancel() {
        logger.info("[Analytics] SSE stream cancelled", { userId: user.id });
        isActive = false;
        if (intervalId) clearInterval(intervalId);
        if (inactivityTimer) clearTimeout(inactivityTimer);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });
  } catch (error) {
    logger.error("[Analytics] SSE stream error", error as Error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
