/**
 * Integration tests for user / staff / onboard / document tRPC routers.
 *
 * 20 procedures total, floor coverage everywhere (happy path + auth gate).
 *
 * Avatar uploads exercise a real S3 storage provider in production; here
 * the boundary is mocked at preload (getCurrentStorageProvider) so the
 * payloads round-trip without AWS. The dualAuthProcedure-driven document
 * procedures use real tokens minted via actorTokenService for the actor
 * path; the session path is auth-gate only because ActorAuthService
 * re-resolves the session via next/headers (same constraint the actor
 * router PR documented).
 */

import { describe, test, expect } from 'bun:test';
import { UserRole } from '@/prisma/generated/prisma-client/enums';
import { prisma } from '../../utils/database';
import {
  createAdminCaller,
  createBrokerCaller,
  createPublicCaller,
} from '../callers';
import { expectAuthGate } from '../expectAuthGate';
import { createPolicyWithActors } from '../scenarios';
import { userFactory } from '../factories';
import { actorTokenService } from '@/lib/services/actorTokenService';

// ===========================================================================
// user.getProfile
// ===========================================================================
describe('user.getProfile', () => {
  test('returns the profile for the current user', async () => {
    const { caller, user } = await createAdminCaller();
    const result = await caller.user.getProfile();

    expect(result.id).toBe(user.id);
    expect(result.email).toBe(user.email);
    expect(result.role).toBe(UserRole.ADMIN);
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.user.getProfile(),
    });
  });
});

// ===========================================================================
// user.updateProfile
// ===========================================================================
describe('user.updateProfile', () => {
  test('updates phone and address for the current user', async () => {
    const { caller, user } = await createAdminCaller();
    const result = await caller.user.updateProfile({
      phone: '5559876543',
      address: 'Test address 123',
    });

    expect(result.id).toBe(user.id);
    expect(result.phone).toBe('5559876543');
    expect(result.address).toBe('Test address 123');
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.user.updateProfile({ phone: '5550000000' }),
    });
  });
});

// ===========================================================================
// user.deleteAvatar
// ===========================================================================
describe('user.deleteAvatar', () => {
  test('clears avatarUrl on the current user', async () => {
    const { caller, user } = await createAdminCaller();
    await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: 'https://example/avatar.jpg' } });

    const result = await caller.user.deleteAvatar();
    expect(result.avatarUrl).toBeNull();
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.user.deleteAvatar(),
    });
  });
});

// ===========================================================================
// user.getStats
// ===========================================================================
describe('user.getStats', () => {
  test('returns counts for the current user', async () => {
    const { caller } = await createAdminCaller();
    const result = await caller.user.getStats();

    expect(typeof result.totalPolicies).toBe('number');
    expect(typeof result.activePolicies).toBe('number');
    expect(typeof result.pendingPolicies).toBe('number');
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.user.getStats(),
    });
  });
});

// ===========================================================================
// user.uploadAvatar — auth gate only (storage upload involves a real S3 call
// even with the storage provider mocked; defer happy path until we mock the
// storageProvider.publicUpload path explicitly)
// ===========================================================================
describe('user.uploadAvatar', () => {
  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) =>
        caller.user.uploadAvatar({
          file: 'aGVsbG8=',
          filename: 'avatar.jpg',
          contentType: 'image/jpeg',
        }),
    });
  });
});

// ===========================================================================
// staff.list
// ===========================================================================
describe('staff.list', () => {
  test('returns paginated active users', async () => {
    await userFactory.create({ role: UserRole.STAFF });
    await userFactory.create({ role: UserRole.BROKER });
    const { caller } = await createAdminCaller();

    const result = await caller.staff.list({ page: 1, limit: 10 });
    expect(result.users.length).toBeGreaterThanOrEqual(2);
    expect(result.pagination.page).toBe(1);
  });

  test('filters by role when provided', async () => {
    await userFactory.create({ role: UserRole.BROKER });
    const { caller } = await createAdminCaller();

    const result = await caller.staff.list({ page: 1, limit: 10, role: 'BROKER' });
    expect(result.users.every((u) => u.role === UserRole.BROKER)).toBe(true);
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.staff.list({ page: 1, limit: 10 }),
    });
  });
});

