/**
 * One-call auth-gate assertion helper.
 *
 * Given the set of roles allowed to call a procedure plus a callback that
 * invokes the procedure with a caller, this helper iterates over PUBLIC + every
 * UserRole, builds the matching caller (creating fresh users via factories
 * each iteration since beforeEach has wiped the DB), and asserts:
 *
 *   - Disallowed: rejects with TRPCError code UNAUTHORIZED or FORBIDDEN.
 *   - Allowed:    does not reject with UNAUTHORIZED/FORBIDDEN.
 *                 (Other errors — NOT_FOUND, BAD_REQUEST — count as "gate passed".)
 *
 * Use it once per procedure to compress ~5 boilerplate auth tests into one line.
 */

import { TRPCError } from '@trpc/server';
import { UserRole } from '@/prisma/generated/prisma-client/enums';
import {
  createPublicCaller,
  createAdminCaller,
  createStaffCaller,
  createBrokerCaller,
} from './callers';

type Caller = Awaited<ReturnType<typeof createAdminCaller>>['caller'];

export type AuthScope = 'PUBLIC' | UserRole;

const AUTH_FAILURE_CODES = new Set(['UNAUTHORIZED', 'FORBIDDEN']);

const ALL_SCOPES: AuthScope[] = ['PUBLIC', UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER];

async function buildCaller(scope: AuthScope): Promise<Caller> {
  switch (scope) {
    case 'PUBLIC':
      return createPublicCaller().caller;
    case UserRole.ADMIN:
      return (await createAdminCaller()).caller;
    case UserRole.STAFF:
      return (await createStaffCaller()).caller;
    case UserRole.BROKER:
      return (await createBrokerCaller()).caller;
    default: {
      const { createAuthedCaller } = await import('./callers');
      return (await createAuthedCaller(scope as UserRole)).caller;
    }
  }
}

function isAuthFailure(error: unknown): boolean {
  if (error instanceof TRPCError) return AUTH_FAILURE_CODES.has(error.code);
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' && AUTH_FAILURE_CODES.has(code);
  }
  return false;
}

export interface ExpectAuthGateOptions {
  allowed: AuthScope[];
  invoke: (caller: Caller) => Promise<unknown>;
  scopes?: AuthScope[];
}

export async function expectAuthGate({ allowed, invoke, scopes = ALL_SCOPES }: ExpectAuthGateOptions): Promise<void> {
  for (const scope of scopes) {
    const caller = await buildCaller(scope);
    const isAllowed = allowed.includes(scope);

    let error: unknown = null;
    try {
      await invoke(caller);
    } catch (e) {
      error = e;
    }

    if (isAllowed) {
      if (error && isAuthFailure(error)) {
        throw new Error(
          `[expectAuthGate] Scope ${scope} should pass the auth gate but got auth error: ${(error as Error).message}`,
        );
      }
    } else {
      if (!error) {
        throw new Error(`[expectAuthGate] Scope ${scope} should be blocked by auth gate but the call succeeded`);
      }
      if (!isAuthFailure(error)) {
        throw new Error(
          `[expectAuthGate] Scope ${scope} should be blocked with UNAUTHORIZED/FORBIDDEN but got: ${(error as Error).message ?? error}`,
        );
      }
    }
  }
}
