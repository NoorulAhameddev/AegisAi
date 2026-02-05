import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, comparePassword, verifyAuth } from "@/services/auth/auth";
import { changePasswordSchema } from "@/lib/validations";
import { parseBody } from "@/lib/request-validation";
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/response";

export async function PUT(req: NextRequest) {
    const session = await verifyAuth(req);
    if (!session) return unauthorizedResponse();

    const { data, response } = await parseBody(req, changePasswordSchema);
    if (response) return response;

    const { currentPassword, newPassword } = data;

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return errorResponse("User not found", { status: 404 });

    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) {
        return errorResponse("Incorrect current password", { status: 400 });
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
        where: { id: session.id },
        data: { password: hashedPassword }
    });

    return successResponse({ message: "Password updated successfully" });
}
