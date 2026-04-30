/**
 * Caller factories for tRPC integration tests.
 *
 * Each factory builds a manually-constructed Context that satisfies the tRPC
 * middleware (isAuthed, isAdmin, isBroker, isDualAuth) and returns:
 *   { caller, user }
 *
 * `caller` is `appRouter.createCaller(ctx)` — typed end-to-end.
 * `user` is the underlying User row when applicable; tests use it for assertions
 *   (e.g., `expect(result.createdById).toBe(user.id)`).
 */

import type { Session } from 'next-auth';
import { appRouter } from '@/server/routers/_app';
import { UserRole } from '@/prisma/generated/prisma-client/enums';
import { prisma } from '../utils/database';
import bcrypt from 'bcryptjs';

type Caller = ReturnType<typeof appRouter.createCaller>;

interface AuthedUserOpts {
  email?: string;
  name?: string;
  password?: string;
  isActive?: boolean;
}

function buildSession(user: { id: string; email: string | null; name: string | null; role: UserRole }): Session {
  return {
    user: {
      id: user.id,
      email: user.email ?? '',
      name: user.name ?? '',
      role: user.role,
    } as Session['user'],
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

function buildContext(session: Session | null, token?: string) {
  return {
    session,
    token,
    prisma,
  };
}

/**
 * Public caller — no session, no token. Triggers UNAUTHORIZED on protected procedures.
 */
export function createPublicCaller(): { caller: Caller } {
  const caller = appRouter.createCaller(buildContext(null));
  return { caller };
}

/**
 * Authed caller for any role. Creates the User if it doesn't exist (idempotent per test).
 */
export async function createAuthedCaller(
  role: UserRole,
  opts: AuthedUserOpts = {},
): Promise<{ caller: Caller; user: { id: string; email: string; name: string; role: UserRole } }> {
  const email = opts.email ?? `${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@hestia.test`;
  const name = opts.name ?? `Test ${role}`;
  const password = opts.password ? await bcrypt.hash(opts.password, 10) : null;

  const created = await prisma.user.create({
    data: {
      email,
      name,
      role,
      password,
      isActive: opts.isActive ?? true,
    },
  });

  const user = { id: created.id, email: created.email!, name: created.name!, role: created.role };
  const caller = appRouter.createCaller(buildContext(buildSession(user)));
  return { caller, user };
}

export async function createAdminCaller(opts: AuthedUserOpts = {}) {
  return createAuthedCaller(UserRole.ADMIN, opts);
}

export async function createStaffCaller(opts: AuthedUserOpts = {}) {
  return createAuthedCaller(UserRole.STAFF, opts);
}

export async function createBrokerCaller(opts: AuthedUserOpts = {}) {
  return createAuthedCaller(UserRole.BROKER, opts);
}

/**
 * Token-authed caller — for `dualAuthProcedure` exercised by the actor portal.
 * Pass a real token minted via actorTokenService for true integration coverage.
 */
export function createTokenCaller(token: string): { caller: Caller } {
  const caller = appRouter.createCaller(buildContext(null, token));
  return { caller };
}
