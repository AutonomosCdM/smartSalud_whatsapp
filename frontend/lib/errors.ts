/**
 * Custom Error Classes - smartSalud v4
 * Application-specific error types for API and validation failures
 */

/**
 * Base application error class
 * All custom errors extend this class
 */
export class ApplicationError extends Error {
  public readonly code: string;
  public readonly timestamp: Date;

  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * API Connection Error
 * Thrown when unable to establish connection to API server
 * Common causes: Server offline, network issues, wrong URL
 */
export class ApiConnectionError extends ApplicationError {
  constructor(message = "Unable to connect to API server") {
    super(message, "CONNECTION_ERROR");
  }
}

/**
 * API Timeout Error
 * Thrown when API request exceeds timeout threshold
 * Default timeout: 10 seconds
 */
export class ApiTimeoutError extends ApplicationError {
  public readonly timeout: number;

  constructor(timeout = 10000, message = `Request timed out after ${timeout}ms`) {
    super(message, "TIMEOUT");
    this.timeout = timeout;
  }
}

/**
 * API Server Error
 * Thrown when API returns non-2xx response
 * Includes HTTP status code and status text
 */
export class ApiServerError extends ApplicationError {
  public readonly status: number;
  public readonly statusText: string;

  constructor(status: number, statusText: string) {
    super(`API server error: ${status} ${statusText}`, "API_ERROR");
    this.status = status;
    this.statusText = statusText;
  }
}

/**
 * Validation Error
 * Thrown when data validation fails
 * Includes field name and validation rule that failed
 */
export class ValidationError extends ApplicationError {
  public readonly field?: string;
  public readonly rule?: string;

  constructor(message: string, field?: string, rule?: string) {
    super(message, "VALIDATION_ERROR");
    this.field = field;
    this.rule = rule;
  }
}

/**
 * Type guard to check if error is an ApplicationError
 */
export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}

/**
 * Type guard to check if error is a specific application error type
 */
export function isApiConnectionError(error: unknown): error is ApiConnectionError {
  return error instanceof ApiConnectionError;
}

export function isApiTimeoutError(error: unknown): error is ApiTimeoutError {
  return error instanceof ApiTimeoutError;
}

export function isApiServerError(error: unknown): error is ApiServerError {
  return error instanceof ApiServerError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}
