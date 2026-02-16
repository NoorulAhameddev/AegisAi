/**
 * Circuit Breaker Pattern for External Service Calls
 * Production-grade implementation using opossum library
 * 
 * States:
 * - CLOSED: Normal operation (requests go through)
 * - OPEN: Service failing (requests fail fast)
 * - HALF_OPEN: Testing if service recovered (limited requests allowed)
 * 
 * Features:
 * - CloudWatch metrics integration
 * - Configurable thresholds and timeouts
 * - Performance tracking (latency, volume)
 * - Redis-based state sharing (future: cross-worker coordination)
 */

import CircuitBreaker from 'opossum';
import { publishCircuitBreakerMetric } from './cloudwatch-metrics';
import { logger } from './logger';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  name: string; // For logging and metrics
  timeout?: number; // Request timeout in ms (default: 30000)
  errorThresholdPercentage?: number; // Error % to open circuit (default: 50)
  resetTimeout?: number; // Time in OPEN before trying HALF_OPEN (default: 60000)
  volumeThreshold?: number; // Min requests before checking threshold (default: 10)
  rollingCountTimeout?: number; // Time window for error % calculation (default: 10000)
  fallback?: () => any; // Fallback function when circuit is OPEN
}

/**
 * Create a production-grade circuit breaker with monitoring
 */
export function createCircuitBreaker<T>(
  config: CircuitBreakerConfig
): CircuitBreaker<any, T> {
  const options = {
    timeout: config.timeout ?? 30000, // 30s default
    errorThresholdPercentage: config.errorThresholdPercentage ?? 50, // 50% error rate
    resetTimeout: config.resetTimeout ?? 60000, // 60s before HALF_OPEN
    volumeThreshold: config.volumeThreshold ?? 10, // Need 10 requests in window
    rollingCountTimeout: config.rollingCountTimeout ?? 10000, // 10s rolling window
    name: config.name,
  };

  const breaker = new CircuitBreaker(async (fn: () => Promise<T>) => fn(), options);

  // Event handlers for monitoring
  breaker.on('open', () => {
    logger.warn(`Circuit breaker OPEN: ${config.name}`);
    publishCircuitBreakerMetric(config.name, 'OPEN', 1);
  });

  breaker.on('halfOpen', () => {
    logger.info(`Circuit breaker HALF_OPEN: ${config.name}`);
    publishCircuitBreakerMetric(config.name, 'HALF_OPEN', 0.5);
  });

  breaker.on('close', () => {
    logger.info(`Circuit breaker CLOSED: ${config.name}`);
    publishCircuitBreakerMetric(config.name, 'CLOSED', 0);
  });

  breaker.on('success', (result: any, latency: number) => {
    // Track successful calls
    publishCircuitBreakerMetric(config.name, 'success', 0, {
      latencyMs: latency,
    });
  });

  breaker.on('failure', (error: Error) => {
    logger.error(`Circuit breaker failure: ${config.name}`, error);
    publishCircuitBreakerMetric(config.name, 'failure', 1, {
      errorType: error.name,
    });
  });

  breaker.on('timeout', () => {
    logger.warn(`Circuit breaker timeout: ${config.name}`);
    publishCircuitBreakerMetric(config.name, 'timeout', 1);
  });

  breaker.on('fallback', (result: any) => {
    logger.info(`Circuit breaker using fallback: ${config.name}`);
    publishCircuitBreakerMetric(config.name, 'fallback', 1);
  });

  // Set fallback if provided
  if (config.fallback) {
    breaker.fallback(config.fallback);
  }

  return breaker;
}

/**
 * Get circuit breaker state as enum
 */
export function getCircuitState(breaker: CircuitBreaker<any, any>): CircuitState {
  if (breaker.opened) return CircuitState.OPEN;
  if (breaker.halfOpen) return CircuitState.HALF_OPEN;
  return CircuitState.CLOSED;
}

/**
 * Get circuit breaker health stats
 */
export function getCircuitStats(breaker: CircuitBreaker<any, any>) {
  const stats = breaker.stats;
  return {
    state: getCircuitState(breaker),
    fires: stats.fires, // Total calls
    successes: stats.successes,
    failures: stats.failures,
    timeouts: stats.timeouts,
    fallbacks: stats.fallbacks,
    rejects: stats.rejects, // Rejected when OPEN
    latencyMean: stats.latencyMean,
    percentiles: {
      p50: stats.percentiles['0.5'],
      p90: stats.percentiles['0.9'],
      p99: stats.percentiles['0.99'],
    },
  };
}

// ========================================
// Global Circuit Breakers
// ========================================

/**
 * OpenAI API circuit breaker
 * Fallback: Return cached response or degraded message
 */
export const openaiCircuitBreaker = createCircuitBreaker({
  name: 'OpenAI',
  timeout: 30000, // 30s per request
  errorThresholdPercentage: 50, // Open at 50% error rate
  resetTimeout: 60000, // Try recovery after 60s
  volumeThreshold: 10, // Need 10 requests in window
  fallback: () => {
    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content:
              'I apologize, but I am experiencing technical difficulties connecting to my AI backend. Please try again in a moment.',
          },
          finish_reason: 'stop',
        },
      ],
    };
  },
});

/**
 * Moderation API circuit breaker
 * Fallback: Return safe (non-flagged) response to allow processing
 */
export const moderationCircuitBreaker = createCircuitBreaker({
  name: 'Moderation',
  timeout: 10000, // 10s per request
  errorThresholdPercentage: 60, // More lenient threshold
  resetTimeout: 30000, // Try recovery after 30s
  volumeThreshold: 5,
  fallback: () => {
    logger.warn('Moderation API unavailable - bypassing check (potential security risk)');
    return {
      results: [
        {
          flagged: false, // Allow processing when moderation unavailable
          categories: {},
          category_scores: {},
        },
      ],
    };
  },
});

/**
 * RAG (embeddings/retrieval) circuit breaker
 * Fallback: Return empty context (chat without RAG)
 */
export const ragCircuitBreaker = createCircuitBreaker({
  name: 'RAG',
  timeout: 5000, // 5s per request
  errorThresholdPercentage: 50,
  resetTimeout: 60000,
  volumeThreshold: 10,
  fallback: () => {
    logger.info('RAG unavailable - continuing without context');
    return { results: [], context: '' };
  },
});
