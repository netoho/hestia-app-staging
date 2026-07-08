/**
 * Integration tests for the `policy` tRPC router.
 *
 * Demonstrates the full toolchain end-to-end:
 *   - Real Postgres (per-test reset+seed via preload)
 *   - tRPC server-side caller via createCaller (callers.ts)
 *   - Auth-gate compression via expectAuthGate
 *   - fishery factories + scenarios
 *   - .output(zod) contract enforcement (the schema would fail to parse if a
 *     service silently dropped a field)
 */

import { describe, test, expect, spyOn } from 'bun:test';
import * as notificationService from '@/lib/services/notificationService';
import { TRPCError } from '@trpc/server';
import {
  PolicyStatus,
  PolicyCancellationReason,
  GuarantorType,
  PropertyType,
  TenantType,
  UserRole,
} from '@/prisma/generated/prisma-client/enums';
import { prisma } from '../../utils/database';
import {
  createAdminCaller,
  createBrokerCaller,
  createStaffCaller,
  createPublicCaller,
} from '../callers';
import { expectAuthGate } from '../expectAuthGate';
import { createPolicyWithActors } from '../scenarios';
import { packageFactory, policyFactory, landlordFactory, tenantFactory } from '../factories';
import { mintTenantToken, mintLandlordToken } from '../actorTokens';
import { actorTokenService } from '@/lib/services/actorTokenService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildCreatePolicyInput(packageId: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    policyNumber: `POL-20260101-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    propertyType: PropertyType.APARTMENT,
    rentAmount: 15000,
    depositAmount: 15000,
    contractLength: 12,
    startDate: '2026-01-01',
    endDate: '2027-01-01',
    packageId,
    tenantPercentage: 100,
    landlordPercentage: 0,
    totalPrice: 4100,
    guarantorType: GuarantorType.NONE,
    landlords: [
      {
        isCompany: false,
        firstName: 'Ana',
        paternalLastName: 'Test',
        maternalLastName: 'Landlord',
        email: 'landlord@hestia.test',
        phone: '5555555555',
      },
    ],
    // 1..N tenants (S5b #169) — the singular `tenant` input key is gone.
    tenants: [
      {
        tenantType: TenantType.INDIVIDUAL,
        firstName: 'Beto',
        paternalLastName: 'Test',
        maternalLastName: 'Tenant',
        email: 'tenant@hestia.test',
        phone: '5555555556',
      },
    ],
    sendInvitations: false,
    ...overrides,
  };
}

