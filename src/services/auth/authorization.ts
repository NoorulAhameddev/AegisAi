import { NextRequest } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/response";
import { isAdminRole } from "@/services/auth/permissions";

export async function requireAuth(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) {
        return { user: null, response: unauthorizedResponse() };
    }
    return { user, response: null };
}

export function requireAdmin(userRole: string) {
    if (!isAdminRole(userRole as any)) {
        return forbiddenResponse();
    }
    return null;
}
