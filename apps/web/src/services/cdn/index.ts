/**
 * CDN Integration Service
 * Handles caching, distribution, and optimization of images/files
 */

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export interface CDNConfig {
  type: "cloudflare" | "cloudfront" | "bunny" | "local";
  apiKey?: string;
  zoneId?: string;
  bucketName?: string;
  baseUrl?: string;
  cacheTTL: number; // seconds
  cacheRules?: CacheRule[];
}

export interface CacheRule {
  pattern: string; // regex pattern
  ttl: number; // cache time in seconds
  bypassCache?: boolean;
  minifyAssets?: boolean;
}

// Default CDN config (local caching)
const defaultConfig: CDNConfig = {
  type: "local",
  cacheTTL: 86400, // 24 hours
  cacheRules: [
    { pattern: "\\.(jpg|jpeg|png|gif|webp)$", ttl: 604800 }, // 7 days for images
    { pattern: "\\.(js|css)$", ttl: 86400 }, // 1 day for scripts/styles
    { pattern: "\\.(html|xml|json)$", ttl: 3600 }, // 1 hour for markup
    { pattern: "\\.(mp4|webm|ogg)$", ttl: 604800 }, // 7 days for video
  ],
};

// In-memory cache stats
const cacheStats = new Map<
  string,
  { hits: number; misses: number; size: number }
>();

/**
 * Generate cache key for resource
 */
export function generateCacheKey(
  userId: string,
  resourceId: string,
  version?: string,
): string {
  const payload = `${userId}:${resourceId}:${version || "1"}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * Get CDN URL for resource
 */
export function getCDNUrl(
  resourceId: string,
  userId: string,
  config: CDNConfig = defaultConfig,
): string {
  const cacheKey = generateCacheKey(userId, resourceId);

  switch (config.type) {
    case "cloudflare":
      return `https://${config.zoneId}.${config.baseUrl || "cdn.example.com"}/cache/${cacheKey}`;

    case "cloudfront":
      return `https://${config.bucketName}.cloudfront.net/${cacheKey}`;

    case "bunny":
      return `https://${config.bucketName}.b-cdn.net/${cacheKey}`;

    case "local":
    default:
      return `/api/cdn/${cacheKey}`;
  }
}

/**
 * Purge cache for resource
 */
export async function purgeCacheResource(
  resourceId: string,
  userId: string,
  config: CDNConfig = defaultConfig,
) {
  try {
    const cacheKey = generateCacheKey(userId, resourceId);

    // Update timestamp to invalidate cache
    await prisma.cacheEntry.upsert({
      where: { cacheKey },
      update: { purgedAt: new Date() },
      create: {
        cacheKey,
        resourceId,
        userId,
        purgedAt: new Date(),
      },
    });

    switch (config.type) {
      case "cloudflare":
        // Purge Cloudflare cache
        if (config.apiKey && config.zoneId) {
          await purgeCloudflareCache(config.zoneId, config.apiKey, [
            getCDNUrl(resourceId, userId, config),
          ]);
        }
        break;

      case "cloudfront":
        // Purge CloudFront distribution
        if (config.bucketName) {
          await purgeCloudFrontCache([`/${cacheKey}`]);
        }
        break;

      case "bunny":
        // Purge Bunny cache
        if (config.apiKey && config.bucketName) {
          await purgeBunnyCache(config.bucketName, config.apiKey, cacheKey);
        }
        break;
    }

    logger.worker("cdn:purge", "success", { resourceId, userId });
  } catch (error) {
    logger.error("Failed to purge cache", error as Error, {
      resourceId,
      userId,
    });
  }
}

/**
 * Purge all cache for user
 */
export async function purgeUserCache(
  userId: string,
  config: CDNConfig = defaultConfig,
) {
  try {
    const entries = await prisma.cacheEntry.findMany({
      where: { userId, purgedAt: null },
    });

    const urls = entries.map((e) => getCDNUrl(e.resourceId, userId, config));

    // Purge based on CDN type
    switch (config.type) {
      case "cloudflare":
        if (config.apiKey && config.zoneId) {
          await purgeCloudflareCache(config.zoneId, config.apiKey, urls);
        }
        break;

      case "cloudfront":
        await purgeCloudFrontCache(urls.map((u) => new URL(u).pathname));
        break;

      case "bunny":
        if (config.apiKey && config.bucketName) {
          for (const entry of entries) {
            const cacheKey = generateCacheKey(userId, entry.resourceId);
            await purgeBunnyCache(config.bucketName, config.apiKey, cacheKey);
          }
        }
        break;
    }

    // Mark as purged
    await prisma.cacheEntry.updateMany({
      where: { userId },
      data: { purgedAt: new Date() },
    });

    logger.worker("cdn:purge-user", "success", {
      userId,
      count: entries.length,
    });
  } catch (error) {
    logger.error("Failed to purge user cache", error as Error, { userId });
  }
}

