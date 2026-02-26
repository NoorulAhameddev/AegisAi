import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/services/auth/auth";
import { updateProfileSchema } from "@/lib/validations";
import { parseBody } from "@/lib/request-validation";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";

export async function PUT(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return unauthorizedResponse();

  const { data, response } = await parseBody(req, updateProfileSchema);
  if (response) return response;

  const { name } = data;

  // Only update fields that are provided
  const dataToUpdate: any = {};
  if (name) dataToUpdate.name = name.trim();

  if (Object.keys(dataToUpdate).length === 0) {
    return successResponse({ message: "No changes needed" });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: dataToUpdate,
      select: { id: true, name: true, email: true },
    });

    return successResponse(updated);
  } catch (e) {
    logger.error("Update profile failed", e as Error, { userId: user.id });
    return errorResponse("Failed to update profile", { status: 500 });
  }
}
