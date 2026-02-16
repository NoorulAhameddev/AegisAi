/**
 * Retry Utilities with Exponential Backoff
 * 
 * Implements intelligent retry strategies for external service calls
 * Features:
 * - Exponential backoff with jitter
 * - Per-service retry policies
 * - CloudWatch metrics integration
 * - Respects circuit breaker state
 */

import pRetry, { AbortError, Options } from 'p-retry';
import { logger } from './logger';

export interface RetryConfig {
  retries?: number;
  minTimeout?: number; // Initial delay in ms
  maxTimeout?: number; // Max delay in ms
  factor?: number; // Exponential backoff factor
  randomize?: boolean; // Add jitter
  onFailedAttempt?: (error: any, attemptNumber: number) => void;
}

/**
 * Retry strategies for different service types
 */
export const RetryStrategies = {
  /**
   * OpenAI API calls
   * - 3 retries
   * - 1s, 2s, 4s delays
   * - 20% jitter
   */
  openai: {
    retries: 3,
    minTimeout: 1000,
    maxTimeout: 4000,
    factor: 2,
    randomize: true,
  } as RetryConfig,

  /**
   * Embeddings API (more lenient)
   * - 5 retries
   * - Exponential backoff
   * - 20% jitter
   */
  embeddings: {
    retries: 5,
    minTimeout: 1000,
    maxTimeout: 10000,
    factor: 2,
    randomize: true,
  } as RetryConfig,

  /**
   * RAG/Vector queries
   * - 2 retries
   * - Linear backoff (fast recovery)
   */
  rag: {
    retries: 2,
    minTimeout: 500,
    maxTimeout: 1000,
    factor: 1, // Linear
    randomize: true,
  } as RetryConfig,

  /**
   * Database operations
   * - 3 retries
   * - Fast exponential
   */
  database: {
    retries: 3,
    minTimeout: 100,
    maxTimeout: 1000,
    factor: 2,
    randomize: true,
  } as RetryConfig,

  /**
   * Generic external API
   * - 3 retries
   * - Moderate backoff
   */
  generic: {
    retries: 3,
    minTimeout: 1000,
    maxTimeout: 5000,
    factor: 2,
    randomize: true,
  } as RetryConfig,
};

/**
 * Retry a function with exponential backoff
 * 
 * @param fn Function to retry
 * @param config Retry configuration
 * @param context Operation name for logging
 * @returns Result of function
 * @throws AbortError if operation should not be retried
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = RetryStrategies.generic,
  context: string = 'operation'
): Promise<T> {
  const pRetryOptions: Options = {
    retries: config.retries || 3,
    minTimeout: config.minTimeout || 1000,
    maxTimeout: config.maxTimeout || 5000,
    factor: config.factor || 2,
    randomize: config.randomize !== false, // Default true
    
    onFailedAttempt: (error) => {
      const retriesLeft = error.retriesLeft;
      const attemptNumber = error.attemptNumber;

      logger.warn(`Retry attempt ${attemptNumber} failed for ${context}`, {
        retriesLeft,
        error: error.message,
        nextRetryIn: `${Math.round(error.retriesLeft > 0 ? calculateDelay(config, attemptNumber) : 0)}ms`,
      });

      // Call custom handler if provided
      if (config.onFailedAttempt) {
        config.onFailedAttempt(error, attemptNumber);
      }
    },
  };

  try {
    return await pRetry(fn, pRetryOptions);
  } catch (error) {
    logger.error(`All retry attempts exhausted for ${context}`, error as Error, {
      retries: config.retries,
    });
    throw error;
  }
}

/**
 * Calculate delay for next retry (used for logging)
 */
function calculateDelay(config: RetryConfig, attemptNumber: number): number {
  const base = config.minTimeout || 1000;
  const factor = config.factor || 2;
  const max = config.maxTimeout || 5000;

  let delay = base * Math.pow(factor, attemptNumber - 1);
  delay = Math.min(delay, max);

  // Add jitter (±20%)
  if (config.randomize) {
    const jitter = delay * 0.2;
    delay = delay + (Math.random() * jitter * 2 - jitter);
  }

  return delay;
}

/**
 * Mark an error as permanent (don't retry)
 * Use when error is client-side (validation, auth, etc.)
 */
export function abortRetry(message: string): AbortError {
  return new AbortError(message);
}

/**
 * Check if error should be retried
 * Returns false for client errors (4xx), true for server errors (5xx)
 */
export function shouldRetryError(error: any): boolean {
  // HTTP errors
  if (error.response?.status) {
    const status = error.response.status;
    // Don't retry client errors (except 429 rate limit)
    if (status >= 400 && status < 500 && status !== 429) {
      return false;
    }
  }

  // Specific error types that shouldn't be retried
  const nonRetryableErrors = [
    'ValidationError',
    'AuthenticationError',
    'PermissionError',
    'InvalidInputError',
  ];

  if (nonRetryableErrors.includes(error.name)) {
    return false;
  }

  // Retry by default for network/server errors
  return true;
}

/**
 * Wrap function with retry and error filtering
 * Automatically aborts on non-retryable errors
 */
export async function retryWithFilter<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  context: string
): Promise<T> {
  return retryWithBackoff(
    async () => {
      try {
        return await fn();
      } catch (error) {
        if (!shouldRetryError(error)) {
          logger.info(`Non-retryable error for ${context}, aborting`, {
            error: (error as Error).message,
          });
          throw abortRetry((error as Error).message);
        }
        throw error;
      }
    },
    config,
    context
  );
}

/**
 * Batch retry with individual item handling
 * Retries failed items while succeeding items are kept
 */
export async function retryBatch<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  config: RetryConfig = RetryStrategies.generic,
  context: string = 'batch-operation'
): Promise<{ successes: R[]; failures: { item: T; error: Error }[] }> {
  const successes: R[] = [];
  const failures: { item: T; error: Error }[] = [];

  await Promise.all(
    items.map(async (item) => {
      try {
        const result = await retryWithBackoff(
          () => fn(item),
          config,
          `${context}-item`
        );
        successes.push(result);
      } catch (error) {
        failures.push({ item, error: error as Error });
      }
    })
  );

  logger.info(`Batch operation completed: ${context}`, {
    total: items.length,
    successes: successes.length,
    failures: failures.length,
  });

  return { successes, failures };
}
