/**
 * Database Connection Pool Monitoring
 *
 * Tracks Prisma connection pool usage and publishes to CloudWatch.
 * Prevents "too many clients" errors by monitoring pool saturation.
 *
 * WARNING: Pool exhaustion at 90%+ leads to request queueing and timeouts.
 *
 * Formula: Pool Size = (num_workers × concurrent_jobs) + (api_instances × concurrent_requests) + buffer
 * Production: 40 connections minimum
 *
 * Environment Variables:
 * - DB_POOL_SIZE: Maximum connections (default: 10, production: 40+)
 * - DB_POOL_TIMEOUT: Connection acquisition timeout in seconds (default: 30)
 */

import { publishDBPoolUsageMetric } from "./cloudwatch-metrics";
import { logger } from "./logger";

interface PoolStats {
  active: number;
  idle: number;
  total: number;
  waiting: number;
  timestamp: number;
}

class DBPoolMonitor {
  private stats: PoolStats = {
    active: 0,
    idle: 0,
    total: 0,
    waiting: 0,
    timestamp: Date.now(),
  };

  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly interval = 60000; // 1 minute
  private readonly maxPoolSize = parseInt(process.env.DB_POOL_SIZE || "10", 10);

  /**
   * Start monitoring connection pool
   */
  start(): void {
    if (this.monitoringInterval) {
      logger.warn("DB pool monitor already started");
      return;
    }

    logger.info("Starting DB pool monitor", {
      maxPoolSize: this.maxPoolSize,
      interval: this.interval,
    });

    this.monitoringInterval = setInterval(() => {
      this.collectAndPublish();
    }, this.interval);

    // Initial collection
    this.collectAndPublish();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info("Stopped DB pool monitor");
    }
  }

  /**
   * Manually record connection acquisition
   */
  recordAcquisition(): void {
    this.stats.active++;
    this.stats.idle = Math.max(0, this.stats.idle - 1);
    this.stats.total = Math.min(
      this.maxPoolSize,
      this.stats.active + this.stats.idle,
    );
  }

  /**
   * Manually record connection release
   */
  recordRelease(): void {
    this.stats.active = Math.max(0, this.stats.active - 1);
    this.stats.idle++;
  }

  /**
   * Manually record waiting request
   */
  recordWaiting(): void {
    this.stats.waiting++;
  }

  /**
   * Manually clear waiting request
   */
  clearWaiting(): void {
    this.stats.waiting = Math.max(0, this.stats.waiting - 1);
  }

  /**
   * Get current pool statistics
   */
  getStats(): PoolStats {
    return { ...this.stats };
  }

  /**
   * Calculate pool usage percentage
   */
  getUsagePercentage(): number {
    if (this.maxPoolSize === 0) return 0;
    return (this.stats.active / this.maxPoolSize) * 100;
  }

  /**
   * Check if pool is saturated (>90% usage)
   */
  isSaturated(): boolean {
    return this.getUsagePercentage() >= 90;
  }

  /**
   * Collect stats and publish to CloudWatch
   */
  private async collectAndPublish(): Promise<void> {
    this.stats.timestamp = Date.now();
    const usagePercent = this.getUsagePercentage();

    // Log warning if pool is saturated
    if (this.isSaturated()) {
      logger.warn("Database connection pool saturation detected", {
        active: this.stats.active,
        idle: this.stats.idle,
        total: this.maxPoolSize,
        waiting: this.stats.waiting,
        usagePercent: usagePercent.toFixed(2),
      });
    }

    // Publish to CloudWatch
    try {
      await publishDBPoolUsageMetric(usagePercent);
    } catch (error) {
      logger.error("Failed to publish DB pool metrics", error as Error);
    }

    // Log current status
    logger.db(
      "Connection pool status",
      "pool_monitor",
      Date.now() - this.stats.timestamp,
      {
        active: this.stats.active,
        idle: this.stats.idle,
        waiting: this.stats.waiting,
        usagePercent: usagePercent.toFixed(2),
      },
    );
  }
}

// Singleton instance
export const dbPoolMonitor = new DBPoolMonitor();

/**
 * Increment active connections counter
 */
export function incrementActiveConnections(): void {
  dbPoolMonitor.recordAcquisition();
}

/**
 * Decrement active connections counter
 */
export function decrementActiveConnections(): void {
  dbPoolMonitor.recordRelease();
}

/**
 * Track waiting connection request
 */
export function incrementWaitingConnections(): void {
  dbPoolMonitor.recordWaiting();
}

/**
 * Clear waiting connection request
 */
export function decrementWaitingConnections(): void {
  dbPoolMonitor.clearWaiting();
}

/**
 * Get current pool statistics
 */
export function getPoolStats(): PoolStats {
  return dbPoolMonitor.getStats();
}

/**
 * Check if pool is saturated
 */
export function isPoolSaturated(): boolean {
  return dbPoolMonitor.isSaturated();
}

/**
 * Start pool monitoring (call at application startup)
 */
export function startPoolMonitoring(): void {
  dbPoolMonitor.start();
}

/**
 * Stop pool monitoring (call at application shutdown)
 */
export function stopPoolMonitoring(): void {
  dbPoolMonitor.stop();
}
