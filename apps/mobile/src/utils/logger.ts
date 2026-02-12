/**
 * Production-Grade Logger
 * Centralized logging with levels, formatting, and remote reporting support
 */

import { ENV } from '../config/env';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
};

class Logger {
  private currentLevel: LogLevel;
  private logBuffer: Array<{ level: string; message: string; timestamp: Date; data?: any }> = [];
  private maxBufferSize = 100;

  constructor() {
    this.currentLevel = LOG_LEVEL_MAP[ENV.LOG_LEVEL] || LogLevel.DEBUG;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const emoji = {
      DEBUG: '🔍',
      INFO: 'ℹ️',
      WARN: '⚠️',
      ERROR: '❌',
    }[level] || '📝';

    return `${emoji} [${timestamp}] ${level}: ${message}${data ? `\n${JSON.stringify(data, null, 2)}` : ''}`;
  }

  private addToBuffer(level: string, message: string, data?: any) {
    this.logBuffer.push({
      level,
      message,
      timestamp: new Date(),
      data,
    });

    // Keep buffer size manageable
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  private async reportToRemote(level: string, message: string, data?: any) {
    if (!ENV.ENABLE_CRASH_REPORTING || !ENV.IS_PROD) return;

    try {
      // TODO: Integrate with crash reporting service (e.g., Sentry, Firebase Crashlytics)
      // await crashReportingService.log({ level, message, data });
    } catch (error) {
      // Silently fail - don't want logging to break the app
      console.error('Failed to report log to remote service:', error);
    }
  }

  debug(message: string, data?: any) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const formatted = this.formatMessage('DEBUG', message, data);
    if (ENV.ENABLE_DEBUG_LOGS) {
      console.log(formatted);
    }
    this.addToBuffer('DEBUG', message, data);
  }

  info(message: string, data?: any) {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const formatted = this.formatMessage('INFO', message, data);
    console.info(formatted);
    this.addToBuffer('INFO', message, data);
  }

  warn(message: string, data?: any) {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const formatted = this.formatMessage('WARN', message, data);
    console.warn(formatted);
    this.addToBuffer('WARN', message, data);
    this.reportToRemote('WARN', message, data);
  }

  error(message: string, error?: any, data?: any) {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const errorData = {
      ...data,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    };

    const formatted = this.formatMessage('ERROR', message, errorData);
    console.error(formatted);
    this.addToBuffer('ERROR', message, errorData);
    this.reportToRemote('ERROR', message, errorData);
  }

  /**
   * Get recent logs for debugging
   */
  getRecentLogs(count: number = 50): Array<any> {
    return this.logBuffer.slice(-count);
  }

  /**
   * Clear log buffer
   */
  clearLogs() {
    this.logBuffer = [];
  }
}

export const logger = new Logger();
