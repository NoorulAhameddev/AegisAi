/**
 * Analytics Service
 * Track user interactions and app performance
 */

import { ENV } from '../config/env';
import { logger } from '../utils/logger';

export enum AnalyticsEvent {
  // Authentication
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  SIGNUP_ATTEMPT = 'signup_attempt',
  SIGNUP_SUCCESS = 'signup_success',
  SIGNUP_FAILURE = 'signup_failure',

  // Navigation
  SCREEN_VIEW = 'screen_view',
  TAB_CHANGE = 'tab_change',

  // Chat
  MESSAGE_SENT = 'message_sent',
  MESSAGE_RECEIVED = 'message_received',
  CONVERSATION_STARTED = 'conversation_started',
  CONVERSATION_DELETED = 'conversation_deleted',

  // Files
  FILE_UPLOADED = 'file_uploaded',
  FILE_DOWNLOADED = 'file_downloaded',
  FILE_DELETED = 'file_deleted',

  // Errors
  ERROR_OCCURRED = 'error_occurred',
  API_ERROR = 'api_error',
  NETWORK_ERROR = 'network_error',

  // Performance
  APP_STARTED = 'app_started',
  APP_BACKGROUNDED = 'app_backgrounded',
  APP_FOREGROUNDED = 'app_foregrounded',
  SLOW_OPERATION = 'slow_operation',

  // Settings
  SETTINGS_CHANGED = 'settings_changed',
  THEME_CHANGED = 'theme_changed',
  BIOMETRIC_ENABLED = 'biometric_enabled',
  BIOMETRIC_DISABLED = 'biometric_disabled',
}

interface AnalyticsProperties {
  [key: string]: string | number | boolean | null | undefined;
}

class AnalyticsService {
  private enabled: boolean;
  private userId: string | null = null;
  private sessionId: string;
  private eventQueue: Array<{ event: string; properties: AnalyticsProperties; timestamp: number }> =
    [];

  constructor() {
    this.enabled = ENV.ENABLE_ANALYTICS;
    this.sessionId = this.generateSessionId();
    
    if (this.enabled) {
      logger.info('Analytics initialized', { sessionId: this.sessionId });
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Set user identifier for analytics
   */
  setUserId(userId: string | null) {
    this.userId = userId;
    if (this.enabled) {
      logger.debug('Analytics user ID set', { userId });
    }
  }

  /**
   * Track an event
   */
  track(event: AnalyticsEvent | string, properties: AnalyticsProperties = {}) {
    if (!this.enabled) return;

    const enrichedProperties = {
      ...properties,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      platform: 'mobile',
    };

    // Add to queue
    this.eventQueue.push({
      event,
      properties: enrichedProperties,
      timestamp: Date.now(),
    });

    logger.debug('Analytics event tracked', { event, properties: enrichedProperties });

    // TODO: Send to analytics service (e.g., Mixpanel, Amplitude, Firebase Analytics)
    // this.sendToRemote(event, enrichedProperties);

    // Keep queue size manageable
    if (this.eventQueue.length > 100) {
      this.flush();
    }
  }

  /**
   * Track screen view
   */
  trackScreenView(screenName: string, properties: AnalyticsProperties = {}) {
    this.track(AnalyticsEvent.SCREEN_VIEW, {
      screen_name: screenName,
      ...properties,
    });
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: string, properties: AnalyticsProperties = {}) {
    this.track(AnalyticsEvent.ERROR_OCCURRED, {
      error_message: error.message,
      error_name: error.name,
      error_stack: error.stack,
      context,
      ...properties,
    });
  }

  /**
   * Track timing/performance
   */
  trackTiming(category: string, variable: string, timeMs: number, label?: string) {
    this.track(AnalyticsEvent.SLOW_OPERATION, {
      category,
      variable,
      time_ms: timeMs,
      label,
    });
  }

  /**
   * Flush event queue
   */
  private async flush() {
    if (this.eventQueue.length === 0) return;

    logger.debug('Flushing analytics queue', { count: this.eventQueue.length });

    // TODO: Batch send events to analytics service
    // await this.sendBatchToRemote(this.eventQueue);

    this.eventQueue = [];
  }

  /**
   * Get queued events (for debugging)
   */
  getQueuedEvents() {
    return [...this.eventQueue];
  }

  /**
   * Clear all queued events
   */
  clearQueue() {
    this.eventQueue = [];
    logger.debug('Analytics queue cleared');
  }

  /**
   * Enable or disable analytics
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    logger.info('Analytics enabled status changed', { enabled });
  }

  /**
   * Check if analytics is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

export const analytics = new AnalyticsService();