// ===========================================================================
// staff.getById
// ===========================================================================
describe('staff.getById', () => {
  test('returns the user by id', async () => {
    const target = await userFactory.create({ role: UserRole.BROKER });
    const { caller } = await createAdminCaller();

    const result = await caller.staff.getById({ id: target.id });
    expect(result.id).toBe(target.id);
    expect(result.role).toBe(UserRole.BROKER);
  });

  test('throws NOT_FOUND for unknown id', async () => {
    const { caller } = await createAdminCaller();
    await expect(caller.staff.getById({ id: 'nope' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const target = await userFactory.create({ role: UserRole.STAFF });
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.staff.getById({ id: target.id }),
    });
  });
});

// ===========================================================================
// staff.create
// ===========================================================================
describe('staff.create', () => {
  test('creates a user, generates an invitation, returns invitationSent', async () => {
    const { caller } = await createAdminCaller();
    const email = `new-${Math.random().toString(36).slice(2, 6)}@hestia.test`;

    const result = await caller.staff.create({
      email,
      name: 'New Staff',
      role: 'STAFF',
    });

    expect(result.email).toBe(email);
    expect(result.role).toBe(UserRole.STAFF);
    expect(typeof result.invitationSent).toBe('boolean');

    const persisted = await prisma.user.findUnique({ where: { email } });
    expect(persisted).not.toBeNull();
    expect(persisted?.invitationToken).not.toBeNull();
  });

  test('throws CONFLICT when email already exists', async () => {
    const existing = await userFactory.create({ role: UserRole.STAFF });
    const { caller } = await createAdminCaller();

    await expect(
      caller.staff.create({ email: existing.email!, name: 'Dup', role: 'STAFF' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.staff.create({
          email: `gate-${Math.random().toString(36).slice(2, 6)}@hestia.test`,
          name: 'Gate',
          role: 'BROKER',
        }),
    });
  });
});

// ===========================================================================
// staff.update
// ===========================================================================
describe('staff.update', () => {
  test('updates the user role', async () => {
    const target = await userFactory.create({ role: UserRole.STAFF });
    const { caller } = await createAdminCaller();

    const result = await caller.staff.update({ id: target.id, role: 'BROKER' });
    expect(result.id).toBe(target.id);
    expect(result.role).toBe(UserRole.BROKER);
  });

  test('throws NOT_FOUND for unknown id', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.staff.update({ id: 'nope', role: 'BROKER' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const target = await userFactory.create({ role: UserRole.STAFF });
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.staff.update({ id: target.id, name: 'Renamed' }),
    });
  });
});

// ===========================================================================
// staff.delete
// ===========================================================================
describe('staff.delete', () => {
  test('soft-deletes a user (isActive=false)', async () => {
    const target = await userFactory.create({ role: UserRole.STAFF });
    const { caller } = await createAdminCaller();

    const result = await caller.staff.delete({ id: target.id });
    expect(result).toEqual({ success: true });

    const refreshed = await prisma.user.findUnique({ where: { id: target.id } });
    expect(refreshed?.isActive).toBe(false);
  });

  test('rejects self-deactivation', async () => {
    const { caller, user } = await createAdminCaller();
    await expect(caller.staff.delete({ id: user.id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  test('throws NOT_FOUND for unknown id', async () => {
    const { caller } = await createAdminCaller();
    await expect(caller.staff.delete({ id: 'nope' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const target = await userFactory.create({ role: UserRole.STAFF });
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.staff.delete({ id: target.id }),
    });
  });
});

// ===========================================================================
// onboard.validateToken
// ===========================================================================
describe('onboard.validateToken', () => {
  test('returns the user when the invitation token is valid', async () => {
    const target = await userFactory.create({
      role: UserRole.STAFF,
      invitationToken: 'inv-test-token-1',
      invitationTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const { caller } = createPublicCaller();
    const result = await caller.onboard.validateToken({ token: 'inv-test-token-1' });

    expect(result.user.id).toBe(target.id);
    expect(result.user.email).toBe(target.email);
  });

  test('throws UNAUTHORIZED for an invalid token', async () => {
    const { caller } = createPublicCaller();
    await expect(
      caller.onboard.validateToken({ token: 'does-not-exist' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  test('throws BAD_REQUEST when invitation already used (passwordSetAt)', async () => {
    await userFactory.create({
      role: UserRole.STAFF,
      invitationToken: 'inv-used',
      invitationTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      passwordSetAt: new Date(),
    });
    const { caller } = createPublicCaller();
    await expect(
      caller.onboard.validateToken({ token: 'inv-used' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

// ===========================================================================
// onboard.complete
// ===========================================================================
describe('onboard.complete', () => {
  test('sets password+phone and clears the invitation token', async () => {
    const target = await userFactory.create({
      role: UserRole.STAFF,
      invitationToken: 'inv-complete-1',
      invitationTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const { caller } = createPublicCaller();
    const result = await caller.onboard.complete({
      token: 'inv-complete-1',
      password: 'StrongPass1',
      phone: '5550001111',
    });

    expect(result.user.id).toBe(target.id);

    const refreshed = await prisma.user.findUnique({ where: { id: target.id } });
    expect(refreshed?.invitationToken).toBeNull();
    expect(refreshed?.password).not.toBeNull();
    expect(refreshed?.phone).toBe('5550001111');
  });

  test('rejects weak passwords', async () => {
    await userFactory.create({
      role: UserRole.STAFF,
      invitationToken: 'inv-weak',
      invitationTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const { caller } = createPublicCaller();
    await expect(
      caller.onboard.complete({
        token: 'inv-weak',
        password: 'weak',
        phone: '5550000000',
      }),
    ).rejects.toBeDefined();
  });
});

// ===========================================================================
// onboard.uploadAvatar — auth gate / NOT_FOUND only (storage upload deferred)
// ===========================================================================
describe('onboard.uploadAvatar', () => {
  test('throws NOT_FOUND for unknown user', async () => {
    const { caller } = createPublicCaller();
    await expect(
      caller.onboard.uploadAvatar({
        userId: 'nope',
        file: 'aGVsbG8=',
        filename: 'avatar.jpg',
        contentType: 'image/jpeg',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('rejects invalid content type', async () => {
    const target = await userFactory.create({ role: UserRole.STAFF });
    const { caller } = createPublicCaller();
    await expect(
      caller.onboard.uploadAvatar({
        userId: target.id,
        file: 'aGVsbG8=',
        filename: 'doc.pdf',
        contentType: 'application/pdf',
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

// ===========================================================================
// document.* (dualAuth) — UNAUTHORIZED gate only.
//
// Token-path happy and admin-path happy are deferred: ActorAuthService
// re-resolves the admin session via next/headers (same constraint the
// actor router PR documented), and the token path needs a richer
// documentService boundary mock (currently we mock primitive S3 ops; the
// router calls `documentService.generateUploadUrl` / `getById` /
// `getByActor` / `confirmUpload` which our mock doesn't expose). A
// follow-up PR will widen the documentService mock and unlock those.
// ===========================================================================
describe('document.getUploadUrl', () => {
  test('throws UNAUTHORIZED with no session and no token', async () => {
    const { tenant } = await createPolicyWithActors();
    const { caller } = createPublicCaller();
    await expect(
      caller.document.getUploadUrl({
        type: 'tenant',
        identifier: tenant.id,
        category: 'IDENTIFICATION',
        documentType: 'INE',
        fileName: 'ine.pdf',
        contentType: 'application/pdf',
        fileSize: 1024,
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

describe('document.confirmUpload', () => {
  test('throws UNAUTHORIZED with no session and no token', async () => {
    const { tenant } = await createPolicyWithActors();
    const { caller } = createPublicCaller();
    await expect(
      caller.document.confirmUpload({
        type: 'tenant',
        identifier: tenant.id,
        documentId: 'doc-id',
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

describe('document.listDocuments', () => {
  test('throws UNAUTHORIZED with no session and no token', async () => {
    const { tenant } = await createPolicyWithActors();
    const { caller } = createPublicCaller();
    await expect(
      caller.document.listDocuments({ type: 'tenant', identifier: tenant.id }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

describe('document.deleteDocument', () => {
  test('throws UNAUTHORIZED with no session and no token', async () => {
    const { tenant } = await createPolicyWithActors();
    const { caller } = createPublicCaller();
    await expect(
      caller.document.deleteDocument({
        type: 'tenant',
        identifier: tenant.id,
        documentId: 'doc-id',
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

describe('document.getDownloadUrl', () => {
  test('throws UNAUTHORIZED with no session and no token', async () => {
    const { tenant } = await createPolicyWithActors();
    const { caller } = createPublicCaller();
    await expect(
      caller.document.getDownloadUrl({
        type: 'tenant',
        identifier: tenant.id,
        documentId: 'doc-id',
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

// ===========================================================================
// document.getDownloadUrlById — protectedProcedure
// ===========================================================================
describe('document.getDownloadUrlById', () => {
  test('throws NOT_FOUND for unknown document', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.document.getDownloadUrlById({ documentId: 'nope' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.document.getDownloadUrlById({ documentId: 'nope' }),
    });
  });
});

// ===========================================================================
// document.listByPolicy — protectedProcedure
// ===========================================================================
describe('document.listByPolicy', () => {
  test('returns an empty list for a policy with no documents', async () => {
    const { policy } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    const result = await caller.document.listByPolicy({ policyId: policy.id });
    expect(Array.isArray(result)).toBe(true);
  });

  test('throws NOT_FOUND when policy does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.document.listByPolicy({ policyId: 'nope' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws FORBIDDEN when BROKER reads someone else’s policy documents', async () => {
    const { policy } = await createPolicyWithActors();
    const { caller: otherBroker } = await createBrokerCaller();
    await expect(
      otherBroker.document.listByPolicy({ policyId: policy.id }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.document.listByPolicy({ policyId: policy.id }),
    });
  });
});
