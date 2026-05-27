import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { type Session } from 'next-auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from "@/prisma/generated/prisma-client/enums";
import { ZodError } from 'zod';
import { ServiceError } from '@/lib/services/types/errors';

/**
 * Context that is passed to all tRPC procedures
 */
export interface Context {
  session: Session | null;
  token?: string;
  prisma: typeof prisma;
}

/**
 * Create context for each request
 */
export const createTRPCContext = async (opts: {
  headers: Headers;
}): Promise<Context> => {
  // Get the session from NextAuth
  const session = await getServerSession(authOptions);

  // Extract token from Authorization header if present
  const token = opts.headers.get('authorization')?.replace('Bearer ', '');

  return {
    session,
    token,
    prisma,
  };
};

/**
 * Heuristic: does `message` look like a user-facing Spanish string we can
 * safely surface? We accept it if it contains accented characters or any
 * common Spanish stop word and does NOT contain typical English error
 * markers. False negatives are fine — we fall back to the code mapping —
 * but false positives (showing English to users) are not.
 */
function looksLikeSpanish(message: string | null | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  const englishMarkers = [
    'not found',
    'not exist',
    'failed',
    'invalid',
    'error',
    'unauthorized',
    'forbidden',
    'must be',
    'required',
    'unknown',
    'cannot',
  ];
  if (englishMarkers.some((marker) => lower.includes(marker))) return false;
  // Accented characters or common Spanish function words.
  return (
    /[áéíóúñÁÉÍÓÚÑ¿¡]/.test(message) ||
    /\b(no|ya|se|el|la|los|las|un|una|de|del|al|para|por|con|sin|que|esta|este|son|fue|hay|debe|tiene|todos|todas)\b/i.test(message)
  );
}

/**
 * Friendly Spanish default by tRPC error code. Used by errorFormatter as
 * the last resort when neither a ServiceError userMessage nor a known
 * cause-based override is available.
 */
const friendlyByTrpcCode: Record<string, string> = {
  BAD_REQUEST: 'La solicitud no es válida. Revisa los datos e intenta de nuevo.',
  UNAUTHORIZED: 'Tu sesión ha expirado o no tienes acceso. Inicia sesión nuevamente.',
  FORBIDDEN: 'No tienes permiso para realizar esta acción.',
  NOT_FOUND: 'No se encontró el recurso solicitado.',
  TIMEOUT: 'La operación tardó demasiado. Intenta nuevamente.',
  CONFLICT: 'La operación entra en conflicto con datos existentes.',
  PRECONDITION_FAILED: 'No se cumplen las condiciones para esta operación.',
  PAYLOAD_TOO_LARGE: 'El contenido enviado es demasiado grande.',
  UNPROCESSABLE_CONTENT: 'La información proporcionada no es válida.',
  TOO_MANY_REQUESTS: 'Demasiadas solicitudes. Intenta en unos minutos.',
  CLIENT_CLOSED_REQUEST: 'La solicitud fue cancelada.',
  INTERNAL_SERVER_ERROR: 'Ocurrió un error inesperado. Si persiste, contacta a soporte.',
};

