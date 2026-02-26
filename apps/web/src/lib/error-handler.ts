import { NextResponse } from "next/server";
import { logger } from "./logger";
import { errorResponse } from "./response";
import { ZodError } from "zod";

/**
 * Standardized error handler for API routes
 * Provides consistent error responses with proper logging
 */

export interface ErrorContext {
  userId?: string;
  path?: string;
  method?: string;
  requestId?: string;
  [key: string]: any;
}

// Standard HTTP error codes with default messages
const httpErrorMap: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  503: "Service Unavailable",
};

export function handleError(
  error: any,
  context: ErrorContext = {},
): NextResponse {
  const { userId, path, method, requestId } = context;

  let status = 500;
  let message = "Internal Server Error";
  let isClientError = false;

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    status = 422;
    message = `Validation Error: ${error.errors[0].message}`;
    isClientError = true;
  }
  // Handle standard Error objects
  else if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes("Unique constraint failed")) {
      status = 409;
      message = "Resource already exists";
      isClientError = true;
    } else if (error.message.includes("not found")) {
      status = 404;
      message = "Resource not found";
      isClientError = true;
    } else if (error.message.includes("already exists")) {
      status = 409;
      message = "Resource already exists";
      isClientError = true;
    } else if (error.message.includes("Unauthorized")) {
      status = 401;
      message = "Unauthorized";
      isClientError = true;
    } else if (error.message.includes("Forbidden")) {
      status = 403;
      message = "Forbidden";
      isClientError = true;
    }
  }
  // Handle objects with status property
  else if (typeof error === "object" && error?.status) {
    status = error.status;
    message = error.message || httpErrorMap[status] || "Error";
    isClientError = status < 500;
  }

  // Log the error appropriately
  if (isClientError) {
    logger.warn(`Client Error [${status}]: ${message}`, {
      path,
      method,
      userId,
      requestId,
      ...context,
    });
  } else {
    logger.error(`Server Error [${status}]: ${message}`, error, {
      path,
      method,
      userId,
      requestId,
      ...context,
    });
  }

  // Return standardized error response
  return errorResponse(message, {
    status,
    requestId,
  });
}

/**
 * Wrap async route handler with automatic error handling
 */
export function withErrorHandling(
  handler: (req: Request) => Promise<NextResponse>,
  context?: ErrorContext,
) {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      return handleError(error, {
        ...context,
        path: new URL(req.url).pathname,
        method: req.method,
      });
    }
  };
}
