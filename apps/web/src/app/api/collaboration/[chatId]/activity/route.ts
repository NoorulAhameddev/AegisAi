/**
 * GET /api/collaboration/[chatId]/activity
 * Get activity feed for a shared chat
 */

import { NextRequest } from 'next/server';
import { verifyAuth } from '@/services/auth/auth';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/response';
import { logger } from '@/lib/logger';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ chatId: string }> }
) {
    const requestId = req.headers.get('x-request-id') || '';
    
    try {
        const user = await verifyAuth(req);
        if (!user) return unauthorizedResponse({ requestId });

        const { chatId } = await params;
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Verify user has access to this chat
        const chat = await prisma.chat.findUnique({
            where: { id: chatId },
            include: {
                ChatPermission: {
                    where: { userId: user.id }
                }
            }
        });

        if (!chat) {
            return errorResponse('Chat not found', { status: 404, requestId });
        }

        const hasAccess = chat.userId === user.id || chat.ChatPermission.length > 0;
        if (!hasAccess) {
            return forbiddenResponse({ requestId });
        }

        // Get activity log
        const activities = await prisma.chatActivity.findMany({
            where: { chatId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });

        // Enrich with user names
        const enriched = await Promise.all(
            activities.map(async (activity) => {
                const userData = await prisma.user.findUnique({
                    where: { id: activity.userId },
                    select: { name: true, email: true }
                });

                return {
                    id: activity.id,
                    action: activity.action,
                    userName: userData?.name || 'Unknown User',
                    userEmail: userData?.email,
                    metadata: activity.metadata,
                    createdAt: activity.createdAt
                };
            })
        );

        // Get total count for pagination
        const totalCount = await prisma.chatActivity.count({
            where: { chatId }
        });

        return successResponse({
            activities: enriched,
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount
            }
        }, { requestId });

    } catch (error) {
        logger.error('Failed to get activity', error as Error, { requestId });
        return errorResponse('Failed to get activity', { status: 500, requestId });
    }
}
