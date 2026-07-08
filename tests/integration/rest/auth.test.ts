/**
 * Integration tests for the custom auth REST endpoints:
 *   - /api/auth/login (POST)
 *   - /api/auth/register (POST)
 *   - /api/auth/forgot-password (POST)
 *   - /api/auth/reset-password/[token] (GET, POST)
 *
 * These are public endpoints (no session required). They share an
 * in-memory rate limiter keyed off `x-forwarded-for`, so each test passes
 * a unique IP to avoid cross-test rate-limit interference.
 */

import { describe, test, expect } from 'bun:test';
import { POST as loginPost } from '@/app/api/auth/login/route';
import { POST as registerPost } from '@/app/api/auth/register/route';
import { POST as forgotPasswordPost } from '@/app/api/auth/forgot-password/route';
import {
  GET as resetPasswordGet,
  POST as resetPasswordPost,
} from '@/app/api/auth/reset-password/[token]/route';
import { UserRole } from '@/prisma/generated/prisma-client/enums';
import bcrypt from 'bcryptjs';
import { prisma } from '../../utils/database';
import { userFactory } from '../factories';
import { readJson } from '../restHelpers';

let ipCounter = 0;
function freshIp(): string {
  ipCounter += 1;
  return `192.0.2.${ipCounter % 250}`;
}

function buildJsonRequest(method: string, url: string, body: unknown): Request {
  return new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': freshIp(),
    },
    body: JSON.stringify(body),
  });
}

