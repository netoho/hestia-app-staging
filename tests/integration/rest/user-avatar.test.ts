/**
 * Integration tests for /api/user/avatar (POST upload, DELETE remove).
 *
 * verifyAuth in the route delegates to next-auth's getServerSession (which
 * the preload mocks via globalThis.__testSession) and falls back to JWT.
 * Auth tests use withSession; happy-path POST is omitted because it
 * requires multipart form-data + storage-provider plumbing — auth + DELETE
 * cover the meaningful state transition.
 */

import { describe, test, expect } from 'bun:test';
import {
  POST as avatarPost,
  DELETE as avatarDelete,
} from '@/app/api/user/avatar/route';
import { UserRole } from '@/prisma/generated/prisma-client/enums';
import { prisma } from '../../utils/database';
import { userFactory } from '../factories';
import { withSession } from '../restHelpers';

describe('POST /api/user/avatar', () => {
  test('returns 401 without session or token', async () => {
    const res = await avatarPost(
      new Request('http://localhost/api/user/avatar', { method: 'POST' }) as never,
    );
    expect(res.status).toBe(401);
  });

  test('returns 400 when authed but no file in form data', async () => {
    const user = await userFactory.create({ role: UserRole.STAFF });
    const status = await withSession(user, async () => {
      const formData = new FormData();
      const res = await avatarPost(
        new Request('http://localhost/api/user/avatar', {
          method: 'POST',
          body: formData,
        }) as never,
      );
      return res.status;
    });
    expect(status).toBe(400);
  });
});

describe('DELETE /api/user/avatar', () => {
  test('returns 401 without session', async () => {
    const res = await avatarDelete(
      new Request('http://localhost/api/user/avatar', { method: 'DELETE' }) as never,
    );
    expect(res.status).toBe(401);
  });

  test('returns 404 when current user has no avatar set', async () => {
    const user = await userFactory.create({ role: UserRole.STAFF });
    const status = await withSession(user, async () => {
      const res = await avatarDelete(
        new Request('http://localhost/api/user/avatar', { method: 'DELETE' }) as never,
      );
      return res.status;
    });
    expect(status).toBe(404);
  });

  test('clears avatarUrl on a user with an existing avatar', async () => {
    const user = await userFactory.create({ role: UserRole.STAFF });
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: 'avatars/test/sample.jpg' },
    });

    const result = await withSession(user, async () => {
      const res = await avatarDelete(
        new Request('http://localhost/api/user/avatar', { method: 'DELETE' }) as never,
      );
      return { status: res.status, body: await res.json() };
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ success: true });

    const refreshed = await prisma.user.findUnique({ where: { id: user.id } });
    expect(refreshed?.avatarUrl).toBeNull();
  });
});
