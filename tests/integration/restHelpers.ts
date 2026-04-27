/**
 * Helpers for testing REST route handlers.
 *
 * REST endpoints under `src/app/api/**` are exported as `GET`/`POST`/`PUT`
 * route-handler functions. We invoke them directly with a constructed
 * NextRequest, then parse the JSON response.
 *
 * Auth + headers come from globals seeded in preload.ts:
 *   - `globalThis.__testSession` is what next-auth's getServerSession returns
 *   - `globalThis.__testHeaders` is what next/headers' headers() returns
 *
 * These globals are reset between tests via `withSession` / `withHeaders`
 * which guarantee clean teardown.
 */

import type { NextRequest } from 'next/server';
import type { UserRole } from '@/prisma/generated/prisma-client/enums';

type TestSession = { user: { id: string; email: string; name: string; role: string } };

const globalAny = globalThis as unknown as {
  __testHeaders?: Record<string, string>;
  __testSession?: TestSession | null;
};

/**
 * Set the session for the duration of `fn`. The session is reset to null
 * after `fn` resolves (or throws).
 */
export async function withSession<T>(
  user: { id: string; email: string | null; name: string | null; role: UserRole },
  fn: () => Promise<T>,
): Promise<T> {
  const prev = globalAny.__testSession;
  globalAny.__testSession = {
    user: {
      id: user.id,
      email: user.email ?? '',
      name: user.name ?? '',
      role: user.role,
    },
  };
  try {
    return await fn();
  } finally {
    globalAny.__testSession = prev ?? null;
  }
}

/**
 * Set request headers for the duration of `fn`.
 */
export async function withHeaders<T>(
  headers: Record<string, string>,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = globalAny.__testHeaders;
  globalAny.__testHeaders = headers;
  try {
    return await fn();
  } finally {
    globalAny.__testHeaders = prev ?? {};
  }
}

/**
 * Build a NextRequest for a route handler.
 */
export function buildRequest(
  method: string,
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
): NextRequest {
  const init: RequestInit = {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  };
  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  return new Request(url, init) as unknown as NextRequest;
}

/**
 * Parse a Response into { status, body } for assertion convenience.
 * Falls back to text when JSON parsing fails (e.g. binary payloads).
 */
export async function readJson(res: Response): Promise<{ status: number; body: unknown }> {
  const status = res.status;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return { status, body: await res.json() };
  }
  return { status, body: await res.text() };
}
