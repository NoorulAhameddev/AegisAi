import { prisma } from "./prisma";
import { logger } from "./logger";

/**
 * Feature Flags System
 * Allows runtime feature toggling without redeployment
 */

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
  rolloutPercentage?: number; // 0-100: percentage of users who get the feature
  createdAt: Date;
  updatedAt: Date;
}

// In-memory cache for feature flags (refreshed periodically)
let featureFlagCache: Map<string, FeatureFlag> = new Map();
let cacheLastUpdated = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Check if a feature is enabled for a user
 */
export async function isFeatureEnabled(
  featureName: string,
  userId?: string,
): Promise<boolean> {
  try {
    // Refresh cache if expired
    if (Date.now() - cacheLastUpdated > CACHE_TTL) {
      await refreshFeatureFlags();
    }

    const flag = featureFlagCache.get(featureName);
    if (!flag) {
      logger.warn(`Feature flag not found: ${featureName}`);
      return false;
    }

    if (!flag.enabled) {
      return false;
    }

    // If rolloutPercentage is defined, use consistent hashing for user
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      if (!userId) {
        // No user ID: use random rollout
        return Math.random() * 100 < flag.rolloutPercentage;
      }

      // Deterministic rollout based on user ID
      const hash = userId
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return hash % 100 < flag.rolloutPercentage;
    }

    return true;
  } catch (error) {
    logger.error("Error checking feature flag", error as Error, {
      featureName,
    });
    return false;
  }
}

/**
 * Refresh feature flags cache from database
 */
async function refreshFeatureFlags(): Promise<void> {
  try {
    // This assumes FeatureFlag model exists in Prisma
    // You may need to add it to schema.prisma
    const flags = await prisma.featureFlag.findMany().catch(() => []);

    const newCache = new Map<string, FeatureFlag>();
    flags.forEach((flag) => {
      newCache.set(flag.name, {
        name: flag.name,
        enabled: (flag as any).enabled,
        description: (flag as any).description,
        rolloutPercentage: (flag as any).rolloutPercentage,
        createdAt: flag.createdAt || new Date(),
        updatedAt: flag.updatedAt || new Date(),
      });
    });

    featureFlagCache = newCache;
    cacheLastUpdated = Date.now();
    logger.debug(
      `Feature flags refreshed: ${featureFlagCache.size} flags loaded`,
    );
  } catch (error) {
    logger.error("Failed to refresh feature flags", error as Error);
    // Use existing cache if refresh fails
  }
}

/**
 * Create/update a feature flag (admin only)
 */
export async function setFeatureFlag(
  name: string,
  enabled: boolean,
  options?: {
    description?: string;
    rolloutPercentage?: number;
  },
): Promise<void> {
  try {
    // This assumes FeatureFlag model exists
    await prisma.featureFlag
      .upsert({
        where: { name },
        update: {
          enabled,
          description: options?.description,
          rolloutPercentage: options?.rolloutPercentage,
          updatedAt: new Date(),
        },
        create: {
          name,
          enabled,
          description: options?.description,
          rolloutPercentage: options?.rolloutPercentage,
        },
      } as any)
      .catch(() => {
        logger.warn("FeatureFlag model not available in Prisma schema");
      });

    // Invalidate cache
    cacheLastUpdated = 0;
    await refreshFeatureFlags();
  } catch (error) {
    logger.error("Failed to set feature flag", error as Error, { name });
  }
}

/**
 * Initialize feature flags on startup
 */
export async function initializeFeatureFlags(): Promise<void> {
  logger.info("Initializing feature flags...");
  await refreshFeatureFlags();
}
