import { NextRequest } from "next/server";
import { z } from "zod";
import { chatQueue } from "@/lib/queue";
import { verifyAuth } from "@/services/auth/auth";
import { parseQuery } from "@/lib/request-validation";
import { errorResponse, forbiddenResponse, successResponse, unauthorizedResponse } from "@/lib/response";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse();

    const querySchema = z.object({ jobId: z.string().min(1) });
    const { data, response } = parseQuery(new URL(req.url), querySchema);
    if (response) return response;

    const jobId = data.jobId;

    const job = await chatQueue.getJob(jobId);
    if (!job) return errorResponse("Job not found", { status: 404 });

    const state = await job.getState();
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    // Verify ownership? Ideally job has userId.
    if (job.data.userId !== user.id) {
        return forbiddenResponse();
    }

    try {
        return successResponse({
            jobId,
            state,
            result,
            error: failedReason,
        });
    } catch (error) {
        logger.error("Chat status failed", error as Error, { userId: user.id, jobId });
        return errorResponse("Failed to fetch status", { status: 500 });
    }
}
