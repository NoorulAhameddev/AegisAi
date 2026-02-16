import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { prisma, withTransaction } from "@/lib/prisma";
import { readPrisma } from "@/lib/read-replicas";
import { z } from "zod";
import { parseBody } from "@/lib/request-validation";
import { errorResponse, successResponse, unauthorizedResponse, forbiddenResponse } from "@/lib/response";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/admin/feature-flags - List all feature flags
 * POST /api/admin/feature-flags - Create/update feature flag
 * PATCH /api/admin/feature-flags/:name - Enable/disable feature flag
 */

export async function GET(req: NextRequest) {
    try {
        // Rate limiting: 100 req/min for admin operations
        const rateLimitResult = await rateLimit(req, { limit: 100, window: 60 });
        if (!rateLimitResult.success) {
            return errorResponse("Rate limit exceeded", { status: 429 });
        }

        const user = await verifyAuth(req);
        if (!user) return unauthorizedResponse();

        // Check if user is admin
        if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
            return forbiddenResponse();
        }

        const flags = await readPrisma.featureFlag.findMany({
            orderBy: { name: "asc" },
        });

        return successResponse(flags);
    } catch (error) {
        logger.error("Failed to fetch feature flags", error as Error);
        return errorResponse("Failed to fetch feature flags", { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // Rate limiting: 100 req/min for admin operations
        const rateLimitResult = await rateLimit(req, { limit: 100, window: 60 });
        if (!rateLimitResult.success) {
            return errorResponse("Rate limit exceeded", { status: 429 });
        }

        const user = await verifyAuth(req);
        if (!user) return unauthorizedResponse();

        // Check if user is admin
        if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
            return forbiddenResponse();
        }

        const bodySchema = z.object({
            name: z.string().min(1),
            enabled: z.boolean(),
            description: z.string().optional(),
            rolloutPercentage: z.number().int().min(0).max(100).optional(),
        });

        const { data, response } = await parseBody(req, bodySchema);
        if (response) return response;

        const [flag] = await withTransaction([
            prisma.featureFlag.upsert({
                where: { name: data.name },
                update: {
                    enabled: data.enabled,
                    description: data.description,
                    rolloutPercentage: data.rolloutPercentage,
                    updatedAt: new Date(),
                },
                create: {
                    name: data.name,
                    enabled: data.enabled,
                    description: data.description,
                    rolloutPercentage: data.rolloutPercentage,
                },
            }),
            prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: `FEATURE_FLAG_UPDATE:${data.name}`,
                    metadata: { enabled: data.enabled, rolloutPercentage: data.rolloutPercentage },
                },
            })
        ], { userId: user.id, action: 'feature-flag-update' });

        // Invalidate cache by waiting a moment
        await new Promise(resolve => setTimeout(resolve, 100));

        return successResponse(flag, { message: "Feature flag updated" });
    } catch (error) {
        logger.error("Failed to update feature flag", error as Error, { userId: user?.id });
        return errorResponse("Failed to update feature flag", { status: 500 });
    }
}
