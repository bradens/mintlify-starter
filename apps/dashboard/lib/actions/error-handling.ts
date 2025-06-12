import { ActionResult, createErrorResult } from './base-action';

/**
 * Custom error types for better error handling
 */
export class DashboardError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DashboardError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    // Ensure the stack trace points to where the error was thrown
    Error.captureStackTrace(this, DashboardError);
  }
}

/**
 * Authentication and authorization errors
 */
export class AuthError extends DashboardError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUTH_ERROR', 401, true, context);
    this.name = 'AuthError';
  }
}

export class PermissionError extends DashboardError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'PERMISSION_ERROR', 403, true, context);
    this.name = 'PermissionError';
  }
}

/**
 * Validation errors
 */
export class ValidationError extends DashboardError {
  public readonly fieldErrors?: Record<string, string[]>;

  constructor(
    message: string,
    fieldErrors?: Record<string, string[]>,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', 400, true, context);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Business logic errors
 */
export class BusinessLogicError extends DashboardError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'BUSINESS_LOGIC_ERROR', 422, true, context);
    this.name = 'BusinessLogicError';
  }
}

/**
 * External service errors (AWS, Stripe, etc.)
 */
export class ExternalServiceError extends DashboardError {
  public readonly service: string;

  constructor(service: string, message: string, context?: Record<string, unknown>) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, true, context);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends DashboardError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, context?: Record<string, unknown>) {
    super(message, 'RATE_LIMIT_ERROR', 429, true, context);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends DashboardError {
  public readonly resource: string;

  constructor(resource: string, context?: Record<string, unknown>) {
    super(`${resource} not found`, 'NOT_FOUND_ERROR', 404, true, context);
    this.name = 'NotFoundError';
    this.resource = resource;
  }
}

/**
 * Conflict errors (duplicate resources, etc.)
 */
export class ConflictError extends DashboardError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFLICT_ERROR', 409, true, context);
    this.name = 'ConflictError';
  }
}

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Log context interface
 */
interface LogContext {
  userId?: string;
  action?: string;
  requestId?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  error?: Record<string, unknown>;
  attempt?: number;
  maxRetries?: number;
  delay?: number;
}

/**
 * Enhanced logger for server actions
 */
export class ActionLogger {
  private static instance: ActionLogger;

  public static getInstance(): ActionLogger {
    if (!ActionLogger.instance) {
      ActionLogger.instance = new ActionLogger();
    }
    return ActionLogger.instance;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...context,
    };

    return JSON.stringify(logData);
  }

  public debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  public info(message: string, context?: LogContext): void {
    console.log(this.formatMessage(LogLevel.INFO, message, context));
  }

  public warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, context));
  }

  public error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            ...(error instanceof DashboardError && {
              code: error.code,
              statusCode: error.statusCode,
              isOperational: error.isOperational,
              context: error.context,
            }),
          }
        : undefined,
    };

    console.error(this.formatMessage(LogLevel.ERROR, message, errorContext));
  }

  public logActionStart(action: string, userId?: string, metadata?: Record<string, unknown>): void {
    this.info(`Action started: ${action}`, {
      userId,
      action,
      metadata,
    });
  }

  public logActionSuccess(
    action: string,
    duration: number,
    userId?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.info(`Action completed: ${action}`, {
      userId,
      action,
      duration,
      metadata,
    });
  }

  public logActionError(
    action: string,
    error: Error,
    duration: number,
    userId?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.error(`Action failed: ${action}`, error, {
      userId,
      action,
      duration,
      metadata,
    });
  }
}

/**
 * Error handler for server actions
 */
export class ActionErrorHandler {
  private static logger = ActionLogger.getInstance();

