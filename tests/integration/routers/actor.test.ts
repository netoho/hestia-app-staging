/**
 * Integration tests for the `actor` tRPC router (shared + landlord).
 *
 * 17 procedures spanning every auth tier:
 *   - publicProcedure (token-validated): getByToken, getManyByToken,
 *     updateSelf, validateLandlord
 *   - protectedProcedure: getById, listByPolicy, markComplete,
 *     getLandlordsByPolicy
 *   - adminProcedure: updateByAdmin, createBatch, adminSubmitActor
 *   - dualAuthProcedure (session OR token): update, submitActor,
 *     saveMultipleLandlords, savePropertyDetails, savePolicyFinancial,
 *     deleteCoOwner
 *
 * Token-touching tests mint REAL tokens via `actorTokenService.generateActorToken`
 * — never stubbed. Per the saved testing decisions, the token validation
 * pipeline must be exercised end-to-end.
 */

import { describe, test, expect } from 'bun:test';
import {
  TenantType,
  UserRole,
} from '@/prisma/generated/prisma-client/enums';
import { prisma } from '../../utils/database';
import {
  createAdminCaller,
  createBrokerCaller,
  createPublicCaller,
} from '../callers';
import { expectAuthGate } from '../expectAuthGate';
import { createPolicyWithActors } from '../scenarios';
import {
  jointObligorFactory,
  avalFactory,
  packageFactory,
} from '../factories';
import {
  mintLandlordToken,
  mintTenantToken,
  mintJointObligorToken,
  mintAvalToken,
  expireActorToken,
} from '../actorTokens';

