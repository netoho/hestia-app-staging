/**
 * Service Error Types and Codes
 * Centralized error handling for all services
 */

export enum ErrorCode {
  // General errors (1000-1999)
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RATE_LIMITED = 'RATE_LIMITED',

  // Database errors (2000-2999)
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  DATABASE_CONSTRAINT_ERROR = 'DATABASE_CONSTRAINT_ERROR',

  // Auth errors (3000-3999)
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Business logic errors (4000-4999)
  POLICY_NOT_FOUND = 'POLICY_NOT_FOUND',
  POLICY_ALREADY_EXISTS = 'POLICY_ALREADY_EXISTS',
  POLICY_INVALID_STATE = 'POLICY_INVALID_STATE',
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
  [ErrorCode.UNKNOWN_ERROR]: 'Ha ocurrido un error inesperado. Por favor intenta de nuevo.',
  [ErrorCode.VALIDATION_ERROR]: 'Los datos proporcionados no son válidos.',
  [ErrorCode.NOT_FOUND]: 'El recurso solicitado no fue encontrado.',
  [ErrorCode.ALREADY_EXISTS]: 'Este recurso ya existe.',
  [ErrorCode.PERMISSION_DENIED]: 'No tienes permisos para realizar esta acción.',
  [ErrorCode.RATE_LIMITED]: 'Has excedido el límite de solicitudes. Por favor intenta más tarde.',

  [ErrorCode.DATABASE_ERROR]: 'Error al acceder a la base de datos.',
  [ErrorCode.DATABASE_CONNECTION_ERROR]: 'No se pudo conectar a la base de datos.',
  [ErrorCode.DATABASE_QUERY_ERROR]: 'Error al ejecutar la consulta.',
  [ErrorCode.DATABASE_CONSTRAINT_ERROR]: 'Los datos violan las restricciones de la base de datos.',

  [ErrorCode.AUTHENTICATION_ERROR]: 'Error de autenticación.',
  [ErrorCode.INVALID_CREDENTIALS]: 'Credenciales inválidas.',
  [ErrorCode.SESSION_EXPIRED]: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
  [ErrorCode.INVALID_TOKEN]: 'Token de acceso inválido.',

  [ErrorCode.POLICY_NOT_FOUND]: 'La protección no fue encontrada.',
  [ErrorCode.POLICY_ALREADY_EXISTS]: 'Ya existe una protección con estos datos.',
  [ErrorCode.POLICY_INVALID_STATE]: 'La protección no está en el estado correcto para esta operación.',
  [ErrorCode.PAYMENT_FAILED]: 'El pago no pudo ser procesado.',
  [ErrorCode.PAYMENT_ALREADY_PROCESSED]: 'Este pago ya ha sido procesado.',
  [ErrorCode.INSUFFICIENT_FUNDS]: 'Fondos insuficientes para completar la transacción.',

  [ErrorCode.EMAIL_SEND_FAILED]: 'No se pudo enviar el correo electrónico.',
  [ErrorCode.STORAGE_UPLOAD_FAILED]: 'Error al subir el archivo.',
  [ErrorCode.STRIPE_API_ERROR]: 'Error al procesar el pago.',
  [ErrorCode.PDF_GENERATION_FAILED]: 'Error al generar el documento PDF.',
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
