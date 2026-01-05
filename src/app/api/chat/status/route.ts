import { NextRequest, NextResponse } from "next/server";
import { chatQueue } from "@/lib/queue";
import { getUserFromRequest } from "@/lib/session";

export async function GET(req: NextRequest) {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

    const job = await chatQueue.getJob(jobId);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const state = await job.getState();
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    // Verify ownership? Ideally job has userId.
    if (job.data.userId !== user.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
        jobId,
        state,
        result,
        error: failedReason
    });
}
