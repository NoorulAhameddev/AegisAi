import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/encryption";

export async function GET(req: NextRequest) {
    const token = req.cookies.get("auth_access")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload: any;
    try {
        payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
    } catch (err) {
        return NextResponse.json({ error: "Invalid Token" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!chatId) {
        return NextResponse.json({ error: "Chat ID required" }, { status: 400 });
    }

    // Validate pagination params
    if (page < 1 || limit < 1 || limit > 100) {
        return NextResponse.json({ error: "Invalid pagination parameters" }, { status: 400 });
    }

    try {
        // Get total count for pagination metadata
        const totalCount = await prisma.message.count({
            where: {
                chatId,
                Chat: { userId: payload.userId }
            }
        });

        // Fetch paginated messages
        const messages = await prisma.message.findMany({
            where: {
                chatId,
                Chat: { userId: payload.userId } // Ensure user owns this chat
            },
            orderBy: { createdAt: "asc" },
            skip: (page - 1) * limit,
            take: limit,
        });

        // Decrypt messages before sending to frontend
        const decryptedMessages = messages.map(msg => {
            try {
                return {
                    ...msg,
                    content: decrypt(msg.content),
                    role: msg.role.toLowerCase() // Normalize role for frontend
                };
            } catch (error) {
                console.error(`[ChatHistory] Failed to decrypt message ${msg.id}:`, error);
                return {
                    ...msg,
                    content: "[Decryption Error]",
                    role: msg.role.toLowerCase()
                };
            }
        });

        // Return with pagination metadata
        return NextResponse.json({
            messages: decryptedMessages,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: page * limit < totalCount
            }
        });
    } catch (error) {
        console.error('[ChatHistory] Error fetching messages:', error);
        return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 });
    }
}
