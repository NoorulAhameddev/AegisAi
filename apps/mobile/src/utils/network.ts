/**
 * Offline Support & Network Detection
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { logger } from './logger';

class NetworkManager {
  private isConnected: boolean = true;
  private listeners: Array<(isConnected: boolean) => void> = [];
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Subscribe to network state updates
    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasConnected = this.isConnected;
      this.isConnected = state.isConnected ?? false;

      if (wasConnected !== this.isConnected) {
        logger.info('Network status changed', {
          isConnected: this.isConnected,
          type: state.type,
        });
        this.notifyListeners();
      }
    });

    // Get initial state
    const state = await NetInfo.fetch();
    this.isConnected = state.isConnected ?? false;
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.isConnected));
  }

  /**
   * Add network status listener
   */
  addListener(callback: (isConnected: boolean) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  /**
   * Check if device is online
   */
  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.listeners = [];
  }
}

export const networkManager = new NetworkManager();

/**
 * Retry utility with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        logger.error(`Max retries (${maxRetries}) reached`, error);
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = baseDelay * Math.pow(2, attempt);
      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
        error: error instanceof Error ? error.message : String(error),
      });
      
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Execute function with network check
 */
export async function withNetworkCheck<T>(
  fn: () => Promise<T>,
  offlineMessage: string = 'This action requires an internet connection'
): Promise<T> {
  const isOnline = await networkManager.isOnline();
  
  if (!isOnline) {
    logger.warn('Network check failed - offline', { message: offlineMessage });
    throw new Error(offlineMessage);
  }

  return fn();
}
