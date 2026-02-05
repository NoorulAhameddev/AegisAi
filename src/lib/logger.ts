type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    [key: string]: any;
}

class Logger {
    private output(level: LogLevel, message: string, context?: LogContext, error?: Error) {
        const payload = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...context,
            error: error?.message,
            stack: error?.stack,
        };

        const line = JSON.stringify(payload);
        if (level === 'error') {
            console.error(line);
        } else if (level === 'warn') {
            console.warn(line);
        } else {
            console.log(line);
        }
    }

    debug(message: string, context?: LogContext) {
        this.output('debug', message, context);
    }

    info(message: string, context?: LogContext) {
        this.output('info', message, context);
    }

    warn(message: string, context?: LogContext) {
        this.output('warn', message, context);
    }

    error(message: string, error?: Error | any, context?: LogContext) {
        this.output('error', message, context, error instanceof Error ? error : undefined);
    }

    api(method: string, path: string, status: number, duration?: number) {
        this.info('API Request', {
            method,
            path,
            status,
            duration: duration ? `${duration}ms` : undefined,
        });
    }

    worker(jobId: string, action: string, context?: LogContext) {
        this.info(`Worker: ${action}`, { jobId, ...context });
    }

    security(action: string, context?: LogContext) {
        this.warn(`Security: ${action}`, context);
    }

    auth(action: string, context?: LogContext) {
        this.info(`Auth: ${action}`, context);
    }

    db(operation: string, table: string, duration?: number, context?: LogContext) {
        this.debug(`DB: ${operation} on ${table}`, {
            duration: duration ? `${duration}ms` : undefined,
            ...context,
        });
    }

    performance(metric: string, value: number, unit: string = 'ms', context?: LogContext) {
        this.debug(`Performance: ${metric}=${value}${unit}`, context);
    }
}

export const logger = new Logger();
