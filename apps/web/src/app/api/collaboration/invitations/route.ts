/**
 * POST /api/collaboration/invitations/accept
 * Accept a chat invitation
 * 
 * GET /api/collaboration/invitations
 * Get user's pending invitations
 */

import { NextRequest } from 'next/server';
import { verifyAuth } from '@/services/auth/auth';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    const requestId = req.headers.get('x-request-id') || '';
    
    try {
        const user = await verifyAuth(req);
        if (!user) return unauthorizedResponse({ requestId });

        const body = await req.json();
        const { invitationId, chatId, shareToken } = body;

        // Accept via invitation ID
        if (invitationId) {
            const invitation = await prisma.chatInvitation.findUnique({
                where: { id: invitationId }
            });

            if (!invitation) {
                return errorResponse('Invitation not found', { status: 404, requestId });
            }

            if (invitation.status !== 'pending') {
                return errorResponse('Invitation already processed', { status: 400, requestId });
            }

            if (new Date() > invitation.expiresAt) {
                return errorResponse('Invitation expired', { status: 400, requestId });
            }

            // Verify email matches
            const userRecord = await prisma.user.findUnique({ where: { id: user.id } });
            if (userRecord?.email.toLowerCase() !== invitation.inviteeEmail.toLowerCase()) {
                return errorResponse('Invitation not for this user', { status: 403, requestId });
            }

            // Create permission
            await prisma.chatPermission.create({
                data: {
                    chatId: invitation.chatId,
                    userId: user.id,
                    role: 'VIEWER',
                    invitedBy: invitation.inviterId
                }
            });

            // Update invitation status
            await prisma.chatInvitation.update({
                where: { id: invitationId },
                data: {
                    status: 'accepted',
                    acceptedAt: new Date()
                }
            });

            // Log activity
            await prisma.chatActivity.create({
                data: {
                    chatId: invitation.chatId,
                    userId: user.id,
                    action: 'accepted_invitation'
                }
            });

            logger.info('Invitation accepted', { invitationId, userId: user.id, requestId });

            return successResponse({
                chatId: invitation.chatId,
                message: 'Invitation accepted'
            }, { requestId });
        }

        // Accept via share token
        if (chatId && shareToken) {
            const chat = await prisma.chat.findUnique({
                where: { id: chatId }
            });

            if (!chat) {
                return errorResponse('Chat not found', { status: 404, requestId });
            }

            if (chat.shareToken !== shareToken) {
                return errorResponse('Invalid share token', { status: 403, requestId });
            }

            // Check if already has access
            const existing = await prisma.chatPermission.findUnique({
                where: {
                    chatId_userId: {
                        chatId,
                        userId: user.id
                    }
                }
            });

            if (existing) {
                return successResponse({
                    chatId,
                    message: 'Already have access',
                    role: existing.role
                }, { requestId });
            }

            // Grant VIEWER access via share link
            await prisma.chatPermission.create({
                data: {
                    chatId,
                    userId: user.id,
                    role: 'VIEWER'
                }
            });

            // Log activity
            await prisma.chatActivity.create({
                data: {
                    chatId,
                    userId: user.id,
                    action: 'joined_via_link'
                }
            });

            logger.info('User joined via share link', { chatId, userId: user.id, requestId });

            return successResponse({
                chatId,
                message: 'Access granted',
                role: 'VIEWER'
            }, { requestId });
        }

        return errorResponse('Either invitationId or chatId+shareToken required', { status: 400, requestId });

    } catch (error) {
        logger.error('Failed to accept invitation', error as Error, { requestId });
        return errorResponse('Failed to accept invitation', { status: 500, requestId });
    }
}

export async function GET(req: NextRequest) {
    const requestId = req.headers.get('x-request-id') || '';
    
    try {
        const user = await verifyAuth(req);
        if (!user) return unauthorizedResponse({ requestId });

        // Get user's email
        const userRecord = await prisma.user.findUnique({
            where: { id: user.id },
            select: { email: true }
        });

        if (!userRecord) {
            return errorResponse('User not found', { status: 404, requestId });
        }

        // Get pending invitations
        const invitations = await prisma.chatInvitation.findMany({
            where: {
                inviteeEmail: userRecord.email.toLowerCase(),
                status: 'pending',
                expiresAt: {
                    gt: new Date()
                }
            },
            include: {
                Chat: {
                    select: {
                        id: true,
                        title: true,
                        User: {
                            select: { name: true, email: true }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const formatted = invitations.map(inv => ({
            id: inv.id,
            chatId: inv.chatId,
            chatTitle: inv.Chat.title || 'Untitled Chat',
            inviterName: inv.Chat.User.name,
            inviterEmail: inv.Chat.User.email,
            message: inv.message,
            createdAt: inv.createdAt,
            expiresAt: inv.expiresAt
        }));

        return successResponse({ invitations: formatted }, { requestId });

    } catch (error) {
        logger.error('Failed to get invitations', error as Error, { requestId });
        return errorResponse('Failed to get invitations', { status: 500, requestId });
    }
}
