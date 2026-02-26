/**
 * Production-Grade Error Handling
 * Standardized error types and handling utilities
 */

import { logger } from "./logger";
import { Alert } from "react-native";

export enum ErrorCode {
  // Network Errors
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",
  CONNECTION_REFUSED = "CONNECTION_REFUSED",

  // Authentication Errors
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",

  // Validation Errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",

  // Server Errors
  SERVER_ERROR = "SERVER_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",

  // Client Errors
  NOT_FOUND = "NOT_FOUND",
  RATE_LIMITED = "RATE_LIMITED",

  // Unknown
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export class AppError extends Error {
  code: ErrorCode;
  statusCode?: number;
  isOperational: boolean;
  context?: any;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    statusCode?: number,
    isOperational: boolean = true,
    context?: any,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class NetworkError extends AppError {
  constructor(message: string = "Network request failed", context?: any) {
    super(message, ErrorCode.NETWORK_ERROR, undefined, true, context);
    this.name = "NetworkError";
  }
}

/**
 * Error Handler Utility
 */
export class ErrorHandler {
  static handle(error: any, context?: string): AppError {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else if (error.code === "ECONNABORTED") {
      appError = new AppError("Server connection timed out", ErrorCode.TIMEOUT);
    } else if (error.message === "Network Error" || !error.response) {
      // This is the "Max Retries Reached" trigger
      appError = new NetworkError(
        "Server is unreachable. Please ensure your backend is running and you are on the same WiFi network.",
        { originalError: error },
      );

      // Visual Alert for Development
      if (__DEV__) {
        Alert.alert(
          "Backend Unreachable",
          "The mobile app cannot find the API server. \n\n1. Check if backend is running.\n2. Verify WiFi connection.",
        );
      }
    } else {
      appError = this.handleAxiosError(error);
    }

    logger.error(
      `${context ? `[${context}] ` : ""}${appError.message}`,
      appError,
      appError.context,
    );

    return appError;
  }

  private static handleAxiosError(error: any): AppError {
    const status = error.response?.status;
    const data = error.response?.data;
    const message = data?.error || data?.message || error.message;

    switch (status) {
      case 400:
        return new AppError(message, ErrorCode.VALIDATION_ERROR, 400);
      case 401:
        return new AppError(message, ErrorCode.UNAUTHORIZED, 401);
      case 429:
        return new AppError("Too many requests", ErrorCode.RATE_LIMITED, 429);
      case 500:
        return new AppError(
          "Internal server error",
          ErrorCode.SERVER_ERROR,
          500,
        );
      default:
        return new AppError(message, ErrorCode.UNKNOWN_ERROR, status);
    }
  }
}
