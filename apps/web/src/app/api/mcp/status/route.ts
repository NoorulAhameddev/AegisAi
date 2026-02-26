import { errorResponse, successResponse } from "@/lib/response";
import { mcpClient } from "@/lib/mcp-client";
import { logger } from "@/lib/logger";

/**
 * API Route: GET /api/mcp/status
 * Returns the status of MCP servers
 */
export async function GET() {
  try {
    const status = mcpClient.getStatus();

    return successResponse({ data: status });
  } catch (error) {
    logger.error("MCP status check error", error as Error);
    return errorResponse("Failed to get MCP status", { status: 500 });
  }
}
