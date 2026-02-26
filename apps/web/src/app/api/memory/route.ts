import { errorResponse, successResponse } from "@/lib/response";
import { getUserMemory } from "@/ai/memory/memory";

export async function GET(req: Request) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return errorResponse("Missing userId", { status: 400 });

  const memory = await getUserMemory(userId);
  return successResponse(memory);
}