/**
 * Initialize tRPC with SuperJSON for better serialization
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const zodFlat = error.cause instanceof ZodError ? error.cause.flatten() : null;
    const fieldErrorCount = zodFlat
      ? Object.values(zodFlat.fieldErrors).reduce(
          (acc, list) => acc + (Array.isArray(list) ? list.length : 0),
          0,
        ) + (zodFlat.formErrors?.length ?? 0)
      : 0;

    // Resolution order for userMessage:
    //   1. ServiceError.userMessage (caller-specific Spanish copy) via cause
    //   2. Output-validation ZodError → never leak "Output validation
    //      failed". Internal contract bug → generic server error.
    //   3. Other ZodErrors (input validation) → generic invalid-data copy.
    //   4. shape.message if it looks Spanish-friendly (catches routers that
    //      re-throw TRPCError with a ServiceError's original message
    //      without preserving `cause`).
    //   5. friendlyByTrpcCode mapping (generic Spanish per tRPC code).
    //   6. shape.message (last resort — likely English/dev).
    let userMessage: string;
    if (error.cause instanceof ServiceError) {
      userMessage = error.cause.getUserMessage();
    } else if (zodFlat && shape.message === 'Output validation failed') {
      userMessage = 'Ocurrió un error inesperado al procesar la respuesta del servidor. Si persiste, contacta a soporte.';
    } else if (zodFlat) {
      userMessage = 'La información proporcionada no es válida.';
    } else if (looksLikeSpanish(shape.message)) {
      // Router re-threw a TRPCError whose message field is already a
      // friendly Spanish string from a ServiceError but did not pass
      // `cause`. Preserve the specificity.
      userMessage = shape.message;
    } else {
      userMessage = friendlyByTrpcCode[shape.data.code] ?? shape.message;
    }

    // Surface a small allowlist of ServiceError.context keys on the wire so
    // clients can adapt UX without reading the raw context blob. Today the
    // force-complete flow uses `requiresForce`, `missingFields`, and
    // `missingDocuments` (BaseActorService.submitActor); extend as new
    // structured error patterns land.
    let requiresForce: boolean | undefined;
    let missingFields: unknown[] | undefined;
    let missingDocuments: unknown[] | undefined;
    if (error.cause instanceof ServiceError && error.cause.context) {
      const ctx = error.cause.context as {
        requiresForce?: boolean;
        missingFields?: unknown[];
        missingDocuments?: unknown[];
      };
      if (ctx.requiresForce === true) requiresForce = true;
      if (Array.isArray(ctx.missingFields)) missingFields = ctx.missingFields;
      if (Array.isArray(ctx.missingDocuments)) missingDocuments = ctx.missingDocuments;
    }

    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: zodFlat,
        userMessage,
        fieldErrorCount,
        ...(requiresForce !== undefined ? { requiresForce } : {}),
        ...(missingFields !== undefined ? { missingFields } : {}),
        ...(missingDocuments !== undefined ? { missingDocuments } : {}),
      },
    };
  },
});

/**
 * Create router and procedure helpers
 */
export const createTRPCRouter = t.router;

/**
 * Public (unauthenticated) procedure
 */
export const publicProcedure = t.procedure;

/**
 * Middleware to check if user is authenticated
 */
const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.session.user.id,
      userRole: ctx.session.user.role as UserRole,
    },
  });
});

/**
 * Protected (authenticated) procedure
 */
export const protectedProcedure = t.procedure.use(isAuthed);

/**
 * Admin-only procedure
 */
const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  const userRole = ctx.session.user.role as UserRole;
  if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only admins and staff can perform this action',
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.session.user.id,
      userRole,
    },
  });
});

export const adminProcedure = t.procedure.use(isAuthed).use(isAdmin);

/**
 * Broker procedure - can only see their own policies
 */
const isBroker = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  const userRole = ctx.session.user.role as UserRole;
  if (!['ADMIN', 'STAFF', 'BROKER'].includes(userRole)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Insufficient permissions',
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.session.user.id,
      userRole,
      isBroker: userRole === 'BROKER',
    },
  });
});

export const brokerProcedure = t.procedure.use(isAuthed).use(isBroker);

/**
 * Dual authentication procedure
 * Can be accessed either with session (admin/staff/broker) or token (actor)
 */
const isDualAuth = t.middleware(async ({ ctx, next }) => {
  // Check for session first
  if (ctx.session?.user) {
    return next({
      ctx: {
        ...ctx,
        authType: 'session' as const,
        session: ctx.session,
        userId: ctx.session.user.id,
        userRole: ctx.session.user.role as UserRole,
      },
    });
  }

  // Check for token
  if (ctx.token) {
    return next({
      ctx: {
        ...ctx,
        authType: 'token' as const,
        token: ctx.token,
      },
    });
  }

  throw new TRPCError({
    code: 'UNAUTHORIZED',
    message: 'Authentication required',
  });
});

export const dualAuthProcedure = t.procedure.use(isDualAuth);
