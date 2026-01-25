import { NextResponse } from 'next/server';
import { mcpClient } from '@/lib/mcp-client';

/**
 * API Route: GET /api/mcp/status
 * Returns the status of MCP servers
 */
export async function GET() {
  try {
    const status = mcpClient.getStatus();
    
    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('MCP status check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get MCP status'
      },
      { status: 500 }
    );
  }
}
