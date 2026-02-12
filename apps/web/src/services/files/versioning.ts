/**
 * File Versioning Service
 * Tracks file changes and allows rollback to previous versions
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { encrypt, decrypt } from '@/lib/encryption';
import fs from 'fs/promises';
import path from 'path';

export interface FileVersion {
  id: string;
  fileId: string;
  versionNumber: number;
  fileName: string;
  mimeType: string;
  size: number;
  hash: string;
  createdBy: string;
  createdAt: Date;
  changeLog?: string;
  isCurrentVersion: boolean;
}

const VERSIONS_DIR = path.join(process.cwd(), 'uploads', 'versions');

/**
 * Initialize versioning system
 */
export async function initializeVersioning() {
  try {
    await fs.mkdir(VERSIONS_DIR, { recursive: true });
    logger.worker('versioning', 'initialized', { dir: VERSIONS_DIR });
  } catch (error) {
    logger.error('Failed to initialize versioning', error as Error);
  }
}

/**
 * Create new version of a file
 */
export async function createFileVersion(
  userId: string,
  fileId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  changeLog?: string
): Promise<FileVersion> {
  try {
    // Get current file to find next version number
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new Error('File not found');
    }

    // Verify ownership
    if (file.userId !== userId) {
      throw new Error('Access denied');
    }

    const versionNumber = (file.version || 0) + 1;

    // Generate version path
    const versionId = `v${versionNumber}_${Date.now()}`;
    const versionFileName = `${fileId}_${versionId}`;
    const versionPath = path.join(VERSIONS_DIR, versionFileName);

    // Save version file
    await fs.writeFile(versionPath, fileBuffer);

    // Calculate hash
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Create version record
    const encryptedPath = await encrypt(versionPath);

    const version = await prisma.fileVersion.create({
      data: {
        fileId,
        versionNumber,
        fileName,
        mimeType,
        size: fileBuffer.length,
        hash,
        filePath: encryptedPath,
        createdBy: userId,
        changeLog: changeLog || `Version ${versionNumber}`,
        isCurrentVersion: true,
      },
    });

    // Mark previous versions as non-current
    await prisma.fileVersion.updateMany({
      where: {
        fileId,
        id: { not: version.id },
      },
      data: { isCurrentVersion: false },
    });

    // Update file version counter
    await prisma.file.update({
      where: { id: fileId },
      data: { version: versionNumber },
    });

    logger.worker('versioning:create', 'success', {
      fileId,
      versionNumber,
      size: fileBuffer.length,
    });

    return {
      id: version.id,
      fileId,
      versionNumber,
      fileName,
      mimeType,
      size: fileBuffer.length,
      hash,
      createdBy: userId,
      createdAt: version.createdAt,
      changeLog,
      isCurrentVersion: true,
    };
  } catch (error) {
    logger.error('Failed to create file version', error as Error, { fileId, userId });
    throw error;
  }
}

/**
 * Get all versions of a file
 */
export async function getFileVersions(
  fileId: string,
  userId: string,
  limit: number = 50
): Promise<FileVersion[]> {
  try {
    // Verify file ownership
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.userId !== userId) {
      throw new Error('Access denied');
    }

    const versions = await prisma.fileVersion.findMany({
      where: { fileId },
      orderBy: { versionNumber: 'desc' },
      take: limit,
    });

    return versions.map((v: any) => ({
      id: v.id,
      fileId: v.fileId,
      versionNumber: v.versionNumber,
      fileName: v.fileName,
      mimeType: v.mimeType,
      size: v.size,
      hash: v.hash,
      createdBy: v.createdBy,
      createdAt: v.createdAt,
      changeLog: v.changeLog,
      isCurrentVersion: v.isCurrentVersion,
    }));
  } catch (error) {
    logger.error('Failed to get file versions', error as Error, { fileId });
    return [];
  }
}

/**
 * Rollback to specific version
 */
