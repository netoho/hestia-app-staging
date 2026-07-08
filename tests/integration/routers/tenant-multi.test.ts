/**
 * Integration tests for the multi-tenant membership + gates surface (S5b #169).
 *
 * A Policy now has 1..N tenants (Policy.tenants[]). This suite covers the new
 * tenant-membership procedures and the gate/link behaviors that must fan out
 * across every tenant:
 *
 *   - actor.addTenant / actor.removeTenant (tenant.router.ts) — mirror the
 *     landlord addCoOwner/deleteCoOwner block in actor.test.ts
 *   - checkPolicyActorsComplete — ALL tenants must be complete
 *   - checkAllInvestigationsApproved — one APPROVED investigation PER tenant
 *   - policy.replaceTenant — targets a specific tenant row by tenantId
 *   - policy.getShareLinks — one link per tenant
 *
 * Style mirrors actor.test.ts / policy.test.ts: real Postgres, fishery
 * factories, expectAuthGate for the auth matrices.
 */

import { describe, test, expect } from 'bun:test';
import {
  PolicyStatus,
  TenantType,
  InvestigatedActorType,
  UserRole,
} from '@/prisma/generated/prisma-client/enums';
import { prisma } from '../../utils/database';
import { createAdminCaller, createPublicCaller } from '../callers';
import { expectAuthGate } from '../expectAuthGate';
import { createPolicyWithActors } from '../scenarios';
import {
  tenantFactory,
  tenantReceiptFactory,
  approvedInvestigation,
} from '../factories';
import { actorTokenService } from '@/lib/services/actorTokenService';
import { checkAllInvestigationsApproved } from '@/lib/services/policyWorkflowService';