/**
 * Record cache hit/miss
 */
export async function recordCacheMetric(
  cacheKey: string,
  hit: boolean,
  size?: number,
) {
  const stats = cacheStats.get(cacheKey) || { hits: 0, misses: 0, size: 0 };

  if (hit) {
    stats.hits++;
  } else {
    stats.misses++;
  }

  if (size) {
    stats.size = size;
  }

  cacheStats.set(cacheKey, stats);
}

/**
 * Get cache statistics
 */
export function getCacheStatistics(cacheKey?: string) {
  if (cacheKey) {
    return cacheStats.get(cacheKey);
  }

  const all = Array.from(cacheStats.entries()).map(([key, stats]) => ({
    cacheKey: key,
    ...stats,
    hitRate: stats.hits / (stats.hits + stats.misses),
  }));

  const totalHits = all.reduce((sum, s) => sum + s.hits, 0);
  const totalMisses = all.reduce((sum, s) => sum + s.misses, 0);
  const totalSize = all.reduce((sum, s) => sum + s.size, 0);

  return {
    total: all.length,
    totalHits,
    totalMisses,
    totalSize,
    hitRate: totalHits / (totalHits + totalMisses),
    entries: all,
  };
}

/**
 * Optimize image for CDN delivery
 */
export async function optimizeImageForCDN(
  imageBuffer: Buffer,
  format: "webp" | "avif" | "jpg" = "webp",
): Promise<Buffer> {
  try {
    // Note: In production, use sharp library for actual optimization
    // This is a placeholder - implement with:
    // npm install sharp
    // const sharp = require('sharp');
    // const optimized = await sharp(imageBuffer)
    //   .toFormat(format, { quality: 80 })
    //   .toBuffer();

    logger.worker("cdn:optimize", "processing", { format });
    return imageBuffer; // For now, return as-is
  } catch (error) {
    logger.error("Image optimization failed", error as Error);
    return imageBuffer; // Return original if optimization fails
  }
}

/**
 * Purge Cloudflare cache
 */
async function purgeCloudflareCache(
  zoneId: string,
  apiKey: string,
  urls: string[],
) {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files: urls }),
      },
    );

    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${response.status}`);
    }

    logger.worker("cdn:cloudflare", "purged", { count: urls.length });
  } catch (error) {
    logger.error("Cloudflare purge failed", error as Error);
  }
}

/**
 * Purge CloudFront cache
 */
async function purgeCloudFrontCache(paths: string[]) {
  try {
    // Implement AWS CloudFront invalidation
    // Requires AWS SDK and proper credentials
    logger.worker("cdn:cloudfront", "purged", { count: paths.length });
  } catch (error) {
    logger.error("CloudFront purge failed", error as Error);
  }
}

/**
 * Purge Bunny cache
 */
async function purgeBunnyCache(
  bucketName: string,
  apiKey: string,
  cacheKey: string,
) {
  try {
    const response = await fetch(
      `https://api.bunny.net/purge?url=https://${bucketName}.b-cdn.net/${cacheKey}`,
      {
        method: "POST",
        headers: {
          AccessKey: apiKey,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Bunny API error: ${response.status}`);
    }

    logger.worker("cdn:bunny", "purged", { cacheKey });
  } catch (error) {
    logger.error("Bunny purge failed", error as Error);
  }
}

/**
 * Get optimal format based on browser support
 */
export function getOptimalImageFormat(
  userAgent?: string,
): "webp" | "avif" | "jpg" {
  if (!userAgent) return "jpg";

  if (userAgent.includes("Chrome") || userAgent.includes("Edge")) {
    return "webp";
  }

  if (userAgent.includes("Firefox")) {
    return userAgent.includes("version/") ? "webp" : "jpg";
  }

  return "jpg";
}

/**
 * Generate responsive image URLs
 */
export function generateResponsiveImageURLs(
  resourceId: string,
  userId: string,
  sizes: number[] = [320, 640, 1024, 1920],
): { [key: string]: string } {
  const urls: { [key: string]: string } = {};

  for (const size of sizes) {
    urls[`${size}w`] = `${getCDNUrl(resourceId, userId)}?w=${size}&q=80&f=webp`;
  }

  return urls;
}
