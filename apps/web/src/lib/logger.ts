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
const SENSITIVE_FIELDS = [
  "password",
  "pass",
  "token",
  "secret",
  "apikey",
  "api_key",
  "pin",
  "ssn",
  "creditcard",
  "credit_card",
  "cvv",
  "email",
  "phone",
  "session",
  "credential",
  "authorization",
  "privatekey",
  "private_key",
];

export function redactPII(context?: LogContext | any): any {
  if (!context || typeof context !== "object") return context;

  if (Array.isArray(context)) {
    return context.map((item) => redactPII(item));
  }

  const redacted: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();

    if (value !== null && typeof value === "object") {
      // Recursive sanitization for nested objects and arrays
      redacted[key] = redactPII(value);
    } else if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
      // 100% masking for PINs, passwords, session tokens, and secrets (zero partial character leakage)
      redacted[key] = "[REDACTED]";
    } else {
      redacted[key] = value;
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
