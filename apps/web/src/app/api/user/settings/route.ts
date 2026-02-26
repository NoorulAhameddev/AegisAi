/**
 * User Settings API
 * Manage user preferences and settings
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/services/auth/auth";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/request-validation";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/response";
import { logger } from "@/lib/logger";

export interface UserSettings {
  userId: string;
  theme: "light" | "dark" | "auto";
  notifications: boolean;
  emailDigest: boolean;
  enableRAG: boolean;
  encryptStorage: boolean;
  autoIngest: boolean;
  language: string;
  metadata: Record<string, any>;
}

// GET user settings
export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult) {
      return unauthorizedResponse();
    }

    const userId = authResult.id;

    // Get or create settings from system settings
    let settings = await prisma.systemSetting.findUnique({
      where: { key: `user-settings:${userId}` },
    });

    if (!settings) {
      // Create default settings
      settings = await prisma.systemSetting.create({
        data: {
          key: `user-settings:${userId}`,
          value: JSON.stringify({
            theme: "dark",
            notifications: true,
            emailDigest: false,
            enableRAG: true,
            encryptStorage: true,
            autoIngest: true,
            language: "en",
            metadata: {},
          } as Omit<UserSettings, "userId">),
        },
      });
    }

    const settingsData = JSON.parse(settings.value);
    return successResponse({
      userId,
      ...settingsData,
    });
  } catch (error) {
    logger.error("Get settings error", error as Error);
    return errorResponse("Failed to fetch settings", { status: 500 });
  }
}

// PUT update user settings
export async function PUT(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult) {
      return unauthorizedResponse();
    }

    const userId = authResult.id;
    const settingsSchema = z.object({
      theme: z.enum(["light", "dark", "auto"]).optional(),
      notifications: z.boolean().optional(),
      emailDigest: z.boolean().optional(),
      enableRAG: z.boolean().optional(),
      encryptStorage: z.boolean().optional(),
      autoIngest: z.boolean().optional(),
      language: z.string().min(2).max(10).optional(),
      metadata: z.record(z.any()).optional(),
    });

    const { data, response } = await parseBody(req, settingsSchema);
    if (response) return response;

    // Validate settings
    const validSettings = {
      theme: data.theme || "dark",
      notifications:
        data.notifications !== undefined ? data.notifications : true,
      emailDigest: data.emailDigest !== undefined ? data.emailDigest : false,
      enableRAG: data.enableRAG !== undefined ? data.enableRAG : true,
      encryptStorage:
        data.encryptStorage !== undefined ? data.encryptStorage : true,
      autoIngest: data.autoIngest !== undefined ? data.autoIngest : true,
      language: data.language || "en",
      metadata: data.metadata || {},
    };

    // Update or create settings
    const settings = await prisma.systemSetting.upsert({
      where: { key: `user-settings:${userId}` },
      create: {
        key: `user-settings:${userId}`,
        value: JSON.stringify(validSettings),
      },
      update: {
        value: JSON.stringify(validSettings),
      },
    });

    const settingsData = JSON.parse(settings.value);
    return successResponse({
      userId,
      ...settingsData,
      success: true,
    });
  } catch (error) {
    logger.error("Update settings error", error as Error);
    return errorResponse("Failed to update settings", { status: 500 });
  }
}

// DELETE reset settings to default
export async function DELETE(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult) {
      return unauthorizedResponse();
    }

    const userId = authResult.id;

    await prisma.systemSetting
      .delete({
        where: { key: `user-settings:${userId}` },
      })
      .catch(() => {
        // Settings might not exist, that's OK
      });

    return successResponse({ success: true });
  } catch (error) {
    logger.error("Delete settings error", error as Error);
    return errorResponse("Failed to reset settings", { status: 500 });
  }
}
