/**
 * Service Error Types and Codes
 * Centralized error handling for all services
 */

export enum ErrorCode {
  // General errors (1000-1999)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_REQUEST = 'INVALID_REQUEST',

  // Database errors (2000-2999)
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  DATABASE_CONSTRAINT_ERROR = 'DATABASE_CONSTRAINT_ERROR',

  // Auth errors (3000-3999)
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Business logic errors (4000-4999)
  POLICY_NOT_FOUND = 'POLICY_NOT_FOUND',
  POLICY_ALREADY_EXISTS = 'POLICY_ALREADY_EXISTS',
  POLICY_INVALID_STATE = 'POLICY_INVALID_STATE',
  ALREADY_COMPLETE = 'ALREADY_COMPLETE',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_ALREADY_PROCESSED = 'PAYMENT_ALREADY_PROCESSED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',

  // External service errors (5000-5999)
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',
  STORAGE_UPLOAD_FAILED = 'STORAGE_UPLOAD_FAILED',
  STRIPE_API_ERROR = 'STRIPE_API_ERROR',
  PDF_GENERATION_FAILED = 'PDF_GENERATION_FAILED',
}

export interface ErrorContext {
  [key: string]: any;
}

export class ServiceError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly context?: ErrorContext;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    context?: ErrorContext,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.isOperational = isOperational;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, ServiceError);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return userFriendlyMessages[this.code] || this.message;
  }
}

// User-friendly error messages
const userFriendlyMessages: Record<ErrorCode, string> = {
  [ErrorCode.INTERNAL_ERROR]: 'An internal error occurred. Please try again.',
  [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
  [ErrorCode.VALIDATION_ERROR]: 'The provided data is invalid.',
  [ErrorCode.NOT_FOUND]: 'The requested resource was not found.',
  [ErrorCode.ALREADY_EXISTS]: 'This resource already exists.',
  [ErrorCode.PERMISSION_DENIED]: 'You do not have permission to perform this action.',
  [ErrorCode.RATE_LIMITED]: 'Rate limit exceeded. Please try again later.',
  [ErrorCode.INVALID_REQUEST]: 'Invalid request.',

  [ErrorCode.DATABASE_ERROR]: 'Database access error.',
  [ErrorCode.DATABASE_CONNECTION_ERROR]: 'Could not connect to the database.',
  [ErrorCode.DATABASE_QUERY_ERROR]: 'Error executing database query.',
  [ErrorCode.DATABASE_CONSTRAINT_ERROR]: 'Data violates database constraints.',

  [ErrorCode.AUTHENTICATION_ERROR]: 'Authentication error.',
  [ErrorCode.UNAUTHORIZED]: 'Unauthorized access.',
  [ErrorCode.FORBIDDEN]: 'Access forbidden.',
  [ErrorCode.INVALID_CREDENTIALS]: 'Invalid credentials.',
  [ErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  [ErrorCode.INVALID_TOKEN]: 'Invalid access token.',
  [ErrorCode.TOKEN_EXPIRED]: 'Access token has expired.',

  [ErrorCode.POLICY_NOT_FOUND]: 'Policy not found.',
  [ErrorCode.POLICY_ALREADY_EXISTS]: 'A policy with this data already exists.',
  [ErrorCode.POLICY_INVALID_STATE]: 'Policy is not in the correct state for this operation.',
  [ErrorCode.ALREADY_COMPLETE]: 'This operation has already been completed.',
  [ErrorCode.PAYMENT_FAILED]: 'Payment could not be processed.',
  [ErrorCode.PAYMENT_ALREADY_PROCESSED]: 'This payment has already been processed.',
  [ErrorCode.INSUFFICIENT_FUNDS]: 'Insufficient funds to complete the transaction.',

  [ErrorCode.EMAIL_SEND_FAILED]: 'Failed to send email.',
  [ErrorCode.STORAGE_UPLOAD_FAILED]: 'Failed to upload file.',
  [ErrorCode.STRIPE_API_ERROR]: 'Payment processing error.',
  [ErrorCode.PDF_GENERATION_FAILED]: 'Failed to generate PDF document.',
};

/**
 * Error factory functions for common scenarios
 */
export const Errors = {
  notFound: (resource: string, id?: string) =>
    new ServiceError(
      ErrorCode.NOT_FOUND,
      `${resource} not found${id ? `: ${id}` : ''}`,
      404,
      { resource, id }
    ),

  validation: (field: string, message: string) =>
    new ServiceError(
      ErrorCode.VALIDATION_ERROR,
      `Validation error: ${message}`,
      400,
      { field, validationMessage: message }
    ),

  database: (operation: string, error: any) =>
    new ServiceError(
      ErrorCode.DATABASE_ERROR,
      `Database error during ${operation}`,
      500,
      { operation, originalError: error?.message || error }
    ),

  unauthorized: (reason?: string) =>
    new ServiceError(
      ErrorCode.PERMISSION_DENIED,
      reason || 'Unauthorized access',
      403,
      { reason }
    ),

  authentication: (reason?: string) =>
    new ServiceError(
      ErrorCode.AUTHENTICATION_ERROR,
      reason || 'Authentication failed',
      401,
      { reason }
    ),

  external: (service: string, error: any) =>
    new ServiceError(
      ErrorCode.UNKNOWN_ERROR,
      `External service error: ${service}`,
      502,
      { service, originalError: error?.message || error }
    ),
} as const;
