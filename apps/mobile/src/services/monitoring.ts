/**
 * Monitoring & Health Check Service
 * Monitor app health, performance metrics, and system status
 */

import { Platform } from 'react-native';
import { logger } from '../utils/logger';
import * as Device from 'expo-device';
import * as Application from 'expo-application';

interface HealthMetrics {
  timestamp: number;
  deviceInfo: {
    brand: string | null;
    modelName: string | null;
    osName: string | null;
    osVersion: string | null;
    platform: string;
  };
  appInfo: {
    name: string | null;
    version: string | null;
    buildVersion: string | null;
  };
  memory?: {
    total: number;
    used: number;
    available: number;
  };
  performance: {
    avgResponseTime: number;
    slowOperations: number;
    errorCount: number;
  };
}

class MonitoringService {
  private errorCount = 0;
  private slowOperationCount = 0;
  private responseTimeSamples: number[] = [];
  private maxSamples = 50;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    logger.info('Monitoring service initialized');
    
    // Log initial health check
    const health = await this.getHealthMetrics();
    logger.info('Initial health check', health);
  }

  /**
   * Record response time
   */
  recordResponseTime(timeMs: number) {
    this.responseTimeSamples.push(timeMs);

    // Track slow operations (> 1 second)
    if (timeMs > 1000) {
      this.slowOperationCount++;
    }

    // Keep sample size manageable
    if (this.responseTimeSamples.length > this.maxSamples) {
      this.responseTimeSamples.shift();
    }
  }

  /**
   * Record error occurrence
   */
  recordError() {
    this.errorCount++;
  }

  /**
   * Get average response time
   */
  getAverageResponseTime(): number {
    if (this.responseTimeSamples.length === 0) return 0;
    
    const sum = this.responseTimeSamples.reduce((a, b) => a + b, 0);
    return sum / this.responseTimeSamples.length;
  }

  /**
   * Get comprehensive health metrics
   */
  async getHealthMetrics(): Promise<HealthMetrics> {
    const metrics: HealthMetrics = {
      timestamp: Date.now(),
      deviceInfo: {
        brand: Device.brand,
        modelName: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
        platform: Platform.OS,
      },
      appInfo: {
        name: Application.applicationName,
        version: Application.nativeApplicationVersion,
        buildVersion: Application.nativeBuildVersion,
      },
      performance: {
        avgResponseTime: this.getAverageResponseTime(),
        slowOperations: this.slowOperationCount,
        errorCount: this.errorCount,
      },
    };

    return metrics;
  }

  /**
   * Check if app is healthy
   */
  async checkHealth(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    const avgResponseTime = this.getAverageResponseTime();

    // Check for performance issues
    if (avgResponseTime > 2000) {
      issues.push(`High average response time: ${avgResponseTime.toFixed(0)}ms`);
    }

    // Check for excessive errors
    if (this.errorCount > 10) {
      issues.push(`High error count: ${this.errorCount}`);
    }

    // Check for excessive slow operations
    if (this.slowOperationCount > 5) {
      issues.push(`Multiple slow operations detected: ${this.slowOperationCount}`);
    }

    const healthy = issues.length === 0;

    if (!healthy) {
      logger.warn('Health check failed', { issues });
    }

    return { healthy, issues };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.errorCount = 0;
    this.slowOperationCount = 0;
    this.responseTimeSamples = [];
    logger.info('Monitoring metrics reset');
  }

  /**
   * Get detailed diagnostics
   */
  getDiagnostics() {
    return {
      errorCount: this.errorCount,
      slowOperationCount: this.slowOperationCount,
      responseTimeSamples: [...this.responseTimeSamples],
      avgResponseTime: this.getAverageResponseTime(),
    };
  }
}

export const monitoring = new MonitoringService();
