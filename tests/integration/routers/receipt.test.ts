/**
 * Integration tests for the `receipt` tRPC router.
 *
 * 12 procedures covering the monthly tenant-receipt portal:
 *   - publicProcedure (token or session): requestMagicLink, getPortalData,
 *     getUploadUrl, confirmUpload, markNotApplicable, undoNotApplicable,
 *     deleteReceipt, getDownloadUrl
 *   - adminProcedure: listByPolicy, getConfig, updateConfig, getDownloadUrlAdmin
 *
 * Receipts only surface for ACTIVE policies. Tests bump policy.status to
 * ACTIVE before exercising the portal flow.
 */

import { describe, test, expect } from 'bun:test';
import {
  ReceiptType,
  ReceiptStatus,
  DocumentUploadStatus,
  PolicyStatus,
  UserRole,
} from '@/prisma/generated/prisma-client/enums';
import { prisma } from '../../utils/database';
import { createAdminCaller, createPublicCaller } from '../callers';
import { expectAuthGate } from '../expectAuthGate';
import { createPolicyWithActors } from '../scenarios';
import {
  tenantReceiptFactory,
  uploadedReceipt,
  notApplicableReceipt,
  pendingUploadReceipt,
} from '../factories';
import { mintTenantToken } from '../actorTokens';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function activePolicyWithTenant() {
  const ctx = await createPolicyWithActors({ status: PolicyStatus.ACTIVE });
  return ctx;
}

// ===========================================================================
// receipt.requestMagicLink — publicProcedure
// ===========================================================================
describe('receipt.requestMagicLink', () => {
  test('returns success even when the email has no matching tenant', async () => {
    const { caller } = createPublicCaller();
    const result = await caller.receipt.requestMagicLink({ email: 'nobody@hestia.test' });
    expect(result).toEqual({ success: true });
  });

  test('returns success and mints a token when an active-policy tenant matches', async () => {
    const { tenant } = await activePolicyWithTenant();
    const { caller } = createPublicCaller();

    const result = await caller.receipt.requestMagicLink({ email: tenant.email });
    expect(result).toEqual({ success: true });

    // Token was generated and persisted on the tenant row.
    const refreshed = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    expect(refreshed?.accessToken).not.toBeNull();
    expect(refreshed?.tokenExpiry).toBeInstanceOf(Date);
  });

  test('auth gate: every scope allowed (public)', async () => {
    await expectAuthGate({
      allowed: ['PUBLIC', UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER],
      invoke: (caller) =>
        caller.receipt.requestMagicLink({
          email: `gate-${Math.random().toString(36).slice(2, 6)}@hestia.test`,
        }),
    });
  });
});

