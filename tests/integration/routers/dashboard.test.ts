/**
 * Integration tests for the `dashboard` tRPC router.
 *
 * Covers the two procedures (getStats, getRecentPolicies):
 *   - happy paths for ADMIN/STAFF (global) and BROKER (scoped to managedById)
 *   - auth gate (PUBLIC blocked, every authed role allowed)
 *   - in-process bucket excludes ACTIVE/PENDING/EXPIRED/CANCELLED
 *   - broker sees policies admin-assigned to them via managedById
 */

import { describe, test, expect } from 'bun:test';
import { PolicyStatus, UserRole } from '@/prisma/generated/prisma-client/enums';
import {
  createAdminCaller,
  createBrokerCaller,
  createStaffCaller,
} from '../callers';
import { expectAuthGate } from '../expectAuthGate';
import { adminUser, packageFactory, policyFactory } from '../factories';

async function seedPoliciesForUser(
  creatorId: string,
  statuses: PolicyStatus[],
  opts: { managedById?: string | null } = {},
) {
  const pkg = await packageFactory.create();
  for (const status of statuses) {
    await policyFactory.create(
      { status },
      {
        transient: {
          createdById: creatorId,
          packageId: pkg.id,
          managedById: opts.managedById ?? null,
        },
      },
    );
  }
}

// ===========================================================================
// dashboard.getStats
// ===========================================================================
describe('dashboard.getStats', () => {
  test('counts every status bucket globally for ADMIN', async () => {
    const { caller, user } = await createAdminCaller();
    await seedPoliciesForUser(user.id, [
      PolicyStatus.ACTIVE,
      PolicyStatus.ACTIVE,
      PolicyStatus.PENDING_APPROVAL,
      PolicyStatus.COLLECTING_INFO,
      PolicyStatus.COLLECTING_INFO,
      PolicyStatus.COLLECTING_INFO,
      PolicyStatus.EXPIRED,
      PolicyStatus.CANCELLED,
    ]);

    const result = await caller.dashboard.getStats();

    expect(result).toEqual({
      active: 2,
      pendingApproval: 1,
      inProcess: 3,
      expired: 1,
    });
  });

  test('STAFF sees the same global counts as ADMIN', async () => {
    const owner = await adminUser.create();
    await seedPoliciesForUser(owner.id, [
      PolicyStatus.ACTIVE,
      PolicyStatus.PENDING_APPROVAL,
    ]);

    const { caller } = await createStaffCaller();
    const result = await caller.dashboard.getStats();
    expect(result.active).toBe(1);
    expect(result.pendingApproval).toBe(1);
  });

  test('BROKER sees only policies they manage (managedById = userId)', async () => {
    const otherCreator = await adminUser.create();
    // Policies created by someone else, not assigned to anyone — broker shouldn't see them.
    await seedPoliciesForUser(otherCreator.id, [PolicyStatus.ACTIVE, PolicyStatus.ACTIVE]);

    const { caller, user } = await createBrokerCaller();
    // Self-created policies (auto-assigned) — broker sees these.
    await seedPoliciesForUser(user.id, [PolicyStatus.ACTIVE], { managedById: user.id });
    await seedPoliciesForUser(user.id, [PolicyStatus.COLLECTING_INFO], { managedById: user.id });

    const result = await caller.dashboard.getStats();
    expect(result.active).toBe(1);
    expect(result.inProcess).toBe(1);
    expect(result.pendingApproval).toBe(0);
    expect(result.expired).toBe(0);
  });

  test('BROKER sees policies ADMIN/STAFF assigned to them via managedById', async () => {
    const admin = await adminUser.create();
    const { caller, user: broker } = await createBrokerCaller();

    // Admin creates a policy and assigns it to the broker (scenario 2).
    await seedPoliciesForUser(admin.id, [PolicyStatus.ACTIVE], { managedById: broker.id });

    const result = await caller.dashboard.getStats();
    expect(result.active).toBe(1);
  });

  test('BROKER does NOT see policies created by themselves but managedById = null', async () => {
    const { caller, user } = await createBrokerCaller();
    // managedById left as null — simulates a broker policy that pre-dated the
    // auto-assign change and hasn't been backfilled. Broker should NOT see it.
    await seedPoliciesForUser(user.id, [PolicyStatus.ACTIVE], { managedById: null });

    const result = await caller.dashboard.getStats();
    expect(result.active).toBe(0);
  });

  test('inProcess excludes terminal + ACTIVE + PENDING_APPROVAL', async () => {
    const { caller, user } = await createAdminCaller();
    await seedPoliciesForUser(user.id, [
      PolicyStatus.ACTIVE,
      PolicyStatus.PENDING_APPROVAL,
      PolicyStatus.EXPIRED,
      PolicyStatus.CANCELLED,
    ]);
    const result = await caller.dashboard.getStats();
    expect(result.inProcess).toBe(0);
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.dashboard.getStats(),
    });
  });
});

// ===========================================================================
// dashboard.getRecentPolicies
// ===========================================================================
describe('dashboard.getRecentPolicies', () => {
  test('returns up to 5 policies sorted by updatedAt DESC, excluding EXPIRED', async () => {
    const { caller, user } = await createAdminCaller();
    const pkg = await packageFactory.create();

    for (let i = 0; i < 7; i++) {
      await policyFactory.create(
        {
          status: i === 6 ? PolicyStatus.EXPIRED : PolicyStatus.COLLECTING_INFO,
          updatedAt: new Date(2026, 0, i + 1),
        },
        { transient: { createdById: user.id, packageId: pkg.id } },
      );
    }

    const result = await caller.dashboard.getRecentPolicies();

    expect(result.policies.length).toBe(5);
    const updatedDays = result.policies.map((p) => new Date(p.updatedAt).getDate());
    expect(updatedDays).toEqual([6, 5, 4, 3, 2]);
  });

  test('BROKER scoped via managedById — sees self-created and admin-assigned', async () => {
    const admin = await adminUser.create();
    const pkg = await packageFactory.create();

    // Other admin's policy, no broker assignment — broker should NOT see.
    await policyFactory.create(
      { status: PolicyStatus.COLLECTING_INFO },
      { transient: { createdById: admin.id, packageId: pkg.id, managedById: null } },
    );

    const { caller, user: broker } = await createBrokerCaller();
    // Self-created (auto-assigned).
    await policyFactory.create(
      { status: PolicyStatus.COLLECTING_INFO },
      { transient: { createdById: broker.id, packageId: pkg.id, managedById: broker.id } },
    );
    // Admin-created and assigned to this broker.
    await policyFactory.create(
      { status: PolicyStatus.PENDING_APPROVAL },
      { transient: { createdById: admin.id, packageId: pkg.id, managedById: broker.id } },
    );

    const result = await caller.dashboard.getRecentPolicies();
    expect(result.policies.length).toBe(2);
  });

  test('respects custom limit', async () => {
    const { caller, user } = await createAdminCaller();
    const pkg = await packageFactory.create();
    for (let i = 0; i < 5; i++) {
      await policyFactory.create(
        { status: PolicyStatus.COLLECTING_INFO },
        { transient: { createdById: user.id, packageId: pkg.id } },
      );
    }
    const result = await caller.dashboard.getRecentPolicies({ limit: 3 });
    expect(result.policies.length).toBe(3);
  });

  test('empty result when broker has no policies', async () => {
    const { caller } = await createBrokerCaller();
    const result = await caller.dashboard.getRecentPolicies();
    expect(result.policies).toEqual([]);
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.dashboard.getRecentPolicies(),
    });
  });
});
