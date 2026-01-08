/**
 * tRPC Error Handler Utilities
 *
 * Consolidates tRPC error handling patterns used across routers.
 * Provides consistent error responses for common scenarios.
 */

import { TRPCError } from '@trpc/server';
import { ServiceError, ErrorCode } from '@/lib/services/types/errors';
import type { ZodError } from 'zod';

/**
 * Maps ServiceError codes to tRPC error codes
 */
const errorCodeMap: Record<ErrorCode, TRPCError['code']> = {
  [ErrorCode.INTERNAL_ERROR]: 'INTERNAL_SERVER_ERROR',
  [ErrorCode.UNKNOWN_ERROR]: 'INTERNAL_SERVER_ERROR',
  [ErrorCode.VALIDATION_ERROR]: 'BAD_REQUEST',
  [ErrorCode.NOT_FOUND]: 'NOT_FOUND',
  [ErrorCode.ALREADY_EXISTS]: 'CONFLICT',
  [ErrorCode.PERMISSION_DENIED]: 'FORBIDDEN',
  [ErrorCode.RATE_LIMITED]: 'TOO_MANY_REQUESTS',
  [ErrorCode.INVALID_REQUEST]: 'BAD_REQUEST',

  [ErrorCode.DATABASE_ERROR]: 'INTERNAL_SERVER_ERROR',
  [ErrorCode.DATABASE_CONNECTION_ERROR]: 'INTERNAL_SERVER_ERROR',
  [ErrorCode.DATABASE_QUERY_ERROR]: 'INTERNAL_SERVER_ERROR',
  [ErrorCode.DATABASE_CONSTRAINT_ERROR]: 'CONFLICT',

  [ErrorCode.AUTHENTICATION_ERROR]: 'UNAUTHORIZED',
  [ErrorCode.UNAUTHORIZED]: 'UNAUTHORIZED',
  [ErrorCode.FORBIDDEN]: 'FORBIDDEN',
  [ErrorCode.INVALID_CREDENTIALS]: 'UNAUTHORIZED',
  [ErrorCode.SESSION_EXPIRED]: 'UNAUTHORIZED',
  [ErrorCode.INVALID_TOKEN]: 'UNAUTHORIZED',
  [ErrorCode.TOKEN_EXPIRED]: 'UNAUTHORIZED',

  [ErrorCode.POLICY_NOT_FOUND]: 'NOT_FOUND',
  [ErrorCode.POLICY_ALREADY_EXISTS]: 'CONFLICT',
  [ErrorCode.POLICY_INVALID_STATE]: 'PRECONDITION_FAILED',
  [ErrorCode.ALREADY_COMPLETE]: 'PRECONDITION_FAILED',
  [ErrorCode.PAYMENT_FAILED]: 'BAD_REQUEST',
  [ErrorCode.PAYMENT_ALREADY_PROCESSED]: 'CONFLICT',
  [ErrorCode.INSUFFICIENT_FUNDS]: 'BAD_REQUEST',

  [ErrorCode.EMAIL_SEND_FAILED]: 'INTERNAL_SERVER_ERROR',
  [ErrorCode.STORAGE_UPLOAD_FAILED]: 'INTERNAL_SERVER_ERROR',
  [ErrorCode.STRIPE_API_ERROR]: 'INTERNAL_SERVER_ERROR',
  [ErrorCode.PDF_GENERATION_FAILED]: 'INTERNAL_SERVER_ERROR',
};

/**
 * Converts a ServiceError to a TRPCError
 */
export function serviceErrorToTRPC(error: ServiceError): TRPCError {
  const code = errorCodeMap[error.code] || 'INTERNAL_SERVER_ERROR';

  return new TRPCError({
    code,
    message: error.message,
    cause: error,
  });
}

/**
 * Throws a TRPCError for a ServiceError
 * Use when handling Result.error cases
 */
export function throwServiceError(error: ServiceError): never {
  throw serviceErrorToTRPC(error);
}

/**
 * Throws a NOT_FOUND TRPCError
 * @param resource - Name of the resource (e.g., 'Policy', 'User')
 * @param id - Optional ID of the resource
 */
export function throwNotFound(resource: string, id?: string): never {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: id ? `${resource} not found: ${id}` : `${resource} not found`,
  });
}

/**
 * Throws a FORBIDDEN TRPCError
 * @param message - Optional custom message
 */
export function throwForbidden(message?: string): never {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: message || 'You do not have permission to perform this action',
  });
}

/**
 * Throws an UNAUTHORIZED TRPCError
 * @param message - Optional custom message
 */
export function throwUnauthorized(message?: string): never {
  throw new TRPCError({
    code: 'UNAUTHORIZED',
    message: message || 'Authentication required',
  });
}

/**
 * Throws a BAD_REQUEST TRPCError for validation errors
 * @param message - Error message
 * @param errors - Optional validation error details
 */
export function throwValidationError(message: string, errors?: Record<string, string>): never {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message,
    cause: errors,
  });
}

/**
 * Handles Zod validation errors and throws appropriate TRPCError
 * @param error - Zod error object
 */
export function handleZodError(error: ZodError): never {
  const formattedErrors: Record<string, string> = {};

  error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    formattedErrors[path] = issue.message;
  });

  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Validation failed',
    cause: formattedErrors,
  });
}

/**
 * Throws an INTERNAL_SERVER_ERROR TRPCError
 * @param message - Optional custom message
 */
export function throwInternalError(message?: string): never {
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: message || 'An unexpected error occurred',
  });
}

/**
 * Throws a CONFLICT TRPCError for duplicate resources
 * @param resource - Name of the resource
 */
export function throwConflict(resource: string): never {
  throw new TRPCError({
    code: 'CONFLICT',
    message: `${resource} already exists`,
  });
}

/**
 * Throws a PRECONDITION_FAILED TRPCError
 * @param message - Error message describing the failed precondition
 */
export function throwPreconditionFailed(message: string): never {
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message,
  });
}

/**
 * Handles Result<T> from services and throws TRPCError if error
 * Returns value if successful
 */
export function unwrapOrThrow<T>(result: { ok: boolean; value?: T; error?: ServiceError }): T {
  if (!result.ok || !result.value) {
    if (result.error) {
      throw serviceErrorToTRPC(result.error);
    }
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Operation failed',
    });
  }
  return result.value;
}

/**
 * Asserts a condition and throws NOT_FOUND if falsy
 * Type guard that narrows the type
 */
export function assertFound<T>(
  value: T | null | undefined,
  resource: string,
  id?: string
): asserts value is T {
  if (!value) {
    throwNotFound(resource, id);
  }
}

/**
 * Asserts user has permission and throws FORBIDDEN if not
 */
export function assertPermission(condition: boolean, message?: string): void {
  if (!condition) {
    throwForbidden(message);
  }
}
