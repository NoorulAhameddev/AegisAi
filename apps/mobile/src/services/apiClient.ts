/**
 * Enhanced API Client with Offline Support and Retry Logic
 */

import { api } from './api';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';
import { cache, requestDeduplicator, requestQueue } from '../utils/performance';
import { retryWithBackoff, withNetworkCheck, networkManager } from '../utils/network';
import { AppError, ErrorCode } from '../utils/errorHandler';

interface RequestConfig {
  useCache?: boolean;
  cacheTTL?: number;
  skipNetworkCheck?: boolean;
  skipRetry?: boolean;
  skipQueue?: boolean;
  priority?: 'high' | 'normal';
}

/**
 * Enhanced GET request with caching and retry logic
 */
export async function enhancedGet<T>(
  url: string,
  config: RequestConfig = {}
): Promise<T> {
  const {
    useCache = true,
    cacheTTL = 300000, // 5 minutes default
    skipNetworkCheck = false,
    skipRetry = false,
    skipQueue = false,
  } = config;

  const cacheKey = `GET:${url}`;

  // Check cache first
  if (useCache && ENV.OFFLINE_MODE) {
    const cached = cache.get(cacheKey);
    if (cached) {
      logger.debug('Cache hit for GET request', { url });
      return cached;
    }
  }

  // Define the request function
  const makeRequest = async (): Promise<T> => {
    const executor = async () => {
      const response = await api.get(url);
      
      // Cache successful response
      if (useCache && response.status === 200) {
        cache.set(cacheKey, response.data, cacheTTL);
      }
      
      return response.data;
    };

    // Apply network check
    if (!skipNetworkCheck) {
      return await withNetworkCheck(executor);
    }
    
    return executor();
  };

  // Apply retry logic
  const requestWithRetry = skipRetry
    ? makeRequest
    : () => retryWithBackoff(makeRequest, ENV.MAX_RETRIES);

  // Apply request queue
  if (skipQueue) {
    return await requestWithRetry();
  }

  return await requestQueue.enqueue(requestWithRetry);
}

/**
 * Enhanced POST request with deduplication and retry logic
 */
export async function enhancedPost<T>(
  url: string,
  data?: any,
  config: RequestConfig = {}
): Promise<T> {
  const {
    skipNetworkCheck = false,
    skipRetry = false,
    skipQueue = false,
  } = config;

  // Define the request function
  const makeRequest = async (): Promise<T> => {
    const executor = async () => {
      const response = await api.post(url, data);
      return response.data;
    };

    // Apply network check
    if (!skipNetworkCheck) {
      return await withNetworkCheck(executor);
    }
    
    return executor();
  };

  // Apply retry logic (fewer retries for POST to avoid duplicates)
  const requestWithRetry = skipRetry
    ? makeRequest
    : () => retryWithBackoff(makeRequest, Math.min(ENV.MAX_RETRIES, 2));

  // Apply request queue
  if (skipQueue) {
    return await requestWithRetry();
  }

  return await requestQueue.enqueue(requestWithRetry);
}

/**
 * Enhanced PUT request
 */
export async function enhancedPut<T>(
  url: string,
  data?: any,
  config: RequestConfig = {}
): Promise<T> {
  const {
    skipNetworkCheck = false,
    skipRetry = false,
    skipQueue = false,
  } = config;

  const makeRequest = async (): Promise<T> => {
    const executor = async () => {
      const response = await api.put(url, data);
      return response.data;
    };

    if (!skipNetworkCheck) {
      return await withNetworkCheck(executor);
    }
    
    return executor();
  };

  const requestWithRetry = skipRetry
    ? makeRequest
    : () => retryWithBackoff(makeRequest, Math.min(ENV.MAX_RETRIES, 2));

  if (skipQueue) {
    return await requestWithRetry();
  }

  return await requestQueue.enqueue(requestWithRetry);
}

/**
 * Enhanced DELETE request
 */
export async function enhancedDelete<T>(
  url: string,
  config: RequestConfig = {}
): Promise<T> {
  const {
    skipNetworkCheck = false,
    skipRetry = true, // Default no retry for DELETE
    skipQueue = false,
  } = config;

  const makeRequest = async (): Promise<T> => {
    const executor = async () => {
      const response = await api.delete(url);
      return response.data;
    };

    if (!skipNetworkCheck) {
      return await withNetworkCheck(executor);
    }
    
    return executor();
  };

  const requestWithRetry = skipRetry
    ? makeRequest
    : () => retryWithBackoff(makeRequest, 1);

  if (skipQueue) {
    return await requestWithRetry();
  }

  return await requestQueue.enqueue(requestWithRetry);
}

/**
 * Clear all cached data
 */
export function clearCache() {
  cache.clear();
  logger.info('API cache cleared');
}

/**
 * Get offline queue status
 */
export function getQueueStatus() {
  return {
    queueSize: requestQueue.getQueueSize(),
    activeRequests: requestQueue.getActiveRequests(),
    cacheSize: cache.getSize(),
    isOnline: networkManager.getConnectionStatus(),
  };
}
