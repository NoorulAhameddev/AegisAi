// Structured logger for Aegis AI
// Production-ready with error tracking support

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    [key: string]: any;
}

// Error tracking integration (e.g., Sentry)
interface ErrorTracker {
    captureException(error: Error, context?: LogContext): void;
    captureMessage(message: string, level: LogLevel, context?: LogContext): void;
}

// Stub implementation - replace with actual Sentry/DataDog client
const errorTracker: ErrorTracker = {
    captureException: (error: Error, context?: LogContext) => {
        // TODO: Integrate with Sentry or DataDog
        // if (process.env.SENTRY_DSN) {
        //     Sentry.captureException(error, { extra: context });
        // }
    },
    captureMessage: (message: string, level: LogLevel, context?: LogContext) => {
        // TODO: Integrate with Sentry or DataDog
        // if (process.env.SENTRY_DSN) {
        //     Sentry.captureMessage(message, level);
        // }
    }
};

class Logger {
    private isDevelopment = process.env.NODE_ENV === 'development';
    private isProduction = process.env.NODE_ENV === 'production';

    private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
        const timestamp = new Date().toISOString();
        const contextStr = context ? ` ${JSON.stringify(context)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
    }

    debug(message: string, context?: LogContext) {
        if (this.isDevelopment) {
            console.log(this.formatMessage('debug', message, context));
        }
    }

    info(message: string, context?: LogContext) {
        console.log(this.formatMessage('info', message, context));
    }

    warn(message: string, context?: LogContext) {
        console.warn(this.formatMessage('warn', message, context));
    }

    error(message: string, error?: Error | any, context?: LogContext) {
        const errorContext = error ? {
            ...context,
            error: error.message,
            stack: error.stack
        } : context;
        
        console.error(this.formatMessage('error', message, errorContext));
        
        // Track error in production
        if (error instanceof Error) {
            errorTracker.captureException(error, errorContext);
        }
    }

    /**
     * Track an error and optionally notify external service
     */
    trackError(error: Error, context?: LogContext) {
        this.error('Tracked error', error, context);
        errorTracker.captureException(error, context);
    }

    /**
     * Track a message with context
     */
    trackMessage(message: string, level: LogLevel = 'info', context?: LogContext) {
        this[level](message, context);
        errorTracker.captureMessage(message, level, context);
    }

    // Specialized loggers for different components
    api(method: string, path: string, status: number, duration?: number) {
        this.info('API Request', {
            method,
            path,
            status,
            duration: duration ? `${duration}ms` : undefined
        });
    }

    worker(jobId: string, action: string, context?: LogContext) {
        this.info(`Worker: ${action}`, { jobId, ...context });
    }

    security(action: string, context?: LogContext) {
        this.warn(`Security: ${action}`, context);
        errorTracker.captureMessage(`Security event: ${action}`, 'warn', context);
    }

    /**
     * Log authentication event
     */
    auth(action: string, context?: LogContext) {
        this.info(`Auth: ${action}`, context);
    }

    /**
     * Log database operation
     */
    db(operation: string, table: string, duration?: number, context?: LogContext) {
        this.debug(`DB: ${operation} on ${table}`, {
            duration: duration ? `${duration}ms` : undefined,
            ...context
        });
    }

    /**
     * Log performance metric
     */
    performance(metric: string, value: number, unit: string = 'ms', context?: LogContext) {
        this.debug(`Performance: ${metric}=${value}${unit}`, context);
    }
}

export const logger = new Logger();