  /**
   * Convert errors to appropriate action results
   */
  public static handleError<T>(error: unknown, action?: string, userId?: string): ActionResult<T> {
    this.logger.error(
      'Action error occurred',
      error instanceof Error ? error : new Error(String(error)),
      {
        action,
        userId,
      }
    );

    // Handle known error types
    if (error instanceof ValidationError) {
      return createErrorResult(error.message, error.fieldErrors) as ActionResult<T>;
    }

    if (error instanceof AuthError) {
      return createErrorResult(
        'Authentication required. Please sign in and try again.'
      ) as ActionResult<T>;
    }

    if (error instanceof PermissionError) {
      return createErrorResult(
        'You do not have permission to perform this action.'
      ) as ActionResult<T>;
    }

    if (error instanceof NotFoundError) {
      return createErrorResult(`${error.resource} not found.`) as ActionResult<T>;
    }

    if (error instanceof ConflictError) {
      return createErrorResult(error.message) as ActionResult<T>;
    }

    if (error instanceof RateLimitError) {
      return createErrorResult('Too many requests. Please try again later.') as ActionResult<T>;
    }

    if (error instanceof BusinessLogicError) {
      return createErrorResult(error.message) as ActionResult<T>;
    }

    if (error instanceof ExternalServiceError) {
      // Don't expose internal service details to users
      return createErrorResult(
        'Service temporarily unavailable. Please try again later.'
      ) as ActionResult<T>;
    }

    // Handle AWS SDK errors
    if (error && typeof error === 'object' && 'name' in error) {
      const awsError = error as { name: string; message?: string };

      switch (awsError.name) {
        case 'UsernameExistsException':
          return createErrorResult('An account with this email already exists.') as ActionResult<T>;
        case 'InvalidPasswordException':
          return createErrorResult(
            'Password does not meet security requirements.'
          ) as ActionResult<T>;
        case 'NotAuthorizedException':
          return createErrorResult(
            'Invalid credentials. Please check your email and password.'
          ) as ActionResult<T>;
        case 'UserNotConfirmedException':
          return createErrorResult(
            'Please verify your email address before signing in.'
          ) as ActionResult<T>;
        case 'LimitExceededException':
        case 'TooManyRequestsException':
          return createErrorResult('Too many requests. Please try again later.') as ActionResult<T>;
        default:
          this.logger.warn('Unhandled AWS error', { error: awsError });
      }
    }

    // Handle Stripe errors
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message?: string };

      switch (stripeError.type) {
        case 'card_error':
          return createErrorResult(
            'Payment failed. Please check your payment method.'
          ) as ActionResult<T>;
        case 'rate_limit_error':
          return createErrorResult('Too many requests. Please try again later.') as ActionResult<T>;
        case 'invalid_request_error':
          return createErrorResult('Invalid request. Please try again.') as ActionResult<T>;
        case 'api_error':
        case 'api_connection_error':
          return createErrorResult(
            'Payment service temporarily unavailable. Please try again later.'
          ) as ActionResult<T>;
        default:
          this.logger.warn('Unhandled Stripe error', { error: stripeError });
      }
    }

    // Handle generic errors
    if (error instanceof Error) {
      // Check for network errors
      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        return createErrorResult(
          'Network error. Please check your connection and try again.'
        ) as ActionResult<T>;
      }

      // Check for timeout errors
      if (error.message.includes('timeout')) {
        return createErrorResult('Request timeout. Please try again.') as ActionResult<T>;
      }

      // Log unexpected errors but don't expose details
      if (process.env.NODE_ENV === 'development') {
        return createErrorResult(`Development error: ${error.message}`) as ActionResult<T>;
      }
    }

    // Fallback for unknown errors
    return createErrorResult('An unexpected error occurred. Please try again.') as ActionResult<T>;
  }
}

/**
 * Performance monitoring utility
 */
export class ActionPerformanceMonitor {
  private static logger = ActionLogger.getInstance();

  public static async measure<T>(
    action: string,
    operation: () => Promise<T>,
    userId?: string
  ): Promise<T> {
    const startTime = Date.now();

    this.logger.logActionStart(action, userId);

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      this.logger.logActionSuccess(action, duration, userId);

      // Log slow operations
      if (duration > 5000) {
        this.logger.warn(`Slow action detected: ${action}`, {
          userId,
          action,
          duration,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logActionError(
        action,
        error instanceof Error ? error : new Error(String(error)),
        duration,
        userId
      );
      throw error;
    }
  }
}

/**
 * Retry utility for transient failures
 */
export class ActionRetryHandler {
  private static logger = ActionLogger.getInstance();

  public static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
    exponentialBackoff: boolean = true
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry operational errors
        if (error instanceof DashboardError && error.isOperational) {
          throw error;
        }

        if (attempt === maxRetries) {
          this.logger.error(`Max retries (${maxRetries}) exceeded`, lastError);
          throw lastError;
        }

        const delay = exponentialBackoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
        this.logger.warn(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`, {
          error: { message: lastError.message, name: lastError.name },
          attempt,
          maxRetries,
          delay,
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}
