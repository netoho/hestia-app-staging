/**
 * Base Service Abstract Class
 * Provides common functionality for all services
 */

import { PrismaClient } from '@prisma/client';
import prisma from '@/lib/prisma';
import { Result, AsyncResult } from '../types/result';
import { ServiceError, ErrorCode, Errors } from '../types/errors';

export interface ServiceContext {
  userId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ServiceOptions {
  prisma?: PrismaClient;
  enableCache?: boolean;
}

export abstract class BaseService {
  protected prisma: PrismaClient;
  protected context?: ServiceContext;
  protected enableCache: boolean;

  constructor(options: ServiceOptions = {}) {
    this.prisma = options.prisma || prisma;
    this.enableCache = options.enableCache ?? false;
  }

  /**
   * Set the service context for the current operation
   */
  withContext(context: ServiceContext): this {
    this.context = context;
    return this;
  }

  /**
   * Log service operations
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logData = {
      service: this.constructor.name,
      level,
      message,
      context: this.context,
      data,
      timestamp: new Date().toISOString(),
    };

    if (level === 'error') {
      console.error(JSON.stringify(logData));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(logData));
    } else {
    }
  }

  /**
   * Wrap database operations with error handling
   */
  protected async executeDbOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): AsyncResult<T> {
    try {
      const result = await operation();
      return Result.ok(result);
    } catch (error: any) {
      this.log('error', `Database operation failed: ${operationName}`, error);

      // Handle specific Prisma errors
      if (error.code === 'P2002') {
        return Result.error(
          new ServiceError(
            ErrorCode.ALREADY_EXISTS,
            'Resource already exists',
            409,
            { operation: operationName, constraint: error.meta?.target }
          )
        );
      }

      if (error.code === 'P2025') {
        return Result.error(
          new ServiceError(
            ErrorCode.NOT_FOUND,
            'Resource not found',
            404,
            { operation: operationName }
          )
        );
      }

      if (error.code === 'P2003') {
        return Result.error(
          new ServiceError(
            ErrorCode.DATABASE_CONSTRAINT_ERROR,
            'Foreign key constraint failed',
            400,
            { operation: operationName, field: error.meta?.field_name }
          )
        );
      }

      return Result.error(Errors.database(operationName, error));
    }
  }

  /**
   * Validate input data
   */
  protected validate<T>(
    data: T,
    validator: (data: T) => string | null
  ): Result<T> {
    const error = validator(data);
    if (error) {
      return Result.error(
        new ServiceError(
          ErrorCode.VALIDATION_ERROR,
          error,
          400,
          { data }
        )
      );
    }
    return Result.ok(data);
  }

  /**
   * Check authorization
   */
  protected authorize(
    condition: boolean,
    message: string = 'Unauthorized'
  ): Result<void> {
    if (!condition) {
      return Result.error(Errors.unauthorized(message));
    }
    return Result.ok(undefined);
  }

  /**
   * Execute with transaction
   */
  protected async executeTransaction<T>(
    operations: (tx: PrismaClient) => Promise<T>
  ): AsyncResult<T> {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        return await operations(tx as PrismaClient);
      });
      return Result.ok(result);
    } catch (error: any) {
      this.log('error', 'Transaction failed', error);
      return Result.error(
        new ServiceError(
          ErrorCode.DATABASE_ERROR,
          'Transaction failed',
          500,
          { error: error.message }
        )
      );
    }
  }

  /**
   * Cache key generator
   */
  protected getCacheKey(prefix: string, params: any): string {
    const paramStr = JSON.stringify(params, Object.keys(params).sort());
    return `${this.constructor.name}:${prefix}:${paramStr}`;
  }
}

/**
 * Service Interface for dependency injection
 */
export interface IService {
  withContext(context: ServiceContext): this;
}

/**
 * CRUD Service Interface
 */
export interface ICrudService<T, CreateDTO, UpdateDTO> extends IService {
  findById(id: string): AsyncResult<T | null>;
  findAll(filter?: any): AsyncResult<T[]>;
  create(data: CreateDTO): AsyncResult<T>;
  update(id: string, data: UpdateDTO): AsyncResult<T>;
  delete(id: string): AsyncResult<boolean>;
}