// ===========================================================================
// /api/auth/login
// ===========================================================================
describe('POST /api/auth/login', () => {
  test('returns 200 + token for valid credentials', async () => {
    const password = 'TestPassword1';
    const user = await prisma.user.create({
      data: {
        email: `login-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@hestia.test`,
        name: 'Login Test',
        role: UserRole.STAFF,
        password: await bcrypt.hash(password, 10),
        isActive: true,
      },
    });

    const res = await loginPost(
      buildJsonRequest('POST', 'http://localhost/api/auth/login', {
        email: user.email,
        password,
      }) as never,
    );
    const { status, body } = await readJson(res);

    expect(status).toBe(200);
    expect(body).toMatchObject({
      user: { id: user.id, email: user.email, role: UserRole.STAFF },
      token: expect.any(String),
    });
    // password is stripped
    expect((body as { user: Record<string, unknown> }).user.password).toBeUndefined();
  });

  test('returns 401 for unknown email', async () => {
    const res = await loginPost(
      buildJsonRequest('POST', 'http://localhost/api/auth/login', {
        email: `nobody-${Date.now()}@hestia.test`,
        password: 'whatever',
      }) as never,
    );
    expect(res.status).toBe(401);
  });

  test('returns 401 for wrong password', async () => {
    const user = await prisma.user.create({
      data: {
        email: `wrong-pwd-${Date.now()}@hestia.test`,
        name: 'WrongPwd',
        role: UserRole.BROKER,
        password: await bcrypt.hash('CorrectPass1', 10),
        isActive: true,
      },
    });

    const res = await loginPost(
      buildJsonRequest('POST', 'http://localhost/api/auth/login', {
        email: user.email,
        password: 'IncorrectPass1',
      }) as never,
    );
    expect(res.status).toBe(401);
  });

  test('returns the GENERIC 401 for a deactivated user with correct password (#164)', async () => {
    const password = 'CorrectPass1';
    const user = await prisma.user.create({
      data: {
        email: `deactivated-${Date.now()}@hestia.test`,
        name: 'Deactivated',
        role: UserRole.STAFF,
        password: await bcrypt.hash(password, 10),
        isActive: false,
      },
    });

    const res = await loginPost(
      buildJsonRequest('POST', 'http://localhost/api/auth/login', {
        email: user.email,
        password,
      }) as never,
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(401);
    // Same message as unknown email — no account-state disclosure.
    expect(body).toMatchObject({ error: 'Invalid credentials' });
  });

  test('returns 400 for malformed input', async () => {
    const res = await loginPost(
      buildJsonRequest('POST', 'http://localhost/api/auth/login', {
        email: 'not-an-email',
        password: '',
      }) as never,
    );
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// /api/auth/register — REMOVED (#162): invite-only broker onboarding.
// The route is a 410 tombstone; no account may ever be minted through it.
// ===========================================================================
describe('POST /api/auth/register (tombstone, #162)', () => {
  test('returns 410 Gone and creates NO user', async () => {
    const email = `register-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@hestia.test`;
    const res = await registerPost(
      buildJsonRequest('POST', 'http://localhost/api/auth/register', {
        email,
        password: 'TestPassword1',
        name: 'New Broker',
      }) as never,
    );
    const { status, body } = await readJson(res);

    expect(status).toBe(410);
    expect(body).toMatchObject({ error: expect.stringContaining('invitación') });
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });
});

// ===========================================================================
// /api/auth/forgot-password
// ===========================================================================
describe('POST /api/auth/forgot-password', () => {
  test('returns 200 with the same envelope whether the email exists or not', async () => {
    const existing = await userFactory.create({ role: UserRole.STAFF });

    const resHit = await forgotPasswordPost(
      buildJsonRequest('POST', 'http://localhost/api/auth/forgot-password', {
        email: existing.email,
      }) as never,
    );
    const resMiss = await forgotPasswordPost(
      buildJsonRequest('POST', 'http://localhost/api/auth/forgot-password', {
        email: `nobody-${Date.now()}@hestia.test`,
      }) as never,
    );
    const hit = await readJson(resHit);
    const miss = await readJson(resMiss);

    expect(hit.status).toBe(200);
    expect(miss.status).toBe(200);
    // Anti-enumeration: both responses are identical
    expect(hit.body).toEqual(miss.body);
    expect(hit.body).toMatchObject({ success: true, message: expect.any(String) });

    // For the hit case, a reset token was persisted on the user row.
    const refreshed = await prisma.user.findUnique({ where: { id: existing.id } });
    expect(refreshed?.resetToken).not.toBeNull();
  }, 20000);

  test('returns 400 for invalid email format', async () => {
    const res = await forgotPasswordPost(
      buildJsonRequest('POST', 'http://localhost/api/auth/forgot-password', {
        email: 'not-an-email',
      }) as never,
    );
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// /api/auth/reset-password/[token]
// ===========================================================================
async function paramsFor(token: string): Promise<{ params: Promise<{ token: string }> }> {
  return { params: Promise.resolve({ token }) };
}

describe('GET /api/auth/reset-password/[token]', () => {
  test('returns the masked email for a valid token', async () => {
    const token = `reset-tok-${Date.now()}`;
    await prisma.user.create({
      data: {
        email: `reset-${Date.now()}@hestia.test`,
        name: 'Reset User',
        role: UserRole.STAFF,
        password: await bcrypt.hash('OldPass1', 10),
        resetToken: token,
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const res = await resetPasswordGet(
      buildJsonRequest('GET', `http://localhost/api/auth/reset-password/${token}`, {}) as never,
      await paramsFor(token),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      email: expect.stringMatching(/^.{2}\*\*\*@/),
    });
  });

  test('returns 400 with expired:true for an invalid token', async () => {
    const res = await resetPasswordGet(
      buildJsonRequest('GET', 'http://localhost/api/auth/reset-password/bogus', {}) as never,
      await paramsFor('bogus'),
    );
    const { status, body } = await readJson(res);
    expect(status).toBe(400);
    expect(body).toMatchObject({ expired: true });
  });
});

describe('POST /api/auth/reset-password/[token]', () => {
  test('updates password, clears reset token, and invalidates sessions', async () => {
    const token = `reset-post-${Date.now()}`;
    const user = await prisma.user.create({
      data: {
        email: `reset-post-${Date.now()}@hestia.test`,
        name: 'Reset User',
        role: UserRole.STAFF,
        password: await bcrypt.hash('OldPass1', 10),
        resetToken: token,
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    // Pre-existing session that should be invalidated.
    await prisma.session.create({
      data: {
        sessionToken: `session-${user.id}`,
        userId: user.id,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const res = await resetPasswordPost(
      buildJsonRequest('POST', `http://localhost/api/auth/reset-password/${token}`, {
        password: 'NewPassword1',
        confirmPassword: 'NewPassword1',
      }) as never,
      await paramsFor(token),
    );
    expect(res.status).toBe(200);

    const refreshed = await prisma.user.findUnique({ where: { id: user.id } });
    expect(refreshed?.resetToken).toBeNull();
    expect(refreshed?.resetTokenExpiry).toBeNull();
    expect(refreshed?.passwordSetAt).toBeInstanceOf(Date);
    // Old password no longer matches
    expect(await bcrypt.compare('OldPass1', refreshed!.password!)).toBe(false);
    expect(await bcrypt.compare('NewPassword1', refreshed!.password!)).toBe(true);

    const sessions = await prisma.session.findMany({ where: { userId: user.id } });
    expect(sessions).toHaveLength(0);
  });

  test('rejects mismatched confirmPassword', async () => {
    const token = `reset-mismatch-${Date.now()}`;
    await prisma.user.create({
      data: {
        email: `mismatch-${Date.now()}@hestia.test`,
        name: 'Mismatch',
        role: UserRole.STAFF,
        password: await bcrypt.hash('OldPass1', 10),
        resetToken: token,
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const res = await resetPasswordPost(
      buildJsonRequest('POST', `http://localhost/api/auth/reset-password/${token}`, {
        password: 'NewPassword1',
        confirmPassword: 'Different1',
      }) as never,
      await paramsFor(token),
    );
    expect(res.status).toBe(400);
  });

  test('rejects weak password', async () => {
    const token = `reset-weak-${Date.now()}`;
    await prisma.user.create({
      data: {
        email: `weak-${Date.now()}@hestia.test`,
        name: 'Weak',
        role: UserRole.STAFF,
        password: await bcrypt.hash('OldPass1', 10),
        resetToken: token,
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const res = await resetPasswordPost(
      buildJsonRequest('POST', `http://localhost/api/auth/reset-password/${token}`, {
        password: 'short',
        confirmPassword: 'short',
      }) as never,
      await paramsFor(token),
    );
    expect(res.status).toBe(400);
  });

  test('rejects invalid token', async () => {
    const res = await resetPasswordPost(
      buildJsonRequest('POST', 'http://localhost/api/auth/reset-password/bogus', {
        password: 'GoodPass1',
        confirmPassword: 'GoodPass1',
      }) as never,
      await paramsFor('bogus'),
    );
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// NextAuth authorize + session revalidation (#164)
//
// The integration preload mocks next-auth's SESSION PLUMBING, so these tests
// exercise the exported callbacks/authorize directly against the real test
// DB — the mechanism, with next-auth's wiring left to next-auth.
// ===========================================================================
import { authOptions, SESSION_REVALIDATE_MS } from '@/lib/auth/auth-config';

type AnyToken = Record<string, unknown>;

function credentialsAuthorize() {
  const provider = authOptions.providers[0] as unknown as {
    authorize?: (c: Record<string, string>) => Promise<unknown>;
    options?: { authorize?: (c: Record<string, string>) => Promise<unknown> };
  };
  // v4 provider objects carry a default no-op `authorize` at the top level;
  // the configured one lives under `options` — prefer it.
  const authorize = provider.options?.authorize ?? provider.authorize;
  if (!authorize) throw new Error('credentials authorize not found on provider');
  return authorize;
}

const jwtCb = authOptions.callbacks!.jwt! as unknown as (args: {
  token: AnyToken;
  user?: unknown;
}) => Promise<AnyToken>;
const sessionCb = authOptions.callbacks!.session! as unknown as (args: {
  session: { user: Record<string, unknown> };
  token: AnyToken;
}) => Promise<unknown>;

const staleToken = (userId: string, role: UserRole): AnyToken => ({
  id: userId,
  role,
  // Outside the revalidation window → the next jwt() call re-checks the DB.
  revalidatedAt: Date.now() - SESSION_REVALIDATE_MS - 1_000,
});

describe('NextAuth isActive enforcement (#164)', () => {
  test('authorize rejects a deactivated user with correct password', async () => {
    const password = 'CorrectPass1';
    const user = await prisma.user.create({
      data: {
        email: `authorize-inactive-${Date.now()}@hestia.test`,
        name: 'Inactive',
        role: UserRole.STAFF,
        password: await bcrypt.hash(password, 10),
        isActive: false,
      },
    });

    const result = await credentialsAuthorize()({ email: user.email!, password });
    expect(result).toBeNull();
  });

  test('authorize accepts the same credentials once reactivated', async () => {
    const password = 'CorrectPass1';
    const user = await prisma.user.create({
      data: {
        email: `authorize-active-${Date.now()}@hestia.test`,
        name: 'Active',
        role: UserRole.STAFF,
        password: await bcrypt.hash(password, 10),
        isActive: true,
      },
    });

    const result = await credentialsAuthorize()({ email: user.email!, password });
    expect(result).toMatchObject({ id: user.id, role: UserRole.STAFF });
  });

  test('stale token of a deactivated user is invalidated and yields NO session', async () => {
    const user = await userFactory.create({ role: UserRole.STAFF });
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });

    const token = await jwtCb({ token: staleToken(user.id, UserRole.STAFF) });
    expect(token.invalidated).toBe(true);

    const session = await sessionCb({
      session: { user: { email: user.email } },
      token,
    });
    expect(session).toBeNull();
  });

  test('stale token picks up a role change; session survives for active users', async () => {
    const user = await userFactory.create({ role: UserRole.BROKER });
    await prisma.user.update({ where: { id: user.id }, data: { role: UserRole.ADMIN } });

    const token = await jwtCb({ token: staleToken(user.id, UserRole.BROKER) });
    expect(token.invalidated).toBeUndefined();
    expect(token.role).toBe(UserRole.ADMIN);

    const session = (await sessionCb({
      session: { user: { email: user.email } },
      token,
    })) as { user: Record<string, unknown> };
    expect(session.user).toMatchObject({ id: user.id, role: UserRole.ADMIN });
  });

  test('within the window no re-check happens (stale role kept)', async () => {
    const user = await userFactory.create({ role: UserRole.BROKER });
    await prisma.user.update({ where: { id: user.id }, data: { role: UserRole.ADMIN } });

    const token = await jwtCb({
      token: { id: user.id, role: UserRole.BROKER, revalidatedAt: Date.now() },
    });
    expect(token.role).toBe(UserRole.BROKER); // window not elapsed — no DB read
  });

  test('a reactivated user self-heals on the next window', async () => {
    const user = await userFactory.create({ role: UserRole.STAFF });
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    const invalidated = await jwtCb({ token: staleToken(user.id, UserRole.STAFF) });
    expect(invalidated.invalidated).toBe(true);

    await prisma.user.update({ where: { id: user.id }, data: { isActive: true } });
    const healed = await jwtCb({
      token: { ...invalidated, revalidatedAt: Date.now() - SESSION_REVALIDATE_MS - 1_000 },
    });
    expect(healed.invalidated).toBeUndefined();

    const session = (await sessionCb({
      session: { user: { email: user.email } },
      token: healed,
    })) as { user: Record<string, unknown> };
    expect(session.user).toMatchObject({ id: user.id });
  });

  test('fresh login stamps the revalidation clock', async () => {
    const token = await jwtCb({
      token: {},
      user: { id: 'fresh-user', role: UserRole.ADMIN },
    });
    expect(token.id).toBe('fresh-user');
    expect(token.role).toBe(UserRole.ADMIN);
    expect(typeof token.revalidatedAt).toBe('number');
  });
});