// ===========================================================================
// actor.addTenant — protectedProcedure (S5b #169; mirrors landlord addCoOwner)
// ===========================================================================
describe('actor.addTenant (tenant)', () => {
  test('creates an empty INDIVIDUAL co-tenant and logs tenant_added on COLLECTING_INFO', async () => {
    const { policy } = await createPolicyWithActors(); // COLLECTING_INFO, 1 tenant
    const { caller } = await createAdminCaller();

    const result = await caller.actor.addTenant({ policyId: policy.id });
    expect(result.id).toBeDefined();
    expect(result.tenantType).toBe(TenantType.INDIVIDUAL);
    expect(result.email).toBe('');

    const created = await prisma.tenant.findUnique({ where: { id: result.id } });
    expect(created).toMatchObject({
      policyId: policy.id,
      tenantType: TenantType.INDIVIDUAL,
      email: '',
      phone: '',
    });

    // The policy now has 2 tenants (the seed one + the added one).
    const count = await prisma.tenant.count({ where: { policyId: policy.id } });
    expect(count).toBe(2);

    const activity = await prisma.policyActivity.findFirst({
      where: { policyId: policy.id, action: 'tenant_added' },
    });
    expect(activity).not.toBeNull();
  });

  test('rejects adding a tenant once the protección is ACTIVE', async () => {
    const { policy } = await createPolicyWithActors({ status: PolicyStatus.ACTIVE });
    const { caller } = await createAdminCaller();

    await expect(caller.actor.addTenant({ policyId: policy.id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  test('throws NOT_FOUND for an unknown policy', async () => {
    const { caller } = await createAdminCaller();
    await expect(caller.actor.addTenant({ policyId: 'nope' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  test('auth gate: any authed role allowed; PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.actor.addTenant({ policyId: policy.id }),
    });
  });
});

// ===========================================================================
// actor.removeTenant — protectedProcedure (S5b #169)
// Archives to TenantHistory + re-stamps receipts before deleting the row.
// ===========================================================================
describe('actor.removeTenant (tenant)', () => {
  test('removes a co-tenant, archives it, re-stamps its receipts, logs tenant_removed', async () => {
    const { policy, tenant: survivor } = await createPolicyWithActors();
    // Second tenant (the one we remove).
    const removed = await tenantFactory.create(
      { firstName: 'Beto', paternalLastName: 'Saliente' },
      { transient: { policyId: policy.id } },
    );
    // A receipt uploaded under the removed tenant must survive by re-stamping
    // to a surviving co-tenant (receipts are policy-scoped).
    const receipt = await tenantReceiptFactory.create(
      {},
      { transient: { tenantId: removed.id, policyId: policy.id } },
    );

    const { caller } = await createAdminCaller();
    const result = await caller.actor.removeTenant({ tenantId: removed.id, reason: 'duplicate' });
    expect(result).toEqual({ success: true });

    // Row is gone.
    expect(await prisma.tenant.findUnique({ where: { id: removed.id } })).toBeNull();
    // Survivor untouched.
    expect(await prisma.tenant.findUnique({ where: { id: survivor.id } })).not.toBeNull();

    // TenantHistory snapshot exists for the removed tenant.
    const history = await prisma.tenantHistory.findFirst({
      where: { policyId: policy.id },
    });
    expect(history).not.toBeNull();
    expect(history?.snapshot).toBeTruthy();

    // Receipt re-stamped to the surviving co-tenant.
    const restamped = await prisma.tenantReceipt.findUnique({ where: { id: receipt.id } });
    expect(restamped).not.toBeNull();
    expect(restamped?.tenantId).toBe(survivor.id);

    // Activity trail names the removal.
    const activity = await prisma.policyActivity.findFirst({
      where: { policyId: policy.id, action: 'tenant_removed' },
    });
    expect(activity).not.toBeNull();
    expect(activity?.description).toContain('Beto');
  });

  test('refuses to remove the last remaining tenant', async () => {
    const { tenant } = await createPolicyWithActors(); // exactly 1 tenant
    const { caller } = await createAdminCaller();

    await expect(caller.actor.removeTenant({ tenantId: tenant.id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    // Still there.
    expect(await prisma.tenant.findUnique({ where: { id: tenant.id } })).not.toBeNull();
  });

  test('rejects removing a tenant once the protección is ACTIVE', async () => {
    const { policy } = await createPolicyWithActors({ status: PolicyStatus.ACTIVE });
    const removable = await tenantFactory.create({}, { transient: { policyId: policy.id } });
    const { caller } = await createAdminCaller();

    await expect(caller.actor.removeTenant({ tenantId: removable.id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    expect(await prisma.tenant.findUnique({ where: { id: removable.id } })).not.toBeNull();
  });

  test('throws NOT_FOUND for an unknown tenant', async () => {
    const { caller } = await createAdminCaller();
    await expect(caller.actor.removeTenant({ tenantId: 'nope' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  test('auth gate: any authed role allowed; PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    const removable = await tenantFactory.create({}, { transient: { policyId: policy.id } });
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) => caller.actor.removeTenant({ tenantId: removable.id }),
    });
  });
});

// ===========================================================================
// checkPolicyActorsComplete — EVERY tenant must be complete (S5b #169)
// ===========================================================================
describe('multi-tenant completeness gate', () => {
  test('an incomplete co-tenant blocks completion even when the first is complete', async () => {
    const { policy, landlord, tenant } = await createPolicyWithActors();
    // Make everything else complete so only the tenants axis is under test.
    await prisma.landlord.update({
      where: { id: landlord.id },
      data: { informationComplete: true },
    });
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { informationComplete: true },
    });
    // Second tenant, incomplete.
    const coTenant = await tenantFactory.create(
      { informationComplete: false },
      { transient: { policyId: policy.id } },
    );

    const blocked = await actorTokenService.checkPolicyActorsComplete(policy.id);
    expect(blocked.tenants).toBe(false);
    expect(blocked.allComplete).toBe(false);
    expect(blocked.details.tenantsComplete?.[tenant.id]).toBe(true);
    expect(blocked.details.tenantsComplete?.[coTenant.id]).toBe(false);

    // Completing the co-tenant unblocks the tenants axis.
    await prisma.tenant.update({
      where: { id: coTenant.id },
      data: { informationComplete: true },
    });
    const unblocked = await actorTokenService.checkPolicyActorsComplete(policy.id);
    expect(unblocked.tenants).toBe(true);
    expect(unblocked.allComplete).toBe(true);
    expect(unblocked.details.tenantsComplete?.[coTenant.id]).toBe(true);
  });
});

// ===========================================================================
// checkAllInvestigationsApproved — one APPROVED investigation PER tenant
// ===========================================================================
describe('multi-tenant investigation gate', () => {
  test('requires an APPROVED investigation for every tenant', async () => {
    const { policy, tenant } = await createPolicyWithActors(); // guarantorType NONE
    const coTenant = await tenantFactory.create({}, { transient: { policyId: policy.id } });

    // Only the first tenant has an APPROVED investigation → gate is closed.
    await approvedInvestigation.create(
      {},
      {
        transient: {
          policyId: policy.id,
          actorType: InvestigatedActorType.TENANT,
          actorId: tenant.id,
        },
      },
    );
    expect(await checkAllInvestigationsApproved(policy.id)).toBe(false);

    // Approving the second tenant opens the gate.
    await approvedInvestigation.create(
      {},
      {
        transient: {
          policyId: policy.id,
          actorType: InvestigatedActorType.TENANT,
          actorId: coTenant.id,
        },
      },
    );
    expect(await checkAllInvestigationsApproved(policy.id)).toBe(true);
  });
});

// ===========================================================================
// policy.replaceTenant — targets a specific tenant row by tenantId (S5b #169)
// ===========================================================================
describe('policy.replaceTenant (multi-tenant)', () => {
  test('replacing tenant B leaves tenant A untouched and archives B', async () => {
    const { policy, tenant: tenantA } = await createPolicyWithActors({
      status: PolicyStatus.COLLECTING_INFO,
    });
    const beforeA = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantA.id } });

    const tenantB = await tenantFactory.create(
      {
        firstName: 'Bianca',
        email: 'bianca.original@hestia.test',
        informationComplete: true,
      },
      { transient: { policyId: policy.id } },
    );

    const { caller } = await createAdminCaller();
    const result = await caller.policy.replaceTenant({
      policyId: policy.id,
      tenantId: tenantB.id,
      replacementReason: 'moved out',
      newTenant: {
        tenantType: TenantType.INDIVIDUAL,
        email: 'nueva@hestia.test',
        phone: '5550001111',
        firstName: 'Nueva',
      },
      replaceGuarantors: false,
    });
    expect(result).toEqual({ success: true });

    // Tenant A is completely untouched (same id, email, name).
    const afterA = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantA.id } });
    expect(afterA.email).toBe(beforeA.email);
    expect(afterA.firstName).toBe(beforeA.firstName);
    expect(afterA.informationComplete).toBe(beforeA.informationComplete);

    // Tenant B row was reset in place with the new data.
    const afterB = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantB.id } });
    expect(afterB.email).toBe('nueva@hestia.test');
    expect(afterB.firstName).toBe('Nueva');
    expect(afterB.informationComplete).toBe(false);

    // Exactly one history row was written — for B, not A.
    const histories = await prisma.tenantHistory.findMany({ where: { policyId: policy.id } });
    expect(histories).toHaveLength(1);
    expect(histories[0].email).toBe('bianca.original@hestia.test');

    // Policy still has exactly 2 tenants (replacement resets in place).
    expect(await prisma.tenant.count({ where: { policyId: policy.id } })).toBe(2);
  });
});

// ===========================================================================
// policy.getShareLinks — one row per tenant (S5b #169)
// ===========================================================================
describe('policy.getShareLinks (multi-tenant)', () => {
  test('returns a link for every tenant, not just one', async () => {
    const { policy, tenant } = await createPolicyWithActors();
    // First tenant token.
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        accessToken: 'tok-tenant-a',
        tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    // Second tenant with its own token.
    await tenantFactory.create(
      {
        accessToken: 'tok-tenant-b',
        tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      { transient: { policyId: policy.id } },
    );

    const { caller } = await createAdminCaller();
    const result = await caller.policy.getShareLinks({ policyId: policy.id });

    const tenantLinks = result.shareLinks.filter((l) => l.actorType === 'tenant');
    expect(tenantLinks).toHaveLength(2);
    const urls = tenantLinks.map((l) => l.url);
    expect(urls.some((u) => u.includes('tok-tenant-a'))).toBe(true);
    expect(urls.some((u) => u.includes('tok-tenant-b'))).toBe(true);
  });
});
