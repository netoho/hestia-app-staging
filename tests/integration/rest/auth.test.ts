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
// /api/auth/register
// ===========================================================================
describe('POST /api/auth/register', () => {
  test('creates a BROKER user and returns 201 with token', async () => {
    const email = `register-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@hestia.test`;
    const res = await registerPost(
      buildJsonRequest('POST', 'http://localhost/api/auth/register', {
        email,
        password: 'TestPassword1',
        name: 'New Broker',
      }) as never,
    );
    const { status, body } = await readJson(res);

    expect(status).toBe(201);
    expect(body).toMatchObject({
      user: { email, role: UserRole.BROKER },
      token: expect.any(String),
    });

    // User persisted with hashed password
    const persisted = await prisma.user.findUnique({ where: { email } });
    expect(persisted).not.toBeNull();
    expect(persisted?.password).not.toBeNull();
    expect(persisted?.password).not.toBe('TestPassword1');
  });

  test('returns 409 when email already exists', async () => {
    const existing = await userFactory.create({ role: UserRole.BROKER });
    const res = await registerPost(
      buildJsonRequest('POST', 'http://localhost/api/auth/register', {
        email: existing.email,
        password: 'AnotherPass1',
      }) as never,
    );
    expect(res.status).toBe(409);
  });

  test('returns 400 for invalid input (short password)', async () => {
    const res = await registerPost(
      buildJsonRequest('POST', 'http://localhost/api/auth/register', {
        email: `bad-${Date.now()}@hestia.test`,
        password: '123',
      }) as never,
    );
    expect(res.status).toBe(400);
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
