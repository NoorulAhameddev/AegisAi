import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/services/auth/auth";
import { getSettings, saveSettings } from "@/lib/settings";
import { parseBody } from "@/lib/request-validation";
import { errorResponse, forbiddenResponse, successResponse, unauthorizedResponse } from "@/lib/response";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse();

    const { hasPermission } = await import("@/services/auth/rbac");
    if (!hasPermission(user.role as any, "settings:manage")) return forbiddenResponse();

    return successResponse(getSettings());
}

export async function POST(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse();

    const { hasPermission } = await import("@/services/auth/rbac");
    if (!hasPermission(user.role as any, "settings:manage")) return forbiddenResponse();

    const bodySchema = z.object({
        allowRegistrations: z.boolean().optional(),
        maintenanceMode: z.boolean().optional(),
    });
    const { data, response } = await parseBody(req, bodySchema);
    if (response) return response;

    const current = getSettings();
    const newSettings = { ...current, ...data };

    try {
        saveSettings(newSettings);
        return successResponse(newSettings);
    } catch (error) {
        logger.error("Admin settings update failed", error as Error, { adminId: user.id });
        return errorResponse("Failed to update settings", { status: 500 });
    }
}
