/**
 * Image Storage Service
 * Handles image upload, storage, and retrieval with support for multiple backends
 */

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { logger } from "@/lib/logger";
import { encrypt, decrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { notifyFileUploadComplete } from "@/services/realtime";

export interface StorageConfig {
  type: "local" | "s3" | "azure" | "gcs";
  bucket?: string;
  region?: string;
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
}

export interface ImageMetadata {
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  hash: string;
  uploadedAt: Date;
  uploadedBy: string;
}

// Default storage config (local filesystem)
const defaultConfig: StorageConfig = {
  type: "local",
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/tiff",
    "image/bmp",
  ],
};

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "images");

/**
 * Initialize storage (ensure directories exist)
 */
export async function initializeStorage() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    logger.worker("storage", "initialized", { dir: UPLOADS_DIR });
  } catch (error) {
    logger.error("Failed to initialize storage", error as Error);
    throw error;
  }
}

/**
 * Upload image to storage
 */
export async function uploadImage(
  userId: string,
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  config: StorageConfig = defaultConfig,
): Promise<{ fileId: string; path: string; metadata: ImageMetadata }> {
  try {
    // Validate
    if (!config.allowedMimeTypes.includes(mimeType)) {
      throw new Error(`File type ${mimeType} not allowed`);
    }

    if (fileBuffer.length > config.maxFileSize) {
      throw new Error(
        `File exceeds maximum size of ${config.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Generate unique filename
    const fileId = `img_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
    const ext = path.extname(originalName);
    const fileName = sanitizeFilename(fileId + ext);
    const filePath = path.join(UPLOADS_DIR, fileName);

    // Calculate hash
    const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    // Store file
    if (config.type === "local") {
      await fs.writeFile(filePath, fileBuffer);
    } else {
      // TODO: Implement S3/Azure/GCS storage
      throw new Error("Only local storage is currently supported");
    }

    // Create database record
    const metadata: ImageMetadata = {
      originalName,
      mimeType,
      size: fileBuffer.length,
      hash,
      uploadedAt: new Date(),
      uploadedBy: userId,
    };

    const encryptedPath = await encrypt(filePath);

    const fileRecord = await prisma.imageFile.create({
      data: {
        userId,
        fileId,
        fileName,
        mimeType,
        size: fileBuffer.length,
        hash,
        filePath: encryptedPath,
        metadata: metadata as unknown as Prisma.InputJsonValue,
      },
    });

    // Notify user
    await notifyFileUploadComplete(
      userId,
      originalName,
      fileRecord.id,
      fileBuffer.length,
    );

    logger.worker("storage:upload", "success", {
      userId,
      fileId,
      size: fileBuffer.length,
    });

    return {
      fileId: fileRecord.id,
      path: filePath,
      metadata,
    };
  } catch (error) {
    logger.error("Image upload failed", error as Error, { userId });
    throw error;
  }
}

/**
 * Retrieve image from storage
 */
export async function getImage(
  imageId: string,
  userId: string,
): Promise<Buffer> {
  try {
    const imageFile = await prisma.imageFile.findUnique({
      where: { id: imageId },
    });

    if (!imageFile) {
      throw new Error("Image not found");
    }

    // Verify ownership
    if (imageFile.userId !== userId) {
      throw new Error("Access denied");
    }

    // Decrypt path
    const decryptedPath = await decrypt(imageFile.filePath);

    // Read file
    const buffer = await fs.readFile(decryptedPath);

    logger.worker("storage:retrieve", "success", { userId, imageId });

    return buffer;
  } catch (error) {
    logger.error("Failed to retrieve image", error as Error, {
      imageId,
      userId,
    });
    throw error;
  }
}

/**
 * Delete image from storage
 */
export async function deleteImage(imageId: string, userId: string) {
  try {
    const imageFile = await prisma.imageFile.findUnique({
      where: { id: imageId },
    });

    if (!imageFile) {
      throw new Error("Image not found");
    }

    // Verify ownership
    if (imageFile.userId !== userId) {
      throw new Error("Access denied");
    }

    // Delete from filesystem
    const decryptedPath = await decrypt(imageFile.filePath);
    await fs.unlink(decryptedPath).catch(() => {
      // File might already be deleted
    });

    // Mark as deleted in database
    await prisma.imageFile.update({
      where: { id: imageId },
      data: { deletedAt: new Date() },
    });

    logger.worker("storage:delete", "success", { userId, imageId });
  } catch (error) {
    logger.error("Failed to delete image", error as Error, { imageId, userId });
    throw error;
  }
}

/**
 * List user's images
 */
export async function getUserImages(
  userId: string,
  limit: number = 50,
  offset: number = 0,
) {
  try {
    const images = await prisma.imageFile.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: { uploadedAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        size: true,
        hash: true,
        uploadedAt: true,
        metadata: true,
      },
    });

    return images;
  } catch (error) {
    logger.error("Failed to list images", error as Error, { userId });
    return [];
  }
}

/**
 * Check duplicate images using hash
 */
export async function findDuplicateImages(
  userId: string,
  hash: string,
): Promise<any[] | null> {
  try {
    const duplicates = await prisma.imageFile.findMany({
      where: {
        userId,
        hash,
        deletedAt: null,
      },
    });

    return duplicates.length > 0 ? duplicates : null;
  } catch (error) {
    logger.error("Failed to check duplicates", error as Error);
    return null;
  }
}

/**
 * Get image statistics for user
 */
export async function getUserImageStats(userId: string) {
  try {
    const [totalImages, totalSize] = await Promise.all([
      prisma.imageFile.count({
        where: { userId, deletedAt: null },
      }),
      prisma.imageFile.aggregate({
        where: { userId, deletedAt: null },
        _sum: { size: true },
      }),
    ]);

    return {
      totalImages,
      totalSize: totalSize._sum?.size || 0,
      avgSize: totalImages > 0 ? (totalSize._sum?.size || 0) / totalImages : 0,
    };
  } catch (error) {
    logger.error("Failed to get image stats", error as Error, { userId });
    return { totalImages: 0, totalSize: 0, avgSize: 0 };
  }
}

/**
 * Cleanup old/deleted images (garbage collection)
 */
export async function cleanupDeletedImages(daysOld: number = 30) {
  try {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const deletedImages = await prisma.imageFile.findMany({
      where: {
        deletedAt: { lt: cutoffDate },
      },
    });

    for (const image of deletedImages) {
      try {
        const decryptedPath = await decrypt(image.filePath);
        await fs.unlink(decryptedPath).catch(() => {});
        await prisma.imageFile.delete({ where: { id: image.id } });
      } catch (err) {
        logger.error("Failed to cleanup image", err as Error, {
          imageId: image.id,
        });
      }
    }

    logger.worker("storage:cleanup", "success", {
      imagesDeleted: deletedImages.length,
    });
    return deletedImages.length;
  } catch (error) {
    logger.error("Image cleanup failed", error as Error);
    return 0;
  }
}

/**
 * Sanitize filename
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^\w.-]/g, "_")
    .replace(/\s+/g, "_")
    .substring(0, 255);
}
