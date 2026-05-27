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
  /**
   * Optional caller-supplied user-facing message (Spanish, friendly).
   * Falls back to the code-based mapping in `getUserMessage()` when omitted.
   * Used by the tRPC errorFormatter to populate `data.userMessage` on the
   * wire so the client can show it without translation logic.
   */
  public readonly userMessage?: string;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    context?: ErrorContext,
    isOperational: boolean = true,
    userMessage?: string,
  ) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.userMessage = userMessage;

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
      userMessage: this.userMessage,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }

  /**
   * Get user-friendly Spanish message. Resolution order:
   *   1. Caller-supplied `userMessage` (most specific)
   *   2. Code-based default mapping (`userFriendlyMessages`)
   *   3. The raw `message` (last resort — should already be Spanish if
   *      the code path was authored after PR-3 of the regression sweep)
   */
  getUserMessage(): string {
    if (this.userMessage) return this.userMessage;
    return userFriendlyMessages[this.code] || this.message;
  }
}

// Friendly Spanish defaults per error code. Per CLAUDE.md the user-facing
// language is Spanish (and we say "protección", never "póliza"). These are
// the fallbacks; callers that need more specificity pass `userMessage` to
// the ServiceError constructor.
const userFriendlyMessages: Record<ErrorCode, string> = {
  [ErrorCode.INTERNAL_ERROR]: 'Ocurrió un error interno. Intenta nuevamente.',
  [ErrorCode.UNKNOWN_ERROR]: 'Ocurrió un error inesperado. Intenta nuevamente.',
  [ErrorCode.VALIDATION_ERROR]: 'La información proporcionada no es válida.',
  [ErrorCode.NOT_FOUND]: 'No se encontró el recurso solicitado.',
  [ErrorCode.ALREADY_EXISTS]: 'El recurso ya existe.',
  [ErrorCode.PERMISSION_DENIED]: 'No tienes permiso para realizar esta acción.',
  [ErrorCode.RATE_LIMITED]: 'Demasiadas solicitudes. Intenta en unos minutos.',
  [ErrorCode.INVALID_REQUEST]: 'La solicitud no es válida.',

  [ErrorCode.DATABASE_ERROR]: 'Error de acceso a la base de datos. Si persiste, contacta a soporte.',
  [ErrorCode.DATABASE_CONNECTION_ERROR]: 'No se pudo conectar a la base de datos.',
  [ErrorCode.DATABASE_QUERY_ERROR]: 'Error al ejecutar la consulta.',
  [ErrorCode.DATABASE_CONSTRAINT_ERROR]: 'Los datos no cumplen las restricciones requeridas.',

  [ErrorCode.AUTHENTICATION_ERROR]: 'Error de autenticación.',
  [ErrorCode.UNAUTHORIZED]: 'Acceso no autorizado.',
  [ErrorCode.FORBIDDEN]: 'Acceso prohibido.',
  [ErrorCode.INVALID_CREDENTIALS]: 'Credenciales inválidas.',
  [ErrorCode.SESSION_EXPIRED]: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
  [ErrorCode.INVALID_TOKEN]: 'El enlace de acceso no es válido.',
  [ErrorCode.TOKEN_EXPIRED]: 'El enlace de acceso ha expirado. Solicita uno nuevo.',

  [ErrorCode.POLICY_NOT_FOUND]: 'No se encontró la protección.',
  [ErrorCode.POLICY_ALREADY_EXISTS]: 'Ya existe una protección con estos datos.',
  [ErrorCode.POLICY_INVALID_STATE]: 'La protección no está en el estado correcto para esta operación.',
  [ErrorCode.ALREADY_COMPLETE]: 'Esta operación ya fue completada.',
  [ErrorCode.PAYMENT_FAILED]: 'No se pudo procesar el pago.',
  [ErrorCode.PAYMENT_ALREADY_PROCESSED]: 'Este pago ya fue procesado.',
  [ErrorCode.INSUFFICIENT_FUNDS]: 'Fondos insuficientes para completar la transacción.',

  [ErrorCode.EMAIL_SEND_FAILED]: 'No se pudo enviar el correo.',
  [ErrorCode.STORAGE_UPLOAD_FAILED]: 'No se pudo subir el archivo.',
  [ErrorCode.STRIPE_API_ERROR]: 'Error al procesar el pago.',
  [ErrorCode.PDF_GENERATION_FAILED]: 'No se pudo generar el documento PDF.',
};

/**
 * Map a ServiceError ErrorCode to the corresponding tRPC error code. Used
 * by routers via `serviceToTRPCError(...)` to keep tRPC code + ServiceError
 * cause in sync — the errorFormatter then pulls the Spanish userMessage
 * straight off the cause and surfaces it as `data.userMessage`.
 */
export function serviceErrorCodeToTRPCCode(
  code: ErrorCode,
): 'NOT_FOUND' | 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'CONFLICT' | 'INTERNAL_SERVER_ERROR' | 'TOO_MANY_REQUESTS' {
  switch (code) {
    case ErrorCode.NOT_FOUND:
    case ErrorCode.POLICY_NOT_FOUND:
      return 'NOT_FOUND';
    case ErrorCode.UNAUTHORIZED:
    case ErrorCode.AUTHENTICATION_ERROR:
    case ErrorCode.SESSION_EXPIRED:
    case ErrorCode.INVALID_TOKEN:
    case ErrorCode.TOKEN_EXPIRED:
    case ErrorCode.INVALID_CREDENTIALS:
      return 'UNAUTHORIZED';
    case ErrorCode.FORBIDDEN:
    case ErrorCode.PERMISSION_DENIED:
      return 'FORBIDDEN';
    case ErrorCode.ALREADY_EXISTS:
    case ErrorCode.POLICY_ALREADY_EXISTS:
    case ErrorCode.PAYMENT_ALREADY_PROCESSED:
    case ErrorCode.ALREADY_COMPLETE:
      return 'CONFLICT';
    case ErrorCode.RATE_LIMITED:
      return 'TOO_MANY_REQUESTS';
    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.INVALID_REQUEST:
    case ErrorCode.POLICY_INVALID_STATE:
    case ErrorCode.PAYMENT_FAILED:
    case ErrorCode.INSUFFICIENT_FUNDS:
    case ErrorCode.STORAGE_UPLOAD_FAILED:
      return 'BAD_REQUEST';
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

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
