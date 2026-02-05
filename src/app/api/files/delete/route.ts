import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";
import fs from "fs/promises";
import { verifyAuth } from "@/services/auth/auth";
import { logger } from "@/lib/logger";
import { parseBody } from "@/lib/request-validation";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response";

export async function DELETE(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse();

    const bodySchema = z.object({ fileId: z.string().min(1) });
    const { data, response } = await parseBody(req, bodySchema);
    if (response) return response;

    try {
        const file = await prisma.file.findUnique({
            where: { id: data.fileId }
        });

        if (!file || file.userId !== user.id) {
            return errorResponse("File not found or access denied", { status: 404 });
        }

        // Delete from DB
        await prisma.file.delete({ where: { id: data.fileId } });

        // Try delete from disk (ignore error if missing)
        try {
            await fs.unlink(file.path);
        } catch (e) {
            logger.warn("File could not be deleted from disk", { fileId: file.id });
        }

        return successResponse({ success: true });
    } catch (error) {
        logger.error("File delete failed", error as Error, { userId: user.id });
        return errorResponse("Action failed", { status: 500 });
    }
}
