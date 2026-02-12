import { NextRequest } from 'next/server';
import { verifyAuth } from '@/services/auth/auth';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response';
import { getCacheStats, clearUserCache } from '@/services/rag/semantic-cache';

/**
 * GET /api/rag/cache-stats
 * Get semantic cache statistics
 */
export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return unauthorizedResponse({ requestId: req.headers.get('x-request-id') || undefined });
        }

        const stats = await getCacheStats();

        return successResponse(
            {
                ...stats,
                timestamp: new Date().toISOString(),
            },
            {
                requestId: req.headers.get('x-request-id') || undefined,
            }
        );
    } catch (error) {
        return errorResponse(
            'Failed to retrieve cache statistics',
            {
                status: 500,
                requestId: req.headers.get('x-request-id') || undefined,
            }
        );
    }
}

/**
 * DELETE /api/rag/cache-stats
 * Clear user's semantic cache
 */
export async function DELETE(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return unauthorizedResponse({ requestId: req.headers.get('x-request-id') || undefined });
        }

        const cleared = await clearUserCache(user.id);

        return successResponse(
            {
                message: 'Cache cleared successfully',
                entriesCleared: cleared,
            },
            {
                requestId: req.headers.get('x-request-id') || undefined,
            }
        );
    } catch (error) {
        return errorResponse(
            'Failed to clear cache',
            {
                status: 500,
                requestId: req.headers.get('x-request-id') || undefined,
            }
        );
    }
}
