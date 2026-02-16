/**
 * Global Error Handlers
 * Catches unhandled promise rejections and uncaught exceptions to prevent silent failures
 * Should be imported at the entry point of all Node.js processes (workers, API, etc.)
 */

import { logger } from './logger';

/**
 * Setup global error handlers for process
 * Call this once at the entry point of your application
 */
export function setupGlobalErrorHandlers(processName: string = 'app') {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection', 
      reason instanceof Error ? reason : new Error(String(reason)), 
      {
        process: processName,
        type: 'unhandledRejection',
        promise: String(promise),
      }
    );
    
    // In production, exit the process to allow restart via PM2/Docker/K8s
    // This prevents the app from running in an undefined state
    if (process.env.NODE_ENV === 'production') {
      logger.error('Exiting process due to unhandled rejection', new Error('Fatal error'), { process: processName });
      process.exit(1);
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', error, {
      process: processName,
      type: 'uncaughtException',
    });
    
    // Always exit on uncaught exception - the process is in an undefined state
    logger.error('Exiting process due to uncaught exception', error, { process: processName });
    process.exit(1);
  });

  // Handle graceful shutdown signals
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received - starting graceful shutdown', { process: processName });
    // Allow cleanup to happen, then exit
    setTimeout(() => {
      logger.info('Graceful shutdown complete', { process: processName });
      process.exit(0);
    }, 5000); // 5 second grace period
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received - starting graceful shutdown', { process: processName });
    // Allow cleanup to happen, then exit
    setTimeout(() => {
      logger.info('Graceful shutdown complete', { process: processName });
      process.exit(0);
    }, 5000); // 5 second grace period
  });

  logger.info('Global error handlers initialized', { process: processName });
}
