/**
 * Production-Grade Error Handling
 * Standardized error types and handling utilities
 */

import { logger } from './logger';

export enum ErrorCode {
  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  
  // Authentication Errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Server Errors
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Client Errors
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
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
    context?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed', context?: any) {
    super(message, ErrorCode.NETWORK_ERROR, undefined, true, context);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', context?: any) {
    super(message, ErrorCode.UNAUTHORIZED, 401, true, context);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', context?: any) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, true, context);
    this.name = 'ValidationError';
  }
}

/**
 * Error Handler Utility
 */
export class ErrorHandler {
  /**
   * Handle errors globally with logging and user feedback
   */
  static handle(error: any, context?: string): AppError {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else if (error.response) {
      // Axios error with response
      appError = this.handleAxiosError(error);
    } else if (error.request) {
      // Network error
      appError = new NetworkError('Network request failed - please check your connection', {
        url: error.config?.url,
      });
    } else {
      // Unknown error
      appError = new AppError(
        error.message || 'An unexpected error occurred',
        ErrorCode.UNKNOWN_ERROR,
        undefined,
        false,
        { originalError: error }
      );
    }

    // Log the error
    logger.error(
      `${context ? `[${context}] ` : ''}${appError.message}`,
      appError,
      appError.context
    );

    return appError;
  }

  /**
   * Handle Axios-specific errors
   */
  private static handleAxiosError(error: any): AppError {
    const status = error.response?.status;
    const data = error.response?.data;
    const message = data?.error || data?.message || error.message;

    switch (status) {
      case 400:
        return new ValidationError(message, { response: data });
      case 401:
        return new AuthenticationError(message, { response: data });
      case 403:
        return new AppError(message, ErrorCode.FORBIDDEN, 403, true, { response: data });
      case 404:
        return new AppError(message, ErrorCode.NOT_FOUND, 404, true, { response: data });
      case 429:
        return new AppError(
          'Too many requests - please try again later',
          ErrorCode.RATE_LIMITED,
          429,
          true,
          { response: data }
        );
      case 500:
      case 502:
      case 503:
      case 504:
        return new AppError(
          'Server error - please try again later',
          ErrorCode.SERVER_ERROR,
          status,
          true,
          { response: data }
        );
      default:
        return new AppError(message, ErrorCode.UNKNOWN_ERROR, status, true, { response: data });
    }
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: any): string {
    if (error instanceof AppError) {
      return error.message;
    }

    // Default user-friendly messages
    const errorMap: Record<ErrorCode, string> = {
      [ErrorCode.NETWORK_ERROR]: 'Unable to connect. Please check your internet connection.',
      [ErrorCode.TIMEOUT]: 'Request timed out. Please try again.',
      [ErrorCode.CONNECTION_REFUSED]: 'Unable to reach the server. Please try again later.',
      [ErrorCode.UNAUTHORIZED]: 'Please sign in to continue.',
      [ErrorCode.FORBIDDEN]: 'You don\'t have permission to perform this action.',
      [ErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',
      [ErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password.',
      [ErrorCode.VALIDATION_ERROR]: 'Please check your input and try again.',
      [ErrorCode.INVALID_INPUT]: 'Invalid input provided.',
      [ErrorCode.SERVER_ERROR]: 'Server error. Please try again later.',
      [ErrorCode.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable. Please try again later.',
      [ErrorCode.NOT_FOUND]: 'The requested resource was not found.',
      [ErrorCode.RATE_LIMITED]: 'Too many requests. Please wait and try again.',
      [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
    };

    return error.code && errorMap[error.code as ErrorCode]
      ? errorMap[error.code as ErrorCode]
      : 'An unexpected error occurred. Please try again.';
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: any): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return true; // Assume operational by default
  }
}

/**
 * Async error wrapper for safe promise handling
 */
export const catchAsync = <T>(
  fn: (...args: any[]) => Promise<T>
): ((...args: any[]) => Promise<T>) => {
  return async (...args: any[]): Promise<T> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw ErrorHandler.handle(error);
    }
  };
};
