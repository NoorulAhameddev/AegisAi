import { errorResponse, successResponse } from "@/lib/response";

/**
 * API Route: GET /api/mcp/status
 * MCP integration is not implemented.
 * All MCP tool calls return null (placeholder).
 * This endpoint returns a clear "not available" response.
 */
export async function GET() {
  return successResponse({
    available: false,
    message: "MCP (Model Context Protocol) integration is not implemented.",
    servers: [],
  });
}
