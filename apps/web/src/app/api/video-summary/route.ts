import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { generateVideoSummary } from "@/services/orchestration/video-summary-orchestrator";

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) return unauthorizedResponse();

    const { youtubeUrl, projectId } = await req.json();
    if (!youtubeUrl)
      return errorResponse("Missing YouTube URL", { status: 400 });

    const summary = await generateVideoSummary(youtubeUrl, user.id, projectId);
    return successResponse(summary);
  } catch (error) {
    return errorResponse("Video summary failed", { status: 500 });
  }
}