// ===========================================================================
// actor.getByToken — publicProcedure
// ===========================================================================
describe('actor.getByToken', () => {
  test('returns the landlord and policy when token is valid', async () => {
    const { landlord, policy } = await createPolicyWithActors();
    const { token, caller } = await mintLandlordToken(landlord.id);

    const result = await caller.actor.getByToken({ token, type: 'landlord' });

    expect(result.data.id).toBe(landlord.id);
    expect(result.data.policyId).toBe(policy.id);
    expect(result.authType).toBe('actor');
    expect(result.canEdit).toBe(true);
  });

  test('returns the tenant when token is valid', async () => {
    const { tenant } = await createPolicyWithActors();
    const { token, caller } = await mintTenantToken(tenant.id);

    const result = await caller.actor.getByToken({ token, type: 'tenant' });
    expect(result.data.id).toBe(tenant.id);
  });

  test('throws NOT_FOUND when token does not match any actor', async () => {
    const { caller } = createPublicCaller();
    await expect(
      caller.actor.getByToken({ token: 'does-not-exist', type: 'landlord' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws NOT_FOUND when token is expired', async () => {
    const { landlord } = await createPolicyWithActors();
    const { token, caller } = await mintLandlordToken(landlord.id);
    await expireActorToken('landlord', landlord.id);

    await expect(
      caller.actor.getByToken({ token, type: 'landlord' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: every scope allowed (public)', async () => {
    const { landlord } = await createPolicyWithActors();
    const { token } = await mintLandlordToken(landlord.id);
    await expectAuthGate({
      allowed: ['PUBLIC', UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.actor.getByToken({ token, type: 'landlord' }),
    });
  });
});

// ===========================================================================
// actor.getManyByToken — landlord-only
// ===========================================================================
describe('actor.getManyByToken', () => {
  test('returns landlords array for a landlord token', async () => {
    const { landlord } = await createPolicyWithActors();
    const { token, caller } = await mintLandlordToken(landlord.id);

    const result = await caller.actor.getManyByToken({ token, type: 'landlord' });
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.authType).toBe('actor');
  });

  test('throws NOT_FOUND when called for a non-landlord type', async () => {
    const { tenant } = await createPolicyWithActors();
    const { token, caller } = await mintTenantToken(tenant.id);

    await expect(
      caller.actor.getManyByToken({ token, type: 'tenant' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: every scope allowed (public)', async () => {
    const { landlord } = await createPolicyWithActors();
    const { token } = await mintLandlordToken(landlord.id);
    await expectAuthGate({
      allowed: ['PUBLIC', UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.actor.getManyByToken({ token, type: 'landlord' }),
    });
  });
});

// ===========================================================================
// actor.updateSelf — strict per-type validation; auth gate only here
// (constructing a fully-valid strict actor payload requires the per-type
// complete schema; deferred until per-actor schema fixtures land).
// ===========================================================================
describe('actor.updateSelf', () => {
  test('throws when called with empty payload', async () => {
    const { caller } = createPublicCaller();
    await expect(
      caller.actor.updateSelf({
        type: 'tenant',
        token: 'whatever',
        // @ts-expect-error — intentionally empty to verify strict input rejection
        data: {},
      }),
    ).rejects.toBeDefined();
  });
});

// ===========================================================================
// actor.updateByAdmin — adminProcedure
// ===========================================================================
describe('actor.updateByAdmin', () => {
  test('updates a landlord with skipValidation', async () => {
    const { landlord } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    const result = await caller.actor.updateByAdmin({
      type: 'landlord',
      id: landlord.id,
      data: { phone: '5551234567' },
      skipValidation: true,
    });

    expect(result.id).toBe(landlord.id);
    const updated = await prisma.landlord.findUnique({ where: { id: landlord.id } });
    expect(updated?.phone).toBe('5551234567');
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { landlord } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.actor.updateByAdmin({
          type: 'landlord',
          id: landlord.id,
          data: { phone: '5550000000' },
          skipValidation: true,
        }),
    });
  });
});

// ===========================================================================
// actor.getById — protectedProcedure
// ===========================================================================
describe('actor.getById', () => {
  test('returns the actor by id and type', async () => {
    const { tenant } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    const result = await caller.actor.getById({ type: 'tenant', id: tenant.id });
    expect(result.id).toBe(tenant.id);
  });

  test('throws NOT_FOUND for unknown id', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.actor.getById({ type: 'tenant', id: 'nope' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    const { tenant } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.actor.getById({ type: 'tenant', id: tenant.id }),
    });
  });
});

// ===========================================================================
// actor.listByPolicy — protectedProcedure
// ===========================================================================
describe('actor.listByPolicy', () => {
  test('returns all actors on a policy', async () => {
    const { policy } = await createPolicyWithActors();
    await jointObligorFactory.create({}, { transient: { policyId: policy.id } });
    await avalFactory.create({}, { transient: { policyId: policy.id } });

    const { caller } = await createAdminCaller();
    const result = await caller.actor.listByPolicy({ policyId: policy.id });

    const types = result.map((r) => r.type);
    expect(types).toContain('tenant');
    expect(types).toContain('landlord');
    expect(types).toContain('jointObligor');
    expect(types).toContain('aval');
  });

  test('filters by actor type when provided', async () => {
    const { policy } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    const result = await caller.actor.listByPolicy({ policyId: policy.id, type: 'tenant' });
    expect(result.every((r) => r.type === 'tenant')).toBe(true);
    expect(result).toHaveLength(1);
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.actor.listByPolicy({ policyId: policy.id }),
    });
  });
});

// ===========================================================================
// actor.createBatch — adminProcedure
// Happy path deferred: LandlordService.createLandlord runs a transaction that
// requires upstream setup we don't yet have in our factories. Auth gate only.
// ===========================================================================
describe('actor.createBatch', () => {
  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    // Existing landlord/tenant — createBatch will fail at landlord create due
    // to non-unique-but-valid email. We don't care: any error other than
    // UNAUTHORIZED/FORBIDDEN means the gate let the call through.
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.actor.createBatch({
          policyId: policy.id,
          actors: {
            landlord: {
              isCompany: false,
              firstName: 'Auth',
              paternalLastName: 'Probe',
              email: `auth-l-${Math.random().toString(36).slice(2, 6)}@hestia.test`,
              phone: '5550000000',
            },
            tenant: {
              tenantType: TenantType.INDIVIDUAL,
              firstName: 'Auth',
              paternalLastName: 'Probe',
              email: `auth-t-${Math.random().toString(36).slice(2, 6)}@hestia.test`,
              phone: '5550000000',
            },
          },
        }),
    });
  });
});

// ===========================================================================
// actor.update (dualAuth) — session OR token
//
// Happy paths deferred:
//   - session path: ActorAuthService.handleAdminAuth re-resolves the session
//     via next-auth's getServerSession() which calls next/headers() — that
//     throws "called outside a request scope" in the bun:test runtime. A
//     follow-up PR will either refactor the service to accept the resolved
//     session from ctx or add a next/headers mock to the preload.
//   - token path: LandlordService.update enforces strict per-type validation
//     that needs richer landlord-input fixtures than what we have today.
// ===========================================================================
describe('actor.update (dualAuth)', () => {
  test('throws UNAUTHORIZED with no session and no token', async () => {
    const { landlord } = await createPolicyWithActors();
    const { caller } = createPublicCaller();
    await expect(
      caller.actor.update({
        type: 'landlord',
        identifier: landlord.id,
        data: { phone: '5550000001' },
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

// ===========================================================================
// actor.submitActor (dualAuth)
// ===========================================================================
describe('actor.submitActor (dualAuth)', () => {
  test('throws UNAUTHORIZED with no session and no token', async () => {
    const { landlord } = await createPolicyWithActors();
    const { caller } = createPublicCaller();
    await expect(
      caller.actor.submitActor({ type: 'landlord', identifier: landlord.id }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

// ===========================================================================
// actor.adminSubmitActor — adminProcedure
// ===========================================================================
describe('actor.adminSubmitActor', () => {
  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { landlord } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.actor.adminSubmitActor({
          type: 'landlord',
          id: landlord.id,
          skipValidation: true,
        }),
    });
  });
});

// ===========================================================================
// actor.markComplete — protectedProcedure
// ===========================================================================
describe('actor.markComplete', () => {
  test('marks an actor as informationComplete=true', async () => {
    const { tenant } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    const result = await caller.actor.markComplete({ type: 'tenant', id: tenant.id });
    expect(result.informationComplete).toBe(true);

    const refreshed = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    expect(refreshed?.informationComplete).toBe(true);
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    const { tenant } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.actor.markComplete({ type: 'tenant', id: tenant.id }),
    });
  });
});

// ===========================================================================
// landlord.saveMultipleLandlords — dualAuth (auth gate only; strict input)
// ===========================================================================
describe('actor.saveMultipleLandlords (landlord)', () => {
  test('throws UNAUTHORIZED with no session and no token', async () => {
    const { policy } = await createPolicyWithActors();
    const { caller } = createPublicCaller();
    await expect(
      caller.actor.saveMultipleLandlords({
        policyId: policy.id,
        // @ts-expect-error — intentionally minimal: gate fires before validation
        landlords: [],
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

// ===========================================================================
// landlord.savePropertyDetails — dualAuth
// ===========================================================================
describe('actor.savePropertyDetails (landlord)', () => {
  test('upserts property details when called with a valid landlord token', async () => {
    const { landlord, policy } = await createPolicyWithActors();
    const { token, caller } = await mintLandlordToken(landlord.id);

    const result = await caller.actor.savePropertyDetails({
      type: 'landlord',
      identifier: token,
      propertyDetails: {
        propertyType: 'APARTMENT',
        propertyDescription: 'Test apartment',
      },
    });

    expect((result as { policyId: string }).policyId).toBe(policy.id);
  });

  test('throws UNAUTHORIZED with no session and no token', async () => {
    const { landlord } = await createPolicyWithActors();
    const { caller } = createPublicCaller();
    await expect(
      caller.actor.savePropertyDetails({
        type: 'landlord',
        identifier: landlord.id,
        propertyDetails: { propertyType: 'APARTMENT' },
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

// ===========================================================================
// landlord.savePolicyFinancial — dualAuth
// ===========================================================================
describe('actor.savePolicyFinancial (landlord)', () => {
  test('updates the policy financial fields via landlord token', async () => {
    const { landlord, policy } = await createPolicyWithActors();
    const { token, caller } = await mintLandlordToken(landlord.id);

    const result = await caller.actor.savePolicyFinancial({
      type: 'landlord',
      identifier: token,
      policyFinancial: {
        securityDeposit: 2,
        maintenanceFee: 500,
        maintenanceIncludedInRent: false,
        issuesTaxReceipts: true,
        hasIVA: true,
      },
    });

    expect((result as { id: string }).id).toBe(policy.id);
    const refreshed = await prisma.policy.findUnique({ where: { id: policy.id } });
    expect(refreshed?.securityDeposit).toBe(2);
    expect(refreshed?.maintenanceFee).toBe(500);
    expect(refreshed?.hasIVA).toBe(true);
  });

  test('throws UNAUTHORIZED with no session and no token', async () => {
    const { landlord } = await createPolicyWithActors();
    const { caller } = createPublicCaller();
    await expect(
      caller.actor.savePolicyFinancial({
        type: 'landlord',
        identifier: landlord.id,
        policyFinancial: { securityDeposit: 1 },
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

// ===========================================================================
// landlord.validateLandlord — publicProcedure (pure validation, no DB)
// ===========================================================================
describe('actor.validateLandlord (landlord)', () => {
  test('returns valid=false with errors for an empty payload', async () => {
    const { caller } = createPublicCaller();
    const result = await caller.actor.validateLandlord({
      data: {},
      isCompany: false,
      mode: 'strict',
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  test('auth gate: every scope allowed (public)', async () => {
    await expectAuthGate({
      allowed: ['PUBLIC', UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) =>
        caller.actor.validateLandlord({
          data: {},
          isCompany: false,
          mode: 'partial',
        }),
    });
  });
});

// ===========================================================================
// landlord.getLandlordsByPolicy — protectedProcedure
// ===========================================================================
describe('actor.getLandlordsByPolicy (landlord)', () => {
  test('returns the landlords for a policy', async () => {
    const { policy, landlord } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    const result = await caller.actor.getLandlordsByPolicy({ policyId: policy.id });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.find((l) => l.id === landlord.id)).toBeDefined();
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.actor.getLandlordsByPolicy({ policyId: policy.id }),
    });
  });
});

// ===========================================================================
// landlord.deleteCoOwner — dualAuth
// ===========================================================================
describe('actor.deleteCoOwner (landlord)', () => {
  test('throws UNAUTHORIZED with no session and no token', async () => {
    const { landlord } = await createPolicyWithActors();
    const { caller } = createPublicCaller();
    await expect(
      caller.actor.deleteCoOwner({ type: 'landlord', id: landlord.id }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