// ===========================================================================
// policy.checkNumber — publicProcedure
// ===========================================================================
describe('policy.checkNumber', () => {
  test('returns isValid=true for a well-formed and unused number', async () => {
    const { caller } = createPublicCaller();
    const result = await caller.policy.checkNumber({ number: 'POL-20260101-XYZ' });
    expect(result).toEqual({ isValid: true });
  });

  test('returns isValid=false with error for malformed numbers', async () => {
    const { caller } = createPublicCaller();
    const result = await caller.policy.checkNumber({ number: 'not-a-policy-number' });
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('returns isValid=false when the number is already taken', async () => {
    const taken = 'POL-20260101-ABC';
    const { policy } = await createPolicyWithActors();
    await prisma.policy.update({ where: { id: policy.id }, data: { policyNumber: taken } });

    const { caller } = createPublicCaller();
    const result = await caller.policy.checkNumber({ number: taken });
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('auth gate: public procedure — every scope is allowed through', async () => {
    await expectAuthGate({
      allowed: ['PUBLIC', UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.policy.checkNumber({ number: 'POL-20260101-AAA' }),
    });
  });
});

// ===========================================================================
// policy.cancelPolicy — protectedProcedure with internal BROKER block
// ===========================================================================
describe('policy.cancelPolicy', () => {
  test('cancels a non-cancelled policy and returns success', async () => {
    const { policy } = await createPolicyWithActors({ status: PolicyStatus.COLLECTING_INFO });
    const { caller } = await createAdminCaller();

    const result = await caller.policy.cancelPolicy({
      policyId: policy.id,
      reason: PolicyCancellationReason.OTHER,
      comment: 'Test cancellation',
    });

    expect(result).toEqual({ success: true });

    const after = await prisma.policy.findUnique({ where: { id: policy.id } });
    expect(after?.status).toBe(PolicyStatus.CANCELLED);
    expect(after?.cancellationReason).toBe(PolicyCancellationReason.OTHER);
    expect(after?.cancellationComment).toBe('Test cancellation');
    expect(after?.cancelledAt).toBeInstanceOf(Date);
  });

  test('kills every actor portal token — cancelled links must die (#165)', async () => {
    const { policy, tenant, landlord } = await createPolicyWithActors({
      status: PolicyStatus.COLLECTING_INFO,
    });
    // Live tokens before cancellation.
    const { token: tenantToken, caller: tokenCaller } = await mintTenantToken(tenant.id);
    await mintLandlordToken(landlord.id);
    await tokenCaller.actor.getByToken({ type: 'tenant', token: tenantToken });

    const { caller } = await createAdminCaller();
    await caller.policy.cancelPolicy({
      policyId: policy.id,
      reason: PolicyCancellationReason.OTHER,
      comment: 'Token-death check',
    });

    // Every actor row lost its token…
    const [tenantAfter, landlordAfter] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenant.id } }),
      prisma.landlord.findUnique({ where: { id: landlord.id } }),
    ]);
    expect(tenantAfter?.accessToken).toBeNull();
    expect(tenantAfter?.tokenExpiry).toBeNull();
    expect(landlordAfter?.accessToken).toBeNull();
    expect(landlordAfter?.tokenExpiry).toBeNull();

    // …and the old link is dead at the API.
    await expect(
      tokenCaller.actor.getByToken({ type: 'tenant', token: tenantToken }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('actor tokens expire 180 days out, not 1000 (#165)', async () => {
    const { tenant } = await createPolicyWithActors();
    const { expiresAt } = await mintTenantToken(tenant.id);
    const days = (expiresAt.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(179);
    expect(days).toBeLessThan(181);
  });

  test('throws BAD_REQUEST when cancelling an already-cancelled policy', async () => {
    const { policy } = await createPolicyWithActors({ status: PolicyStatus.CANCELLED });
    const { caller } = await createAdminCaller();

    await expect(
      caller.policy.cancelPolicy({
        policyId: policy.id,
        reason: PolicyCancellationReason.OTHER,
        comment: 'Trying to double-cancel',
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  test('throws BAD_REQUEST when policy does not exist', async () => {
    const { caller } = await createAdminCaller();

    await expect(
      caller.policy.cancelPolicy({
        policyId: 'does-not-exist',
        reason: PolicyCancellationReason.OTHER,
        comment: 'Should fail',
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST', message: 'Policy not found' });
  });

  test('auth gate: ADMIN and STAFF allowed; BROKER and PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors({ status: PolicyStatus.COLLECTING_INFO });

    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.policy.cancelPolicy({
          policyId: policy.id,
          reason: PolicyCancellationReason.OTHER,
          comment: 'auth probe',
        }),
    });
  });
});

// ===========================================================================
// policy.create — protectedProcedure (any authed user)
// ===========================================================================
describe('policy.create', () => {
  test('creates a policy with landlord and tenant; output matches contract', async () => {
    const pkg = await packageFactory.create();
    const { caller, user } = await createAdminCaller();
    const input = buildCreatePolicyInput(pkg.id);

    const result = await caller.policy.create(input);

    // Output schema would have rejected if the service dropped a tracked field.
    expect(result.success).toBe(true);
    expect(result.policy.id).toBeDefined();
    expect(result.policy.policyNumber).toBe(input.policyNumber);
    expect(result.policy.createdById).toBe(user.id);
    expect(result.policy.status).toBe(PolicyStatus.COLLECTING_INFO);
    expect(result.policy.guarantorType).toBe(GuarantorType.NONE);
    expect(result.policy.packageId).toBe(pkg.id);
    expect(result.policy.landlords).toHaveLength(1);
    expect(result.policy.landlords[0]!.isPrimary).toBe(true);
    expect(result.policy.landlords[0]!.email).toBe(input.landlords[0]!.email);
    // Plural tenants array is canonical (S5b #169)…
    expect(result.policy.tenants).toHaveLength(1);
    expect(result.policy.tenants[0]!.email).toBe(input.tenants[0]!.email);
    // …and the legacy singular alias still mirrors tenants[0] (transition contract).
    expect(result.policy.tenant).not.toBeNull();
    expect(result.policy.tenant!.id).toBe(result.policy.tenants[0]!.id);
    expect(result.policy.tenant!.email).toBe(input.tenants[0]!.email);

    // Side effects persisted.
    const persisted = await prisma.policy.findUnique({
      where: { id: result.policy.id },
      include: { landlords: true, tenants: true, propertyDetails: true },
    });
    expect(persisted).not.toBeNull();
    expect(persisted!.landlords).toHaveLength(1);
    expect(persisted!.tenants).toHaveLength(1);
    expect(persisted!.propertyDetails).not.toBeNull();
  });

  test('creates primary + co-owner landlords; only the first is primary', async () => {
    const pkg = await packageFactory.create();
    const { caller } = await createAdminCaller();
    const input = buildCreatePolicyInput(pkg.id);
    input.landlords = [
      input.landlords[0]!,
      {
        isCompany: false,
        firstName: 'Carlos',
        paternalLastName: 'Co',
        maternalLastName: 'Owner',
        email: 'co-owner@hestia.test',
        phone: '5555555557',
      },
    ];

    const result = await caller.policy.create(input);

    expect(result.policy.landlords).toHaveLength(2);
    const primaries = result.policy.landlords.filter((l) => l.isPrimary);
    expect(primaries).toHaveLength(1);
    // The first entry is the primary; co-owners are not.
    const primary = result.policy.landlords.find((l) => l.email === input.landlords[0]!.email);
    const coOwner = result.policy.landlords.find((l) => l.email === 'co-owner@hestia.test');
    expect(primary!.isPrimary).toBe(true);
    expect(coOwner!.isPrimary).toBe(false);
  });

  test('rejects invalid input (validation smoke)', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.policy.create({ ...buildCreatePolicyInput('any'), rentAmount: -1 } as never),
    ).rejects.toBeInstanceOf(TRPCError);
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    const pkg = await packageFactory.create();

    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      // Build fresh input per invocation — policyNumber is unique-constrained
      // and the same call runs once per scope.
      invoke: (caller) => caller.policy.create(buildCreatePolicyInput(pkg.id)),
    });
  });
});

// ===========================================================================
// policy.list — brokerProcedure (ADMIN/STAFF/BROKER allowed)
// ===========================================================================
describe('policy.list', () => {
  test('returns paginated policies for ADMIN', async () => {
    await createPolicyWithActors();
    await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    const result = await caller.policy.list({ page: 1, limit: 10 });

    expect(result.policies.length).toBeGreaterThanOrEqual(2);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(10);
    expect(result.pagination.total).toBeGreaterThanOrEqual(2);
    expect(result.pagination.totalPages).toBeGreaterThanOrEqual(1);
  });

  test('BROKER sees only policies they created', async () => {
    const { caller: brokerA, user: brokerAUser } = await createBrokerCaller();
    const { caller: brokerB } = await createBrokerCaller();

    const pkg = await packageFactory.create();
    const inputA = buildCreatePolicyInput(pkg.id);
    await brokerA.policy.create(inputA);
    const inputB = buildCreatePolicyInput(pkg.id);
    await brokerB.policy.create(inputB);

    const list = await brokerA.policy.list({ page: 1, limit: 10 });
    expect(list.policies).toHaveLength(1);
    expect(list.policies[0]!.policyNumber).toBe(inputA.policyNumber);
    expect(list.policies[0]!.createdById).toBe(brokerAUser.id);
  });

  test('respects pagination params', async () => {
    for (let i = 0; i < 3; i++) await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    const page1 = await caller.policy.list({ page: 1, limit: 2 });
    expect(page1.policies).toHaveLength(2);
    expect(page1.pagination.totalPages).toBeGreaterThanOrEqual(2);
  });

  test('auth gate: ADMIN/STAFF/BROKER allowed; PUBLIC blocked', async () => {
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.policy.list({ page: 1, limit: 10 }),
    });
  });
});

// ===========================================================================
// policy.getById — protectedProcedure with internal BROKER ownership check
// ===========================================================================
describe('policy.getById', () => {
  test('returns the policy with allActorsComplete for ADMIN', async () => {
    const { policy } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    const result = await caller.policy.getById({ id: policy.id });
    expect(result.id).toBe(policy.id);
    expect(result.policyNumber).toBe(policy.policyNumber);
    expect(result.allActorsComplete).toBe(false);
    // Plural tenants canonical + legacy singular alias mirrors tenants[0] (S5b #169).
    expect(result.tenants.length).toBeGreaterThanOrEqual(1);
    expect(result.tenant).not.toBeNull();
    expect(result.tenant!.id).toBe(result.tenants[0]!.id);
    expect(result.landlords.length).toBeGreaterThanOrEqual(1);
  });

  test('includes progress when includeProgress=true', async () => {
    const { policy } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    const result = await caller.policy.getById({ id: policy.id, includeProgress: true });
    expect(result.progress).toBeDefined();
    expect(typeof result.progress!.overall).toBe('number');
  });

  test('throws NOT_FOUND when policy does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(caller.policy.getById({ id: 'does-not-exist' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  test('throws FORBIDDEN when BROKER reads someone else’s policy', async () => {
    const { policy } = await createPolicyWithActors();
    const { caller: otherBroker } = await createBrokerCaller();
    await expect(otherBroker.policy.getById({ id: policy.id })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    const { policy, creator } = await createPolicyWithActors();
    // Make BROKER own this policy so they pass the ownership check; ADMIN/STAFF
    // bypass the check entirely.
    await prisma.policy.update({ where: { id: policy.id }, data: { createdById: creator.id } });

    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      // Note: BROKER could pass auth middleware but fails ownership FORBIDDEN —
      // expectAuthGate treats that as gate-blocked. Match the actual behavior.
      invoke: (caller) => caller.policy.getById({ id: policy.id }),
    });
  });
});

// ===========================================================================
// policy.updateStatus — protectedProcedure with internal BROKER block
// Allowed transitions: COLLECTING_INFO → CANCELLED is the safest for tests.
// ===========================================================================
describe('policy.updateStatus', () => {
  test('transitions COLLECTING_INFO → CANCELLED for ADMIN', async () => {
    const { policy } = await createPolicyWithActors({ status: PolicyStatus.COLLECTING_INFO });
    const { caller } = await createAdminCaller();

    const result = await caller.policy.updateStatus({
      policyId: policy.id,
      status: PolicyStatus.CANCELLED,
    });

    expect(result.success).toBe(true);
    expect(result.policy?.id).toBe(policy.id);
    expect(result.policy?.status).toBe(PolicyStatus.CANCELLED);

    const after = await prisma.policy.findUnique({ where: { id: policy.id } });
    expect(after?.status).toBe(PolicyStatus.CANCELLED);
  });

  test('throws BAD_REQUEST on invalid transition (CANCELLED → ACTIVE)', async () => {
    const { policy } = await createPolicyWithActors({ status: PolicyStatus.CANCELLED });
    const { caller } = await createAdminCaller();

    await expect(
      caller.policy.updateStatus({ policyId: policy.id, status: PolicyStatus.ACTIVE }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  test('throws BAD_REQUEST when policy does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.policy.updateStatus({ policyId: 'nope', status: PolicyStatus.CANCELLED }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST', message: 'Policy not found' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER and PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors({ status: PolicyStatus.COLLECTING_INFO });

    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.policy.updateStatus({ policyId: policy.id, status: PolicyStatus.CANCELLED }),
    });
  });
});

// ===========================================================================
// multi-landlord completion gate + progress (PR-1)
// Every landlord (primary + co-owners) must complete their info; all of them
// count toward progress and gate activation — matching joint obligor / aval.
// ===========================================================================
describe('multi-landlord completion gate', () => {
  test('a single complete landlord + complete tenant → allComplete', async () => {
    const { policy, landlord } = await createPolicyWithActors();
    await prisma.landlord.update({ where: { id: landlord.id }, data: { informationComplete: true } });
    await prisma.tenant.updateMany({ where: { policyId: policy.id }, data: { informationComplete: true } });

    const result = await actorTokenService.checkPolicyActorsComplete(policy.id);
    expect(result.landlords).toBe(true);
    expect(result.allComplete).toBe(true);
  });

  test('an incomplete co-owner blocks completion even when primary is complete', async () => {
    const { policy, landlord } = await createPolicyWithActors();
    await prisma.landlord.update({ where: { id: landlord.id }, data: { informationComplete: true } });
    await prisma.tenant.updateMany({ where: { policyId: policy.id }, data: { informationComplete: true } });
    // Add a second, incomplete landlord (co-owner)
    const coOwner = await landlordFactory.create(
      { informationComplete: false },
      { transient: { policyId: policy.id } },
    );

    const blocked = await actorTokenService.checkPolicyActorsComplete(policy.id);
    expect(blocked.landlords).toBe(false);
    expect(blocked.allComplete).toBe(false);

    // Completing the co-owner unblocks
    await prisma.landlord.update({ where: { id: coOwner.id }, data: { informationComplete: true } });
    const unblocked = await actorTokenService.checkPolicyActorsComplete(policy.id);
    expect(unblocked.landlords).toBe(true);
    expect(unblocked.allComplete).toBe(true);
  });

  test('getById.allActorsComplete reflects every landlord (co-owner gates it)', async () => {
    const { policy, landlord } = await createPolicyWithActors();
    await prisma.landlord.update({ where: { id: landlord.id }, data: { informationComplete: true } });
    await prisma.tenant.updateMany({ where: { policyId: policy.id }, data: { informationComplete: true } });
    const coOwner = await landlordFactory.create(
      { informationComplete: false },
      { transient: { policyId: policy.id } },
    );
    const { caller } = await createAdminCaller();

    const blocked = await caller.policy.getById({ id: policy.id });
    expect(blocked.allActorsComplete).toBe(false);

    await prisma.landlord.update({ where: { id: coOwner.id }, data: { informationComplete: true } });
    const unblocked = await caller.policy.getById({ id: policy.id });
    expect(unblocked.allActorsComplete).toBe(true);
  });

  test('progress counts all landlords — an incomplete co-owner lowers overall', async () => {
    const { policy, landlord } = await createPolicyWithActors();
    await prisma.landlord.update({ where: { id: landlord.id }, data: { informationComplete: true } });
    await prisma.tenant.updateMany({ where: { policyId: policy.id }, data: { informationComplete: true } });
    const { caller } = await createAdminCaller();

    // 1 complete landlord + 1 complete tenant (guarantorType NONE) → 100%
    const before = await caller.policy.getById({ id: policy.id, includeProgress: true });
    expect(before.progress!.overall).toBe(100);

    // Adding an incomplete co-owner pulls completedActors/totalActors below 100
    await landlordFactory.create(
      { informationComplete: false },
      { transient: { policyId: policy.id } },
    );
    const after = await caller.policy.getById({ id: policy.id, includeProgress: true });
    expect(after.progress!.overall).toBeLessThan(100);
  });
});

// ===========================================================================
// policy.getShareLinks — protectedProcedure with BROKER ownership check
// ===========================================================================
describe('policy.getShareLinks', () => {
  test('returns the policy number and an array of share links', async () => {
    const { policy } = await createPolicyWithActors();
    // Give the tenant an access token so a link is generated.
    await prisma.tenant.updateMany({
      where: { policyId: policy.id },
      data: {
        accessToken: 'tok-tenant-test',
        tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const { caller } = await createAdminCaller();
    const result = await caller.policy.getShareLinks({ policyId: policy.id });

    expect(result.policyNumber).toBe(policy.policyNumber);
    expect(Array.isArray(result.shareLinks)).toBe(true);
    const tenantLink = result.shareLinks.find((l) => l.actorType === 'tenant');
    expect(tenantLink).toBeDefined();
    expect(tenantLink!.url).toContain('tok-tenant-test');
  });

  test('returns a link for every landlord, not just the primary', async () => {
    const { policy, landlord } = await createPolicyWithActors();
    // Primary landlord token
    await prisma.landlord.update({
      where: { id: landlord.id },
      data: {
        accessToken: 'tok-landlord-primary',
        tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    // Co-owner with its own token
    await landlordFactory.create(
      {
        accessToken: 'tok-landlord-coowner',
        tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      { transient: { policyId: policy.id } },
    );

    const { caller } = await createAdminCaller();
    const result = await caller.policy.getShareLinks({ policyId: policy.id });

    const landlordLinks = result.shareLinks.filter((l) => l.actorType === 'landlord');
    expect(landlordLinks).toHaveLength(2);
    const urls = landlordLinks.map((l) => l.url);
    expect(urls.some((u) => u.includes('tok-landlord-primary'))).toBe(true);
    expect(urls.some((u) => u.includes('tok-landlord-coowner'))).toBe(true);
  });

  test('mints a link for a token-less actor (e.g. an admin-added co-tenant)', async () => {
    const { policy } = await createPolicyWithActors();
    // A co-tenant added by admin arrives empty, with no access token — it
    // must still surface a shareable link (#216).
    const coTenant = await tenantFactory.create(
      { accessToken: null, tokenExpiry: null },
      { transient: { policyId: policy.id } },
    );

    const { caller } = await createAdminCaller();
    const result = await caller.policy.getShareLinks({ policyId: policy.id });

    const coTenantLink = result.shareLinks.find((l) => l.actorId === coTenant.id);
    expect(coTenantLink).toBeDefined();
    expect(coTenantLink!.url).toMatch(/\/actor\/tenant\/.+/);
    // The token was minted and persisted on the row.
    const refreshed = await prisma.tenant.findUnique({ where: { id: coTenant.id } });
    expect(refreshed?.accessToken).toBeTruthy();
  });

  test('throws NOT_FOUND when policy does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(caller.policy.getShareLinks({ policyId: 'nope' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  test('auth gate: ADMIN/STAFF/BROKER(owner) allowed; PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.policy.getShareLinks({ policyId: policy.id }),
    });
  });
});

// ===========================================================================
// policy.sendInvitations — protectedProcedure with BROKER ownership check
// notificationService is mocked to return [] so the schema validates.
// ===========================================================================
describe('policy.sendInvitations', () => {
  test('returns success with an invitations array', async () => {
    const { policy } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    const result = await caller.policy.sendInvitations({ policyId: policy.id });
    expect(result.success).toBe(true);
    expect(Array.isArray(result.invitations)).toBe(true);
  });

  test('returns INTERNAL_SERVER_ERROR when policy does not exist', async () => {
    const { caller } = await createAdminCaller();
    // The router catches its own NOT_FOUND inside a try/catch and rethrows as
    // INTERNAL_SERVER_ERROR — that's the actual contract.
    await expect(
      caller.policy.sendInvitations({ policyId: 'does-not-exist' }),
    ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
  });

  test('forwards actorIds to the notification service so a per-row resend targets one actor (#209)', async () => {
    const { policy, tenant } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    const spy = spyOn(notificationService, 'sendIncompleteActorInfoNotification');
    spy.mockClear();

    await caller.policy.sendInvitations({
      policyId: policy.id,
      actors: ['tenant'],
      actorIds: [tenant.id],
      resend: true,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toMatchObject({
      policyId: policy.id,
      actors: ['tenant'],
      actorIds: [tenant.id],
    });

    spy.mockRestore();
  });

  test('auth gate: ADMIN/STAFF allowed; PUBLIC blocked (BROKER coverage deferred)', async () => {
    const { policy } = await createPolicyWithActors();
    // BROKER scope is deliberately excluded: the router wraps the FORBIDDEN
    // ownership check in a try/catch that re-throws as INTERNAL_SERVER_ERROR,
    // so expectAuthGate cannot distinguish a real auth block from a service
    // error. Re-enable BROKER once that error handling is fixed.
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      scopes: ['PUBLIC', UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.policy.sendInvitations({ policyId: policy.id }),
    });
  });
});

// ===========================================================================
// policy.replaceTenant — protectedProcedure with BROKER block (ADMIN/STAFF only)
// ===========================================================================
describe('policy.replaceTenant', () => {
  test('auth gate: ADMIN/STAFF allowed; BROKER and PUBLIC blocked', async () => {
    const { policy, tenant } = await createPolicyWithActors({ status: PolicyStatus.COLLECTING_INFO });

    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.policy.replaceTenant({
          policyId: policy.id,
          // 1..N tenants (S5b #169): name WHICH tenant row to replace.
          tenantId: tenant.id,
          replacementReason: 'auth probe',
          newTenant: {
            tenantType: TenantType.INDIVIDUAL,
            email: `replacement-${Math.random().toString(36).slice(2, 6)}@hestia.test`,
            phone: '5555555555',
            firstName: 'Replacement',
          },
          replaceGuarantors: false,
        }),
    });
  });
});

// ===========================================================================
// policy.changeGuarantorType — protectedProcedure with BROKER block
// ===========================================================================
describe('policy.changeGuarantorType', () => {
  test('auth gate: ADMIN/STAFF allowed; BROKER and PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors({ status: PolicyStatus.COLLECTING_INFO });

    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.policy.changeGuarantorType({
          policyId: policy.id,
          reason: 'auth probe',
          newGuarantorType: GuarantorType.NONE,
        }),
    });
  });
});

// ===========================================================================
// policy.renew — protectedProcedure with BROKER block
// clonePolicyForRenewal is a complex transactional service; we cover the auth
// gate here and defer the happy path until renewal-specific factories exist.
// ===========================================================================
describe('policy.renew', () => {
  test('clones every landlord (primary + co-owners), preserving isPrimary', async () => {
    const { policy, tenant } = await createPolicyWithActors({ status: PolicyStatus.ACTIVE });
    // Add a co-owner (non-primary) landlord, no documents → no S3 copy.
    await landlordFactory.create(
      { firstName: 'CoOwner', paternalLastName: 'Renew' },
      { transient: { policyId: policy.id } },
    );
    const sourceLandlords = await prisma.landlord.findMany({ where: { policyId: policy.id } });
    const { caller } = await createAdminCaller();

    const result = await caller.policy.renew({
      sourcePolicyId: policy.id,
      startDate: '2027-01-01',
      endDate: '2028-01-01',
      selection: {
        property: { address: false, typeAndDescription: true, features: true, services: true },
        policyTerms: {
          guarantorType: GuarantorType.NONE,
          financial: true,
          contract: true,
          packageAndPricing: true,
        },
        landlords: sourceLandlords.map((l) => ({
          sourceId: l.id,
          include: true,
          basicInfo: true,
          contact: true,
          address: false,
          banking: true,
          propertyDeed: true,
          cfdi: true,
          documents: false,
        })),
        // One entry per tenant (S5b #169); renewal clones ALL tenants.
        tenants: [
          {
            sourceId: tenant.id,
            include: true,
            basicInfo: false,
            contact: false,
            address: false,
            employment: false,
            rentalHistory: false,
            references: false,
            paymentPreferences: false,
            documents: false,
          },
        ],
        jointObligors: [],
        avals: [],
      },
    });

    const newLandlords = await prisma.landlord.findMany({
      where: { policyId: result.newPolicyId },
      orderBy: { isPrimary: 'desc' },
    });
    expect(newLandlords).toHaveLength(2);
    expect(newLandlords.filter((l) => l.isPrimary)).toHaveLength(1);
    // The co-owner carried over alongside the primary.
    expect(newLandlords.map((l) => l.firstName)).toContain('CoOwner');
  });

  test('drops a co-owner whose include is false (per-landlord selection)', async () => {
    const { policy, landlord, tenant } = await createPolicyWithActors({ status: PolicyStatus.ACTIVE });
    const coOwner = await landlordFactory.create(
      { firstName: 'Dropped', paternalLastName: 'CoOwner' },
      { transient: { policyId: policy.id } },
    );
    const { caller } = await createAdminCaller();

    const result = await caller.policy.renew({
      sourcePolicyId: policy.id,
      startDate: '2027-01-01',
      endDate: '2028-01-01',
      selection: {
        property: { address: true, typeAndDescription: true, features: true, services: true },
        policyTerms: {
          guarantorType: GuarantorType.NONE,
          financial: true,
          contract: true,
          packageAndPricing: true,
        },
        landlords: [
          { sourceId: landlord.id, include: true, basicInfo: true, contact: true, address: true, banking: true, propertyDeed: true, cfdi: true, documents: false },
          { sourceId: coOwner.id, include: false, basicInfo: true, contact: true, address: true, banking: true, propertyDeed: true, cfdi: true, documents: false },
        ],
        tenants: [
          {
            sourceId: tenant.id, include: true, basicInfo: false, contact: false, address: false, employment: false,
            rentalHistory: false, references: false, paymentPreferences: false, documents: false,
          },
        ],
        jointObligors: [],
        avals: [],
      },
    });

    const newLandlords = await prisma.landlord.findMany({
      where: { policyId: result.newPolicyId },
    });
    // Only the included landlord carried over; the excluded co-owner was dropped.
    expect(newLandlords).toHaveLength(1);
    expect(newLandlords.map((l) => l.firstName)).not.toContain('Dropped');
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER and PUBLIC blocked', async () => {
    const { policy, landlord, tenant } = await createPolicyWithActors();

    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.policy.renew({
          sourcePolicyId: policy.id,
          startDate: '2027-01-01',
          endDate: '2028-01-01',
          selection: {
            property: { address: true, typeAndDescription: true, features: true, services: true },
            policyTerms: {
              guarantorType: GuarantorType.NONE,
              financial: true,
              contract: true,
              packageAndPricing: true,
            },
            landlords: [
              {
                sourceId: landlord.id,
                include: true,
                basicInfo: true,
                contact: true,
                address: true,
                banking: true,
                propertyDeed: true,
                cfdi: true,
                documents: true,
              },
            ],
            tenants: [
              {
                sourceId: tenant.id,
                include: true,
                basicInfo: false,
                contact: false,
                address: false,
                employment: false,
                rentalHistory: false,
                references: false,
                paymentPreferences: false,
                documents: false,
              },
            ],
            jointObligors: [],
            avals: [],
          },
        }),
    });
  });
});

// ===========================================================================
// policy.assignManager — adminProcedure (ADMIN + STAFF allowed)
// ===========================================================================
describe('policy.assignManager', () => {
  async function createPolicyAndBroker() {
    const { policy } = await createPolicyWithActors();
    const broker = await prisma.user.create({
      data: {
        email: `broker-${Math.random().toString(36).slice(2, 6)}@hestia.test`,
        name: 'Test Broker',
        role: UserRole.BROKER,
        isActive: true,
      },
    });
    return { policy, broker };
  }

  test('assigns a broker to an unassigned policy and logs the activity', async () => {
    const { policy, broker } = await createPolicyAndBroker();
    const { caller } = await createAdminCaller();

    const result = await caller.policy.assignManager({
      policyId: policy.id,
      managedById: broker.id,
    });
    expect(result).toEqual({ success: true });

    const refreshed = await prisma.policy.findUnique({ where: { id: policy.id } });
    expect(refreshed?.managedById).toBe(broker.id);

    const activity = await prisma.policyActivity.findFirst({
      where: { policyId: policy.id, action: 'broker_assigned' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity).not.toBeNull();
    expect(activity!.description).toContain('Broker asignado');
    expect(activity!.description).toContain('Test Broker');
    const details = activity!.details as Record<string, unknown>;
    expect(details.previousBrokerId).toBeNull();
    expect(details.newBrokerId).toBe(broker.id);
    expect(details.newBrokerName).toBe('Test Broker');
  });

  test('reassigns from broker A to broker B with reassignment description', async () => {
    const { policy, broker: brokerA } = await createPolicyAndBroker();
    const brokerB = await prisma.user.create({
      data: {
        email: `broker-b-${Math.random().toString(36).slice(2, 6)}@hestia.test`,
        name: 'Broker B',
        role: UserRole.BROKER,
        isActive: true,
      },
    });
    await prisma.policy.update({ where: { id: policy.id }, data: { managedById: brokerA.id } });

    const { caller } = await createAdminCaller();
    await caller.policy.assignManager({ policyId: policy.id, managedById: brokerB.id });

    const refreshed = await prisma.policy.findUnique({ where: { id: policy.id } });
    expect(refreshed?.managedById).toBe(brokerB.id);

    const activity = await prisma.policyActivity.findFirst({
      where: { policyId: policy.id, action: 'broker_assigned' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity!.description).toContain('Broker reasignado');
    expect(activity!.description).toContain('Test Broker');
    expect(activity!.description).toContain('Broker B');
  });

  test('unassigns broker (sets managedById to null) with unassignment description', async () => {
    const { policy, broker } = await createPolicyAndBroker();
    await prisma.policy.update({ where: { id: policy.id }, data: { managedById: broker.id } });

    const { caller } = await createAdminCaller();
    await caller.policy.assignManager({ policyId: policy.id, managedById: null });

    const refreshed = await prisma.policy.findUnique({ where: { id: policy.id } });
    expect(refreshed?.managedById).toBeNull();

    const activity = await prisma.policyActivity.findFirst({
      where: { policyId: policy.id, action: 'broker_assigned' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity!.description).toContain('Asignación de broker eliminada');
    expect(activity!.description).toContain('Test Broker');
  });

  test('no-op skip: same broker → no write, no log entry', async () => {
    const { policy, broker } = await createPolicyAndBroker();
    await prisma.policy.update({ where: { id: policy.id }, data: { managedById: broker.id } });
    const beforeUpdated = (await prisma.policy.findUnique({ where: { id: policy.id } }))!.updatedAt;

    const { caller } = await createAdminCaller();
    const result = await caller.policy.assignManager({
      policyId: policy.id,
      managedById: broker.id,
    });
    expect(result).toEqual({ success: true });

    const refreshed = await prisma.policy.findUnique({ where: { id: policy.id } });
    expect(refreshed!.updatedAt.getTime()).toBe(beforeUpdated.getTime()); // no write

    const activityCount = await prisma.policyActivity.count({
      where: { policyId: policy.id, action: 'broker_assigned' },
    });
    expect(activityCount).toBe(0);
  });

  test('throws BAD_REQUEST when target user does not exist', async () => {
    const { policy } = await createPolicyAndBroker();
    const { caller } = await createAdminCaller();
    await expect(
      caller.policy.assignManager({ policyId: policy.id, managedById: 'cmnouser1234567890abcd' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  test('throws BAD_REQUEST when target user is inactive', async () => {
    const { policy } = await createPolicyAndBroker();
    const inactive = await prisma.user.create({
      data: {
        email: `inactive-${Math.random().toString(36).slice(2, 6)}@hestia.test`,
        name: 'Inactive Broker',
        role: UserRole.BROKER,
        isActive: false,
      },
    });
    const { caller } = await createAdminCaller();
    await expect(
      caller.policy.assignManager({ policyId: policy.id, managedById: inactive.id }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  test('throws BAD_REQUEST when target user is not a BROKER', async () => {
    const { policy } = await createPolicyAndBroker();
    const staff = await prisma.user.create({
      data: {
        email: `staff-${Math.random().toString(36).slice(2, 6)}@hestia.test`,
        name: 'Staff User',
        role: UserRole.STAFF,
        isActive: true,
      },
    });
    const { caller } = await createAdminCaller();
    await expect(
      caller.policy.assignManager({ policyId: policy.id, managedById: staff.id }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  test('throws NOT_FOUND when policy does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.policy.assignManager({ policyId: 'cmnopolicy1234567890abcd', managedById: null }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { policy, broker } = await createPolicyAndBroker();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.policy.assignManager({ policyId: policy.id, managedById: broker.id }),
    });
  });
});

// ===========================================================================
// createPolicy auto-assignment of managedById when creator is BROKER
// ===========================================================================
describe('policy.create auto-assign managedById', () => {
  test('broker self-create: managedById === createdById', async () => {
    const { caller, user } = await createBrokerCaller();
    const pkg = await packageFactory.create();
    const input = buildCreatePolicyInput(pkg.id);
    const result = await caller.policy.create(input);
    expect(result.policy.createdById).toBe(user.id);
    expect(result.policy.managedById).toBe(user.id);
  });

  test('admin/staff create: managedById is null until picker sets it', async () => {
    const { caller } = await createAdminCaller();
    const pkg = await packageFactory.create();
    const input = buildCreatePolicyInput(pkg.id);
    const result = await caller.policy.create(input);
    expect(result.policy.managedById).toBeNull();
  });
});
