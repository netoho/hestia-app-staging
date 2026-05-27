/**
 * Client-side helper for turning a tRPC client error into a friendly
 * toast/banner payload.
 *
 * The tRPC server's `errorFormatter` populates `data.userMessage`
 * (always Spanish) and `data.fieldErrorCount` (number, may be 0). This
 * helper reads those fields safely, with sensible fallbacks for the
 * cases where the error didn't come from our backend at all (network
 * errors, aborted requests, etc.).
 *
 * Usage:
 *   const { title, description } = getFriendlyError(err);
 *   toast({ title, description, variant: 'destructive' });
 */

type AnyError = unknown;

export interface FriendlyError {
  /** Short toast title — usually generic by error class. */
  title: string;
  /** Longer description with field-count suffix when applicable. */
  description: string;
}

export interface MissingField {
  field?: string;
  message?: string;
  code?: string;
}

export interface ForceCompleteState {
  /** True when the server signals the error is resolvable by re-trying with skipValidation: true. */
  requiresForce: boolean;
  /** List of fields the completeness check rejected (may be empty). */
  missingFields: MissingField[];
  /** List of required-document categories that haven't been uploaded yet (may be empty). */
  missingDocuments: string[];
}

interface TRPCErrorShape {
  message?: string;
  data?: {
    code?: string;
    userMessage?: string;
    fieldErrorCount?: number;
    requiresForce?: boolean;
    missingFields?: unknown[];
    missingDocuments?: unknown[];
    zodError?: {
      fieldErrors?: Record<string, string[]>;
      formErrors?: string[];
    } | null;
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readUserMessage(err: TRPCErrorShape): string | undefined {
  const data = err.data;
  if (!data) return undefined;
  if (typeof data.userMessage === 'string' && data.userMessage.length > 0) {
    return data.userMessage;
  }
  return undefined;
}

function readFieldErrorCount(err: TRPCErrorShape): number {
  const data = err.data;
  if (!data) return 0;
  if (typeof data.fieldErrorCount === 'number') return data.fieldErrorCount;
  // Fallback for older payloads (or non-tRPC errors with a zodError attached).
  const zod = data.zodError;
  if (!zod) return 0;
  const fieldCount = zod.fieldErrors
    ? Object.values(zod.fieldErrors).reduce(
        (acc, list) => acc + (Array.isArray(list) ? list.length : 0),
        0,
      )
    : 0;
  const formCount = zod.formErrors?.length ?? 0;
  return fieldCount + formCount;
}

function fallbackDescription(err: AnyError): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string') return err;
  return 'Ocurrió un error inesperado. Intenta nuevamente.';
}

function fallbackTitle(code: string | undefined): string {
  switch (code) {
    case 'UNAUTHORIZED':
      return 'Sesión expirada';
    case 'FORBIDDEN':
      return 'Acceso denegado';
    case 'NOT_FOUND':
      return 'No encontrado';
    case 'BAD_REQUEST':
    case 'UNPROCESSABLE_CONTENT':
      return 'Información inválida';
    case 'CONFLICT':
      return 'Conflicto';
    case 'TOO_MANY_REQUESTS':
      return 'Demasiadas solicitudes';
    default:
      return 'Error';
  }
}

/**
 * Read the force-complete payload off a tRPC error. The server's
 * `errorFormatter` surfaces `requiresForce`, `missingFields`, and
 * `missingDocuments` whenever a ServiceError carries them in `context`
 * (today: `BaseActorService.submitActor` when validation fails without
 * `skipValidation`). Returns `requiresForce: false` for any other error
 * — caller can branch into a normal toast.
 */
export function readForceCompleteState(err: AnyError): ForceCompleteState {
  if (!isObject(err)) {
    return { requiresForce: false, missingFields: [], missingDocuments: [] };
  }
  const data = (err as TRPCErrorShape).data;
  if (!data) {
    return { requiresForce: false, missingFields: [], missingDocuments: [] };
  }
  const missingFields = Array.isArray(data.missingFields)
    ? (data.missingFields as MissingField[])
    : [];
  const missingDocuments = Array.isArray(data.missingDocuments)
    ? (data.missingDocuments.filter((d) => typeof d === 'string') as string[])
    : [];
  return {
    requiresForce: data.requiresForce === true,
    missingFields,
    missingDocuments,
  };
}

/**
 * Convert any error (tRPC, native, string) into a friendly `{ title,
 * description }` pair. Pure — safe to call in render or onError.
 */
export function getFriendlyError(err: AnyError): FriendlyError {
  if (!isObject(err)) {
    return { title: 'Error', description: fallbackDescription(err) };
  }

  const trpcErr = err as TRPCErrorShape;
  const code = trpcErr.data?.code;
  const title = fallbackTitle(code);
  const userMessage = readUserMessage(trpcErr);
  const fieldCount = readFieldErrorCount(trpcErr);

  let description = userMessage ?? fallbackDescription(err);
  if (fieldCount > 0) {
    description += ` (Faltan ${fieldCount} ${fieldCount === 1 ? 'campo' : 'campos'} por completar)`;
  }

  return { title, description };
}
