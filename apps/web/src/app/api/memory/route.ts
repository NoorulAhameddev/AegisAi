import { errorResponse, successResponse } from "@/lib/response";
import { getUserMemory } from "@/ai/memory/memory";
import { verifyAuth } from "@/services/auth/auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult) {
      return errorResponse("Authentication required", { status: 401 });
    }

    const memory = await getUserMemory(authResult.id);
    return successResponse(memory);
  } catch (error) {
    return errorResponse("Authentication required", { status: 401 });
  }
}