export async function rollbackToVersion(
  fileId: string,
  versionId: string,
  userId: string
): Promise<FileVersion> {
  try {
    // Verify file ownership
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.userId !== userId) {
      throw new Error('Access denied');
    }

    // Get the version to rollback to
    const targetVersion = await prisma.fileVersion.findUnique({
      where: { id: versionId },
    });

    if (!targetVersion || targetVersion.fileId !== fileId) {
      throw new Error('Version not found');
    }

    // Read the old version file
    const decryptedPath = await decrypt(targetVersion.filePath);
    const fileBuffer = await fs.readFile(decryptedPath);

    // Create new version from old content
    const newVersion = await createFileVersion(
      userId,
      fileId,
      fileBuffer,
      targetVersion.fileName,
      targetVersion.mimeType,
      `Rollback from version ${targetVersion.versionNumber}`
    );

    logger.worker('versioning:rollback', 'success', {
      fileId,
      fromVersion: targetVersion.versionNumber,
      toVersion: newVersion.versionNumber,
    });

    return newVersion;
  } catch (error) {
    logger.error('Failed to rollback version', error as Error, { fileId, versionId });
    throw error;
  }
}

/**
 * Delete specific version (keep at least one)
 */
export async function deleteFileVersion(
  fileId: string,
  versionId: string,
  userId: string
) {
  try {
    // Verify file ownership
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.userId !== userId) {
      throw new Error('Access denied');
    }

    // Get version
    const version = await prisma.fileVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new Error('Version not found');
    }

    // Prevent deleting the only version
    const versionCount = await prisma.fileVersion.count({
      where: { fileId },
    });

    if (versionCount <= 1) {
      throw new Error('Cannot delete the only version of a file');
    }

    // Delete physical file
    try {
      const decryptedPath = await decrypt(version.filePath);
      await fs.unlink(decryptedPath).catch(() => {});
    } catch (err) {
      logger.error('Failed to delete version file', err as Error);
    }

    // Delete version record
    await prisma.fileVersion.delete({
      where: { id: versionId },
    });

    logger.worker('versioning:delete', 'success', {
      fileId,
      versionNumber: version.versionNumber,
    });
  } catch (error) {
    logger.error('Failed to delete version', error as Error, { fileId, versionId });
    throw error;
  }
}

/**
 * Clean up old versions (keep only last N versions)
 */
export async function cleanupOldVersions(fileId: string, keepCount: number = 10) {
  try {
    const versions = await prisma.fileVersion.findMany({
      where: { fileId },
      orderBy: { versionNumber: 'desc' },
      skip: keepCount,
    });

    for (const version of versions) {
      try {
        const decryptedPath = await decrypt(version.filePath);
        await fs.unlink(decryptedPath).catch(() => {});

        await prisma.fileVersion.delete({
          where: { id: version.id },
        });
      } catch (err) {
        logger.error('Failed to cleanup version', err as Error, { versionId: version.id });
      }
    }

    logger.worker('versioning:cleanup', 'success', {
      fileId,
      versionsDeleted: versions.length,
    });

    return versions.length;
  } catch (error) {
    logger.error('Version cleanup failed', error as Error, { fileId });
    return 0;
  }
}

/**
 * Compare two versions (returns diff summary)
 */
export async function compareVersions(
  fileId: string,
  versionId1: string,
  versionId2: string,
  userId: string
) {
  try {
    // Verify ownership
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.userId !== userId) {
      throw new Error('Access denied');
    }

    const v1 = await prisma.fileVersion.findUnique({
      where: { id: versionId1 },
    });

    const v2 = await prisma.fileVersion.findUnique({
      where: { id: versionId2 },
    });

    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }

    return {
      version1: {
        number: v1.versionNumber,
        size: v1.size,
        hash: v1.hash,
        createdAt: v1.createdAt,
      },
      version2: {
        number: v2.versionNumber,
        size: v2.size,
        hash: v2.hash,
        createdAt: v2.createdAt,
      },
      sizeDifference: v2.size - v1.size,
      hashDifferent: v1.hash !== v2.hash,
      changeLog1: v1.changeLog,
      changeLog2: v2.changeLog,
    };
  } catch (error) {
    logger.error('Failed to compare versions', error as Error);
    throw error;
  }
}
