type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: any;
}

// Lazy load Sentry to avoid circular dependencies
let Sentry: typeof import("@sentry/nextjs") | null = null;
async function getSentry() {
  if (!Sentry && typeof window === "undefined") {
    try {
      Sentry = await import("@sentry/nextjs");
    } catch (e) {
      // Sentry not available (development or not configured)
    }
  }
  return Sentry;
}

// CRITICAL: PII redaction to prevent sensitive data in logs
function redactPII(context?: LogContext): LogContext {
  if (!context) return {};

  const redacted: LogContext = { ...context };
  const sensitiveFields = [
    "password",
    "token",
    "secret",
    "apiKey",
    "pin",
    "ssn",
    "creditCard",
    "email",
    "phone",
  ];

  for (const key in redacted) {
    const lowerKey = key.toLowerCase();

    // Check if field name matches sensitive patterns
    if (sensitiveFields.some((field) => lowerKey.includes(field))) {
      const value = redacted[key];
      if (typeof value === "string") {
        // Show first 3 chars + asterisks for short strings, otherwise just [REDACTED]
        redacted[key] =
          value.length <= 3 ? "[REDACTED]" : value.substring(0, 3) + "***";
      } else if (value !== null && value !== undefined) {
        redacted[key] = "[REDACTED]";
      }
    }
  }

  return redacted;
}

class Logger {
  private output(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ) {
    // Redact PII before logging
    const redactedContext = redactPII(context);

    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...redactedContext,
      error: error?.message,
      stack: error?.stack,
    };

    const line = JSON.stringify(payload);
    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  debug(message: string, context?: LogContext) {
    this.output("debug", message, context);
  }

  info(message: string, context?: LogContext) {
    this.output("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.output("warn", message, context);
  }

  error(message: string, error?: Error | any, context?: LogContext) {
    this.output(
      "error",
      message,
      context,
      error instanceof Error ? error : undefined,
    );

    // Send to Sentry if available (async, non-blocking)
    if (error instanceof Error) {
      getSentry()
        .then((sentry) => {
          if (sentry && process.env.SENTRY_DSN) {
            sentry.captureException(error, {
              level: "error",
              tags: {
                logger: "custom",
              },
              extra: {
                message,
                ...redactPII(context),
              },
            });
          }
        })
        .catch(() => {
          // Silently fail if Sentry unavailable
        });
    }
  }

  api(method: string, path: string, status: number, duration?: number) {
    this.info("API Request", {
      method,
      path,
      status,
      duration: duration ? `${duration}ms` : undefined,
    });
  }

  worker(jobId: string, action: string, context?: LogContext) {
    this.info(`Worker: ${action}`, { jobId, ...redactPII(context) });
  }

  security(action: string, context?: LogContext) {
    this.warn(`Security: ${action}`, redactPII(context));
  }

  auth(action: string, context?: LogContext) {
    this.info(`Auth: ${action}`, redactPII(context));
  }

  db(
    operation: string,
    table: string,
    duration?: number,
    context?: LogContext,
  ) {
    this.debug(`DB: ${operation} on ${table}`, {
      duration: duration ? `${duration}ms` : undefined,
      ...redactPII(context),
    });
  }

  performance(
    metric: string,
    value: number,
    unit: string = "ms",
    context?: LogContext,
  ) {
    this.debug(`Performance: ${metric}=${value}${unit}`, redactPII(context));
  }
}

export const logger = new Logger();