// ===========================================================================
// receipt.getPortalData — publicProcedure (token-validated)
// ===========================================================================
describe('receipt.getPortalData', () => {
  test('returns the portal data for a tenant with an active policy', async () => {
    const { tenant } = await activePolicyWithTenant();
    const { token, caller } = await mintTenantToken(tenant.id);

    const result = await caller.receipt.getPortalData({ token });
    expect(result.tenantEmail).toBe(tenant.email);
    expect(result.policies.length).toBe(1);
    expect(result.policies[0]!.tenantId).toBe(tenant.id);
  });

  test('throws UNAUTHORIZED for an invalid token', async () => {
    const { caller } = createPublicCaller();
    await expect(
      caller.receipt.getPortalData({ token: 'does-not-exist' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

// ===========================================================================
// receipt.getUploadUrl — publicProcedure (token or session)
// ===========================================================================
describe('receipt.getUploadUrl', () => {
  test('issues a presigned upload URL for the tenant via token', async () => {
    const { tenant, policy } = await activePolicyWithTenant();
    const { token, caller } = await mintTenantToken(tenant.id);

    const result = await caller.receipt.getUploadUrl({
      token,
      policyId: policy.id,
      year: 2026,
      month: 1,
      receiptType: ReceiptType.RENT,
      fileName: 'recibo-renta.pdf',
      contentType: 'application/pdf',
      fileSize: 100_000,
    });

    expect(result.success).toBe(true);
    expect(result.uploadUrl).toContain('upload=fake');
    expect(result.s3Key).toContain('receipts/');
    expect(result.expiresIn).toBe(60);

    const persisted = await prisma.tenantReceipt.findUnique({ where: { id: result.receiptId } });
    expect(persisted).not.toBeNull();
    expect(persisted!.uploadStatus).toBe(DocumentUploadStatus.PENDING);
  });

  test('rejects OTHER receipt type without otherCategory', async () => {
    const { tenant, policy } = await activePolicyWithTenant();
    const { token, caller } = await mintTenantToken(tenant.id);

    await expect(
      caller.receipt.getUploadUrl({
        token,
        policyId: policy.id,
        year: 2026,
        month: 1,
        receiptType: ReceiptType.OTHER,
        fileName: 'misc.pdf',
        contentType: 'application/pdf',
        fileSize: 1024,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  test('rejects files exceeding the size cap', async () => {
    const { tenant, policy } = await activePolicyWithTenant();
    const { token, caller } = await mintTenantToken(tenant.id);

    await expect(
      caller.receipt.getUploadUrl({
        token,
        policyId: policy.id,
        year: 2026,
        month: 1,
        receiptType: ReceiptType.RENT,
        fileName: 'huge.pdf',
        contentType: 'application/pdf',
        fileSize: 50 * 1024 * 1024,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

// ===========================================================================
// receipt.confirmUpload — publicProcedure (token or session)
// ===========================================================================
describe('receipt.confirmUpload', () => {
  test('marks a pending upload as COMPLETE via tenant token', async () => {
    const { tenant, policy } = await activePolicyWithTenant();
    const { token, caller } = await mintTenantToken(tenant.id);

    const receipt = await pendingUploadReceipt.create(
      {},
      { transient: { tenantId: tenant.id, policyId: policy.id } },
    );

    const result = await caller.receipt.confirmUpload({ token, receiptId: receipt.id });
    expect(result.success).toBe(true);
    expect(result.receipt.uploadStatus).toBe(DocumentUploadStatus.COMPLETE);
    expect(result.receipt.uploadedAt).toBeInstanceOf(Date);
  });

  test('throws UNAUTHORIZED for an invalid token', async () => {
    const { tenant, policy } = await activePolicyWithTenant();
    const receipt = await pendingUploadReceipt.create(
      {},
      { transient: { tenantId: tenant.id, policyId: policy.id } },
    );

    const { caller } = createPublicCaller();
    await expect(
      caller.receipt.confirmUpload({ token: 'nope', receiptId: receipt.id }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

// ===========================================================================
// receipt.markNotApplicable — publicProcedure (token or session)
// ===========================================================================
describe('receipt.markNotApplicable', () => {
  test('marks a receipt as NOT_APPLICABLE via tenant token', async () => {
    const { tenant, policy } = await activePolicyWithTenant();
    const { token, caller } = await mintTenantToken(tenant.id);

    const result = await caller.receipt.markNotApplicable({
      token,
      policyId: policy.id,
      year: 2026,
      month: 2,
      receiptType: ReceiptType.WATER,
      note: 'Incluido en renta',
    });

    expect(result.success).toBe(true);
    expect(result.receipt.status).toBe(ReceiptStatus.NOT_APPLICABLE);
    expect(result.receipt.notApplicableNote).toBe('Incluido en renta');
  });

  test('rejects OTHER receipt type', async () => {
    const { tenant, policy } = await activePolicyWithTenant();
    const { token, caller } = await mintTenantToken(tenant.id);

    await expect(
      caller.receipt.markNotApplicable({
        token,
        policyId: policy.id,
        year: 2026,
        month: 2,
        receiptType: ReceiptType.OTHER,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

// ===========================================================================
// receipt.undoNotApplicable — publicProcedure (token or session)
// ===========================================================================
describe('receipt.undoNotApplicable', () => {
  test('deletes a NOT_APPLICABLE receipt via tenant token', async () => {
    const { tenant, policy } = await activePolicyWithTenant();
    const receipt = await notApplicableReceipt.create(
      { receiptType: ReceiptType.WATER },
      { transient: { tenantId: tenant.id, policyId: policy.id } },
    );

    const { token, caller } = await mintTenantToken(tenant.id);
    const result = await caller.receipt.undoNotApplicable({ token, receiptId: receipt.id });
    expect(result).toEqual({ success: true });

    const after = await prisma.tenantReceipt.findUnique({ where: { id: receipt.id } });
    expect(after).toBeNull();
  });

  test('rejects when receipt is not in NOT_APPLICABLE status', async () => {
    const { tenant, policy } = await activePolicyWithTenant();
    const receipt = await uploadedReceipt.create(
      {},
      { transient: { tenantId: tenant.id, policyId: policy.id } },
    );

    const { token, caller } = await mintTenantToken(tenant.id);
    await expect(
      caller.receipt.undoNotApplicable({ token, receiptId: receipt.id }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

// ===========================================================================
// receipt.deleteReceipt — publicProcedure (token or session)
// ===========================================================================
describe('receipt.deleteReceipt', () => {
  test('deletes an uploaded receipt via tenant token', async () => {
    const { tenant, policy } = await activePolicyWithTenant();
    const receipt = await uploadedReceipt.create(
      {},
      { transient: { tenantId: tenant.id, policyId: policy.id } },
    );

    const { token, caller } = await mintTenantToken(tenant.id);
    const result = await caller.receipt.deleteReceipt({ token, receiptId: receipt.id });
    expect(result).toEqual({ success: true });

    const after = await prisma.tenantReceipt.findUnique({ where: { id: receipt.id } });
    expect(after).toBeNull();
  });

  test('throws NOT_FOUND for a missing receipt', async () => {
    const { tenant } = await activePolicyWithTenant();
    const { token, caller } = await mintTenantToken(tenant.id);
    await expect(
      caller.receipt.deleteReceipt({ token, receiptId: 'nope' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ===========================================================================
// receipt.getDownloadUrl — publicProcedure (token or session)
// ===========================================================================
describe('receipt.getDownloadUrl', () => {
  test('returns a presigned download URL for an uploaded receipt', async () => {
    const { tenant, policy } = await activePolicyWithTenant();
    const receipt = await uploadedReceipt.create(
      {},
      { transient: { tenantId: tenant.id, policyId: policy.id } },
    );

    const { token, caller } = await mintTenantToken(tenant.id);
    const result = await caller.receipt.getDownloadUrl({ token, receiptId: receipt.id });
    expect(result.success).toBe(true);
    expect(result.downloadUrl).toContain('download=fake');
    expect(result.expiresIn).toBe(300);
  });

  test('rejects when the file is not yet COMPLETE', async () => {
    const { tenant, policy } = await activePolicyWithTenant();
    const receipt = await pendingUploadReceipt.create(
      {},
      { transient: { tenantId: tenant.id, policyId: policy.id } },
    );

    const { token, caller } = await mintTenantToken(tenant.id);
    await expect(
      caller.receipt.getDownloadUrl({ token, receiptId: receipt.id }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

// ===========================================================================
// receipt.listByPolicy — adminProcedure
// ===========================================================================
describe('receipt.listByPolicy', () => {
  test('lists receipts for an ACTIVE policy', async () => {
    const { tenant, policy } = await activePolicyWithTenant();
    await uploadedReceipt.create({}, { transient: { tenantId: tenant.id, policyId: policy.id } });
    await uploadedReceipt.create(
      { receiptType: ReceiptType.ELECTRICITY, month: 2 },
      { transient: { tenantId: tenant.id, policyId: policy.id } },
    );

    const { caller } = await createAdminCaller();
    const result = await caller.receipt.listByPolicy({ policyId: policy.id });

    expect(result.policyNumber).toBe(policy.policyNumber);
    expect(result.receipts.length).toBeGreaterThanOrEqual(2);
    expect(result.tenant?.id).toBe(tenant.id);
  });

  test('rejects policies that are not ACTIVE or EXPIRED', async () => {
    const { policy } = await createPolicyWithActors({ status: PolicyStatus.COLLECTING_INFO });
    const { caller } = await createAdminCaller();
    await expect(
      caller.receipt.listByPolicy({ policyId: policy.id }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  test('throws NOT_FOUND when policy does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.receipt.listByPolicy({ policyId: 'nope' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { policy } = await activePolicyWithTenant();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.receipt.listByPolicy({ policyId: policy.id }),
    });
  });
});

// ===========================================================================
// receipt.getConfig — adminProcedure
// ===========================================================================
describe('receipt.getConfig', () => {
  test('returns config history + computed defaults for an existing policy', async () => {
    const { policy } = await activePolicyWithTenant();
    const { caller } = await createAdminCaller();

    const result = await caller.receipt.getConfig({ policyId: policy.id });
    expect(Array.isArray(result.currentTypes)).toBe(true);
    expect(Array.isArray(result.computedDefaults)).toBe(true);
    expect(result.history).toEqual([]);
  });

  test('throws NOT_FOUND when policy does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.receipt.getConfig({ policyId: 'nope' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { policy } = await activePolicyWithTenant();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.receipt.getConfig({ policyId: policy.id }),
    });
  });
});

// ===========================================================================
// receipt.updateConfig — adminProcedure
// ===========================================================================
describe('receipt.updateConfig', () => {
  test('upserts a ReceiptConfig for the current month', async () => {
    const { policy } = await activePolicyWithTenant();
    const { caller, user } = await createAdminCaller();

    const result = await caller.receipt.updateConfig({
      policyId: policy.id,
      receiptTypes: [ReceiptType.RENT, ReceiptType.WATER, ReceiptType.ELECTRICITY],
      notes: 'Test config',
    });

    expect(result.success).toBe(true);
    expect(result.config.policyId).toBe(policy.id);
    expect(result.config.createdById).toBe(user.id);
    expect(result.config.receiptTypes).toContain(ReceiptType.RENT);
  });

  test('rejects payloads that omit RENT', async () => {
    const { policy } = await activePolicyWithTenant();
    const { caller } = await createAdminCaller();

    await expect(
      caller.receipt.updateConfig({
        policyId: policy.id,
        receiptTypes: [ReceiptType.WATER],
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  test('throws NOT_FOUND when policy does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.receipt.updateConfig({
        policyId: 'nope',
        receiptTypes: [ReceiptType.RENT],
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { policy } = await activePolicyWithTenant();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.receipt.updateConfig({
          policyId: policy.id,
          receiptTypes: [ReceiptType.RENT, ReceiptType.WATER],
        }),
    });
  });
});

// ===========================================================================
// receipt.getDownloadUrlAdmin — adminProcedure (legacy)
// ===========================================================================
describe('receipt.getDownloadUrlAdmin', () => {
  test('returns a download URL for an uploaded receipt', async () => {
    const { tenant, policy } = await activePolicyWithTenant();
    const receipt = await uploadedReceipt.create(
      {},
      { transient: { tenantId: tenant.id, policyId: policy.id } },
    );

    const { caller } = await createAdminCaller();
    const result = await caller.receipt.getDownloadUrlAdmin({ receiptId: receipt.id });
    expect(result.success).toBe(true);
    expect(result.downloadUrl).toContain('download=fake');
  });

  test('throws NOT_FOUND when receipt does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.receipt.getDownloadUrlAdmin({ receiptId: 'nope' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { tenant, policy } = await activePolicyWithTenant();
    const receipt = await uploadedReceipt.create(
      {},
      { transient: { tenantId: tenant.id, policyId: policy.id } },
    );
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.receipt.getDownloadUrlAdmin({ receiptId: receipt.id }),
    });
  });
});
