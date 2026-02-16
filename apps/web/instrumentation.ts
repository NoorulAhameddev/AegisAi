/**
 * Next.js Instrumentation for Sentry and APM
 * Loaded automatically by Next.js 16+ on both server and edge runtime
 */

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Setup global error handlers first
    const { setupGlobalErrorHandlers } = await import('./src/lib/global-error-handlers');
    setupGlobalErrorHandlers('nextjs-server');
    
    const Sentry = await import('@sentry/nextjs');
    
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      
      // Environment and release tracking
      environment: process.env.APP_ENV || process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE || process.env.npm_package_version,
      
      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Error sampling
      sampleRate: 1.0,
      
      // Ignore specific errors
      ignoreErrors: [
        // Browser-specific errors
        'ResizeObserver loop',
        'Non-Error promise rejection',
        // Network errors
        'NetworkError',
        'Network request failed',
        // Known harmless errors
        'AbortError',
      ],
      
      // Before sending events, scrub sensitive data
      beforeSend(event, hint) {
        // Remove sensitive headers
        if (event.request) {
          if (event.request.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
            delete event.request.headers['x-api-key'];
          }
        }
        
        // Remove PII from extra data
        if (event.extra) {
          const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'pin', 'ssn', 'creditCard'];
          for (const key of sensitiveKeys) {
            if (event.extra[key]) {
              event.extra[key] = '[REDACTED]';
            }
          }
        }
        
        return event;
      },
      
      // Integrations
      integrations: [
        Sentry.prismaIntegration(),
        Sentry.redisIntegration(),
      ],
    });
  }
  
  // Edge runtime support
  if (process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs');
    
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.APP_ENV || process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,
    });
  }
}
