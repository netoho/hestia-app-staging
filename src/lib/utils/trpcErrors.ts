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

interface TRPCErrorShape {
  message?: string;
  data?: {
    code?: string;
    userMessage?: string;
    fieldErrorCount?: number;
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
