import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { type Session } from 'next-auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from "@/prisma/generated/prisma-client/enums";
import { ZodError } from 'zod';

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
 * Initialize tRPC with SuperJSON for better serialization
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
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
