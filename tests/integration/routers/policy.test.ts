/**
 * Reference integration test for the `policy` tRPC router.
 *
 * Demonstrates the full Phase 0 toolchain end-to-end:
 *   - Real Postgres (per-test reset+seed via preload)
 *   - tRPC server-side caller via createCaller (callers.ts)
 *   - Auth-gate compression via expectAuthGate
 *   - fishery factories + scenarios
 *   - .output(zod) contract enforcement (the schema would fail to parse if a
 *     service silently dropped a field)
 *
 * Coverage: policy.checkNumber, policy.cancelPolicy, policy.create.
 */

import { describe, test, expect } from 'bun:test';
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
import { createAdminCaller, createPublicCaller } from '../callers';
import { expectAuthGate } from '../expectAuthGate';
import { createPolicyWithActors } from '../scenarios';
import { packageFactory } from '../factories';

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
    landlord: {
      isCompany: false,
      firstName: 'Ana',
      paternalLastName: 'Test',
      maternalLastName: 'Landlord',
      email: 'landlord@hestia.test',
      phone: '5555555555',
    },
    tenant: {
      tenantType: TenantType.INDIVIDUAL,
      firstName: 'Beto',
      paternalLastName: 'Test',
      maternalLastName: 'Tenant',
      email: 'tenant@hestia.test',
      phone: '5555555556',
    },
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
    expect(result.policy.landlords[0]!.email).toBe(input.landlord.email);
    expect(result.policy.tenant).not.toBeNull();
    expect(result.policy.tenant!.email).toBe(input.tenant.email);

    // Side effects persisted.
    const persisted = await prisma.policy.findUnique({
      where: { id: result.policy.id },
      include: { landlords: true, tenant: true, propertyDetails: true },
    });
    expect(persisted).not.toBeNull();
    expect(persisted!.landlords).toHaveLength(1);
    expect(persisted!.tenant).not.toBeNull();
    expect(persisted!.propertyDetails).not.toBeNull();
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
