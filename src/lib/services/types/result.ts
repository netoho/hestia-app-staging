/**
 * Result Pattern Implementation
 * Type-safe error handling inspired by Rust's Result<T, E>
 */

import { ServiceError } from './errors';

export type Result<T, E = ServiceError> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

export type AsyncResult<T, E = ServiceError> = Promise<Result<T, E>>;

/**
 * Result helper functions
 */
export const Result = {
  ok<T>(value: T): Result<T> {
    return { ok: true, value };
  },

  error<E = ServiceError>(error: E): Result<never, E> {
    return { ok: false, error };
  },

  /**
   * Execute a function and wrap the result in a Result type
   */
  wrap<T>(fn: () => T): Result<T> {
    try {
      return Result.ok(fn());
    } catch (error) {
      return Result.error(
        error instanceof ServiceError 
          ? error 
          : new ServiceError('UNKNOWN_ERROR', (error as Error).message)
      );
    }
  },

  /**
   * Execute an async function and wrap the result in a Result type
   */
  async wrapAsync<T>(fn: () => Promise<T>): AsyncResult<T> {
    try {
      const value = await fn();
      return Result.ok(value);
    } catch (error) {
      return Result.error(
        error instanceof ServiceError 
          ? error 
          : new ServiceError('UNKNOWN_ERROR', (error as Error).message)
      );
    }
  },

  /**
   * Map over a successful result
   */
  map<T, U>(result: Result<T>, fn: (value: T) => U): Result<U> {
    if (result.ok) {
      return Result.ok(fn(result.value));
    }
    return result;
  },

  /**
   * Map over an error result
   */
  mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
    if (!result.ok) {
      return Result.error(fn(result.error));
    }
    return result as Result<T, F>;
  },

  /**
   * Chain multiple Result-returning operations
   */
  chain<T, U>(result: Result<T>, fn: (value: T) => Result<U>): Result<U> {
    if (result.ok) {
      return fn(result.value);
    }
    return result;
  },

  /**
   * Unwrap a result or throw if error
   */
  unwrap<T>(result: Result<T>): T {
    if (result.ok) {
      return result.value;
    }
    throw result.error;
  },

  /**
   * Unwrap a result or return default value
   */
  unwrapOr<T>(result: Result<T>, defaultValue: T): T {
    if (result.ok) {
      return result.value;
    }
    return defaultValue;
  },

  /**
   * Check if all results are successful
   */
  all<T>(results: Result<T>[]): Result<T[]> {
    const values: T[] = [];
    for (const result of results) {
      if (!result.ok) {
        return result;
      }
      values.push(result.value);
    }
    return Result.ok(values);
  },

  /**
   * Collect all successful results, ignore errors
   */
  collect<T>(results: Result<T>[]): T[] {
    return results
      .filter(r => r.ok)
      .map(r => (r as { ok: true; value: T }).value);
  },
};

/**
 * Service Response type for API responses
 */
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: Date;
    requestId?: string;
    [key: string]: any;
  };
}

/**
 * Convert Result to ServiceResponse for API responses
 */
export function toServiceResponse<T>(
  result: Result<T>,
  requestId?: string
): ServiceResponse<T> {
  if (result.ok) {
    return {
      success: true,
      data: result.value,
      meta: {
        timestamp: new Date(),
        requestId,
      },
    };
  }

  const error = result.error;
  if (error instanceof ServiceError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.getUserMessage(),
        details: error.context,
      },
      meta: {
        timestamp: error.timestamp,
        requestId,
      },
    };
  }

  // Fallback for non-ServiceError errors
  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      details: error,
    },
    meta: {
      timestamp: new Date(),
      requestId,
    },
  };
}