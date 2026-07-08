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
  landlordFactory,
  packageFactory,
  actorDocumentFactory,
  propertyDeedDocument,
  propertyTaxDocument,
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
// Both auth paths are exercised: admin session uses the refactored
// `ActorAuthService` that now accepts `ctx.session`; token uses a real
// minted access token.
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

  test('admin session: patches a tenant field and persists', async () => {
    const { tenant } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    const result = await caller.actor.update({
      type: 'tenant',
      identifier: tenant.id,
      data: { phone: '5550999111', partial: true },
    });

    expect(result.id).toBe(tenant.id);
    expect(result.submitted).toBe(false);

    const refreshed = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    expect(refreshed?.phone).toBe('5550999111');
  });

  test('actor token: patches own phone field and persists', async () => {
    const { tenant } = await createPolicyWithActors();
    const { token, caller } = await mintTenantToken(tenant.id);

    const result = await caller.actor.update({
      type: 'tenant',
      identifier: token,
      data: { phone: '5550111222', partial: true },
    });

    expect(result.id).toBe(tenant.id);
    const refreshed = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    expect(refreshed?.phone).toBe('5550111222');
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

  test('admin session: skipValidation skips both completeness AND required-documents', async () => {
    // Admins have skipValidation = true (per ActorAuthService). PR-2 guards
    // BOTH the completeness check AND the required-documents check by
    // skipValidation, so an admin can force-complete a landlord even with
    // zero documents on record.
    const { landlord } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    const result = await caller.actor.submitActor({
      type: 'landlord',
      identifier: landlord.id,
    });

    expect(result.id).toBe(landlord.id);
    const refreshed = await prisma.landlord.findUnique({ where: { id: landlord.id } });
    expect(refreshed?.informationComplete).toBe(true);
    expect(refreshed?.completedAt).not.toBeNull();
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

  test('skipValidation: true marks an incomplete actor complete and skips docs check', async () => {
    // PR-2: skipValidation now skips BOTH completeness AND required-documents.
    // The landlord factory ships zero documents; the call must still succeed.
    const { landlord } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    const result = await caller.actor.adminSubmitActor({
      type: 'landlord',
      id: landlord.id,
      skipValidation: true,
    });

    expect(result.submitted).toBe(true);
    expect(result.id).toBe(landlord.id);
    const refreshed = await prisma.landlord.findUnique({ where: { id: landlord.id } });
    expect(refreshed?.informationComplete).toBe(true);
  });

  test('forced submission records activity log with forcedByAdmin + missing data', async () => {
    // Validates the audit trail: when skipValidation: true and the actor
    // actually had missing data, the ACTOR_SUBMITTED PolicyActivity entry
    // captures `forcedByAdmin: true`, `missingFields`, and `missingDocuments`
    // so future audits can see exactly what was overridden.
    const { policy, landlord } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    await caller.actor.adminSubmitActor({
      type: 'landlord',
      id: landlord.id,
      skipValidation: true,
    });

    const activity = await prisma.policyActivity.findFirst({
      where: { policyId: policy.id, action: 'ACTOR_SUBMITTED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity).not.toBeNull();
    const details = activity?.details as {
      forcedByAdmin?: boolean;
      missingFields?: unknown[];
      missingDocuments?: unknown[];
    } | null;
    expect(details?.forcedByAdmin).toBe(true);
    expect(Array.isArray(details?.missingDocuments)).toBe(true);
    expect((details?.missingDocuments ?? []).length).toBeGreaterThan(0);
  });

  test('skipValidation: false on an incomplete tenant rejects with BAD_REQUEST + requiresForce', async () => {
    // PR-2: structured error payload — the TRPCError now carries
    // `data.requiresForce: true` plus the actual missing fields and
    // documents so the client can adapt the dialog without a round-trip.
    const { tenant } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    await expect(
      caller.actor.adminSubmitActor({
        type: 'tenant',
        id: tenant.id,
        skipValidation: false,
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      cause: expect.objectContaining({
        context: expect.objectContaining({
          requiresForce: true,
        }),
      }),
    });

    const refreshed = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    expect(refreshed?.informationComplete).toBe(false);
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
        // intentionally minimal payload: the auth gate fires before input validation
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

  test('removes a co-owner and logs a landlord_removed activity (#183)', async () => {
    const { policy } = await createPolicyWithActors();
    const coOwner = await landlordFactory.create(
      { isPrimary: false, firstName: 'Berta', paternalLastName: 'Saliente' },
      { transient: { policyId: policy.id } },
    );

    const { caller } = await createAdminCaller();
    const result = await caller.actor.deleteCoOwner({ type: 'landlord', id: coOwner.id });
    expect(result).toEqual({ success: true });

    expect(await prisma.landlord.findUnique({ where: { id: coOwner.id } })).toBeNull();

    const activity = await prisma.policyActivity.findFirst({
      where: { policyId: policy.id, action: 'landlord_removed' },
    });
    expect(activity).not.toBeNull();
    expect(activity?.description).toContain('Berta');
  });

  test('rejects removing the primary landlord', async () => {
    const { landlord } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();
    await expect(
      caller.actor.deleteCoOwner({ type: 'landlord', id: landlord.id }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

// ===========================================================================
// landlord.addCoOwner — admin-only co-owner creation (#189)
// ===========================================================================
describe('actor.addCoOwner (landlord)', () => {
  test('creates an empty co-owner and logs a landlord_added activity', async () => {
    const { policy } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    const result = await caller.actor.addCoOwner({ policyId: policy.id });
    expect(result.success).toBe(true);

    const created = await prisma.landlord.findUnique({ where: { id: result.landlordId } });
    expect(created).toMatchObject({ policyId: policy.id, isPrimary: false, isCompany: false });

    const activity = await prisma.policyActivity.findFirst({
      where: { policyId: policy.id, action: 'landlord_added' },
    });
    expect(activity).not.toBeNull();
  });

  test('throws NOT_FOUND for an unknown policy', async () => {
    const { caller } = await createAdminCaller();
    await expect(caller.actor.addCoOwner({ policyId: 'nope' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  test('rejects a sixth landlord (max 5)', async () => {
    const { policy } = await createPolicyWithActors(); // 1 landlord
    for (let i = 0; i < 4; i++) {
      await landlordFactory.create(
        { isPrimary: false },
        { transient: { policyId: policy.id } },
      );
    }
    const { caller } = await createAdminCaller();
    await expect(caller.actor.addCoOwner({ policyId: policy.id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  test('auth gate: any authed role allowed; PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.actor.addCoOwner({ policyId: policy.id }),
    });
  });
});

// ===========================================================================
// JointObligor save — S4b domain toDb + address upsert (#132)
// Exercises the rewired write path: jointObligorToDb → address upsert →
// buildJointObligorUpdateData → tx.update (replaces the deleted prepareForDB).
// ===========================================================================
describe('actor.update (jointObligor) — domain toDb rewire', () => {
  async function makeJointObligor() {
    const { policy } = await createPolicyWithActors();
    const jo = await jointObligorFactory.create({}, { transient: { policyId: policy.id } });
    const { token, caller } = await mintJointObligorToken(jo.id);
    return { jo, token, caller };
  }

  test('company personal tab persists legalRepId (#150 tenant parity)', async () => {
    const { jo, token, caller } = await makeJointObligor();
    await caller.actor.update({
      type: 'jointObligor',
      identifier: token,
      data: {
        tabName: 'personal',
        partial: true,
        jointObligorType: 'COMPANY',
        companyName: 'Obligada Solidaria SA de CV',
        companyRfc: 'OSA010101AB1',
        legalRepFirstName: 'Rita',
        legalRepPaternalLastName: 'Poder',
        legalRepId: 'PASAPORTE-G12345678',
        email: 'os@hestia.test',
        phone: '5553334455',
      },
    });

    const refreshed = await prisma.jointObligor.findUnique({ where: { id: jo.id } });
    expect(refreshed?.legalRepId).toBe('PASAPORTE-G12345678');
    expect(refreshed?.companyName).toBe('Obligada Solidaria SA de CV');
  });

  test('personal tab persists names and upserts the address relation', async () => {
    const { jo, token, caller } = await makeJointObligor();
    await caller.actor.update({
      type: 'jointObligor',
      identifier: token,
      data: {
        tabName: 'personal',
        partial: true,
        jointObligorType: 'INDIVIDUAL',
        firstName: 'Carlos',
        paternalLastName: 'Ruiz',
        email: 'carlos.jo@hestia.test',
        phone: '5551112233',
        addressDetails: {
          street: 'Av. Insurgentes',
          exteriorNumber: '500',
          neighborhood: 'Roma',
          municipality: 'Cuauhtémoc',
          city: 'CDMX',
          state: 'CDMX',
          postalCode: '06700',
        },
      },
    });

    const refreshed = await prisma.jointObligor.findUnique({ where: { id: jo.id } });
    expect(refreshed?.firstName).toBe('Carlos');
    expect(refreshed?.paternalLastName).toBe('Ruiz');
    expect(refreshed?.addressId).toBeTruthy();
  });

  test('guarantee tab (INCOME) persists method + bank; hasPropertyGuarantee=false', async () => {
    const { jo, token, caller } = await makeJointObligor();
    await caller.actor.update({
      type: 'jointObligor',
      identifier: token,
      data: {
        tabName: 'guarantee',
        partial: true,
        jointObligorType: 'INDIVIDUAL',
        guaranteeMethod: 'INCOME',
        bankName: 'Banorte',
        accountHolder: 'Carlos Ruiz',
        monthlyIncome: 60000,
      },
    });

    const refreshed = await prisma.jointObligor.findUnique({ where: { id: jo.id } });
    expect(refreshed?.guaranteeMethod).toBe('INCOME');
    expect(refreshed?.hasPropertyGuarantee).toBe(false);
    expect(refreshed?.bankName).toBe('Banorte');
    expect(refreshed?.monthlyIncome).toBe(60000);
  });

  test('guarantee tab (PROPERTY) persists property fields + upserts guarantee address; hasPropertyGuarantee=true', async () => {
    const { jo, token, caller } = await makeJointObligor();
    await caller.actor.update({
      type: 'jointObligor',
      identifier: token,
      data: {
        tabName: 'guarantee',
        partial: true,
        jointObligorType: 'INDIVIDUAL',
        guaranteeMethod: 'PROPERTY',
        propertyValue: 2500000,
        propertyDeedNumber: 'DEED-9',
        propertyRegistry: 'REG-9',
        guaranteePropertyDetails: {
          street: 'Calle Luna',
          exteriorNumber: '10',
          neighborhood: 'Centro',
          municipality: 'Cuauhtémoc',
          city: 'CDMX',
          state: 'CDMX',
          postalCode: '06000',
        },
      },
    });

    const refreshed = await prisma.jointObligor.findUnique({ where: { id: jo.id } });
    expect(refreshed?.guaranteeMethod).toBe('PROPERTY');
    expect(refreshed?.hasPropertyGuarantee).toBe(true);
    expect(refreshed?.propertyValue).toBe(2500000);
    expect(refreshed?.guaranteePropertyAddressId).toBeTruthy();
  });
});
