/**
 * User Settings API
 * Manage user preferences and settings
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/services/auth/auth";
import { prisma } from "@/lib/prisma";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json({
      userId,
      ...settingsData,
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT update user settings
export async function PUT(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authResult.id;
    const body = await req.json();

    // Validate settings
    const validSettings = {
      theme: body.theme || "dark",
      notifications: body.notifications !== undefined ? body.notifications : true,
      emailDigest: body.emailDigest !== undefined ? body.emailDigest : false,
      enableRAG: body.enableRAG !== undefined ? body.enableRAG : true,
      encryptStorage: body.encryptStorage !== undefined ? body.encryptStorage : true,
      autoIngest: body.autoIngest !== undefined ? body.autoIngest : true,
      language: body.language || "en",
      metadata: body.metadata || {},
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
    return NextResponse.json({
      userId,
      ...settingsData,
      success: true,
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update settings" },
      { status: 500 }
    );
  }
}

// DELETE reset settings to default
export async function DELETE(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authResult.id;

    await prisma.systemSetting.delete({
      where: { key: `user-settings:${userId}` },
    }).catch(() => {
      // Settings might not exist, that's OK
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete settings error:", error);
    return NextResponse.json(
      { error: "Failed to reset settings" },
      { status: 500 }
    );
  }
}
