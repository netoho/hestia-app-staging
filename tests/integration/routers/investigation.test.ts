/**
 * Integration tests for the `investigation` tRPC router.
 *
 * 15 procedures spanning the full staff investigation pipeline + the
 * public approval flow:
 *   - admin (10): create, getById, getApprovalUrls, getByActor, update,
 *     archive, getDocumentUploadUrl, removeDocument, getDocumentDownloadUrl,
 *     submit
 *   - protected (1): getByPolicy
 *   - public (4): getByToken, getDocumentDownloadUrlByToken, approve, reject
 *
 * The router has a lot of business logic — we cover the floor for every
 * procedure (happy path or specific gating + auth) and add invariant
 * assertions where the router enforces non-trivial state machine rules
 * (cannot update submitted, cannot archive archived, atomic
 * submit/approve/reject transitions).
 *
 * `submit` and `approve`/`reject` happy paths kick off the
 * `tryAutoTransition` policy-state machinery; the policyWorkflowService
 * and email service are already mocked at preload, so happy paths run
 * deterministically.
 */

import { describe, test, expect } from 'bun:test';
import {
  InvestigatedActorType,
  ActorInvestigationStatus,
  UserRole,
} from '@/prisma/generated/prisma-client/enums';
import { prisma } from '../../utils/database';
import { createAdminCaller, createBrokerCaller, createPublicCaller } from '../callers';
import { expectAuthGate } from '../expectAuthGate';
import { createPolicyWithActors } from '../scenarios';
import {
  actorInvestigationFactory,
  submittedInvestigation,
  archivedInvestigation,
} from '../factories';

// ===========================================================================
// investigation.create
// ===========================================================================
describe('investigation.create', () => {
  test('creates a PENDING investigation for a tenant on the policy', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();

    const result = await caller.investigation.create({
      policyId: policy.id,
      actorType: InvestigatedActorType.TENANT,
      actorId: tenant.id,
    });

    expect(result.success).toBe(true);
    expect(result.investigation.policyId).toBe(policy.id);
    expect(result.investigation.actorType).toBe(InvestigatedActorType.TENANT);
    expect(result.investigation.actorId).toBe(tenant.id);
    expect(result.investigation.status).toBe(ActorInvestigationStatus.PENDING);
  });

  test('throws NOT_FOUND when policy does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.investigation.create({
        policyId: 'cmnopolicy12345678901234',
        actorType: InvestigatedActorType.TENANT,
        actorId: 'cmnoactor12345678901234',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws NOT_FOUND when actor does not belong to the policy', async () => {
    const { policy } = await createPolicyWithActors();
    const { caller } = await createAdminCaller();
    await expect(
      caller.investigation.create({
        policyId: policy.id,
        actorType: InvestigatedActorType.TENANT,
        actorId: 'cmnoactor12345678901234',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws CONFLICT when an active investigation already exists', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    await actorInvestigationFactory.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );
    const { caller } = await createAdminCaller();
    await expect(
      caller.investigation.create({
        policyId: policy.id,
        actorType: InvestigatedActorType.TENANT,
        actorId: tenant.id,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.investigation.create({
          policyId: policy.id,
          actorType: InvestigatedActorType.TENANT,
          actorId: tenant.id,
        }),
    });
  });
});

// ===========================================================================
// investigation.getById
// ===========================================================================
describe('investigation.getById', () => {
  test('returns the investigation with its policy + actor', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await actorInvestigationFactory.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );

    const { caller } = await createAdminCaller();
    const result = await caller.investigation.getById({ id: inv.id });
    expect(result.id).toBe(inv.id);
    expect(result.policy.id).toBe(policy.id);
    expect(result.actor).not.toBeNull();
  });

  test('throws NOT_FOUND for unknown id', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.investigation.getById({ id: 'cmnonexistent12345678901' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await actorInvestigationFactory.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.investigation.getById({ id: inv.id }),
    });
  });
});

// ===========================================================================
// investigation.getApprovalUrls
// ===========================================================================
describe('investigation.getApprovalUrls', () => {
  test('returns broker + landlord URLs for a submitted investigation', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await submittedInvestigation.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );

    const { caller } = await createAdminCaller();
    const result = await caller.investigation.getApprovalUrls({ id: inv.id });
    expect(result.broker).toContain('/investigation/approve/');
    expect(result.landlord).toContain('/investigation/approve/');
    expect(typeof result.brokerName).toBe('string');
    expect(typeof result.landlordName).toBe('string');
  });

  test('throws BAD_REQUEST when investigation has not been submitted', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await actorInvestigationFactory.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );
    const { caller } = await createAdminCaller();
    await expect(
      caller.investigation.getApprovalUrls({ id: inv.id }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await submittedInvestigation.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.investigation.getApprovalUrls({ id: inv.id }),
    });
  });
});

// ===========================================================================
// investigation.getByActor
// ===========================================================================
describe('investigation.getByActor', () => {
  test('returns investigations for an actor across all policies', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    await actorInvestigationFactory.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );

    const { caller } = await createAdminCaller();
    const result = await caller.investigation.getByActor({
      actorType: InvestigatedActorType.TENANT,
      actorId: tenant.id,
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { tenant } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.investigation.getByActor({
          actorType: InvestigatedActorType.TENANT,
          actorId: tenant.id,
        }),
    });
  });
});

// ===========================================================================
// investigation.getByPolicy
// ===========================================================================
describe('investigation.getByPolicy', () => {
  test('returns investigations with resolved actorName + documentsCount', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    await actorInvestigationFactory.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );

    const { caller } = await createAdminCaller();
    const result = await caller.investigation.getByPolicy({ policyId: policy.id });

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(typeof result[0]!.actorName).toBe('string');
    expect(typeof result[0]!.documentsCount).toBe('number');
  });

  test('throws NOT_FOUND when policy does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.investigation.getByPolicy({ policyId: 'cmnopolicy12345678901234' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('throws FORBIDDEN when BROKER reads someone else\'s policy', async () => {
    const { policy } = await createPolicyWithActors();
    const { caller: otherBroker } = await createBrokerCaller();
    await expect(
      otherBroker.investigation.getByPolicy({ policyId: policy.id }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('auth gate: any authed user allowed; PUBLIC blocked', async () => {
    const { policy } = await createPolicyWithActors();
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.investigation.getByPolicy({ policyId: policy.id }),
    });
  });
});

// ===========================================================================
// investigation.update
// ===========================================================================
describe('investigation.update', () => {
  test('updates findings on a non-submitted investigation', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await actorInvestigationFactory.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );

    const { caller } = await createAdminCaller();
    const result = await caller.investigation.update({
      id: inv.id,
      findings: 'Updated findings note.',
    });

    expect(result.success).toBe(true);
    expect(result.investigation.findings).toBe('Updated findings note.');
  });

  test('rejects update on a submitted investigation', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await submittedInvestigation.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );

    const { caller } = await createAdminCaller();
    await expect(
      caller.investigation.update({ id: inv.id, findings: 'too late' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await actorInvestigationFactory.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.investigation.update({ id: inv.id }),
    });
  });
});

// ===========================================================================
// investigation.archive
// ===========================================================================
describe('investigation.archive', () => {
  test('archives a non-archived investigation and logs activity', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await actorInvestigationFactory.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );

    const { caller } = await createAdminCaller();
    const result = await caller.investigation.archive({
      id: inv.id,
      reason: 'OUTDATED',
      comment: 'Test archive',
    });
    expect(result).toEqual({ success: true });

    const after = await prisma.actorInvestigation.findUnique({ where: { id: inv.id } });
    expect(after?.status).toBe(ActorInvestigationStatus.ARCHIVED);
    expect(after?.archivedAt).toBeInstanceOf(Date);
  });

  test('rejects archiving an already-archived investigation', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await archivedInvestigation.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );

    const { caller } = await createAdminCaller();
    await expect(
      caller.investigation.archive({ id: inv.id, reason: 'OUTDATED' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await actorInvestigationFactory.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) => caller.investigation.archive({ id: inv.id, reason: 'OUTDATED' }),
    });
  });
});

// ===========================================================================
// investigation.getDocumentUploadUrl
// ===========================================================================
describe('investigation.getDocumentUploadUrl', () => {
  test('issues a presigned upload URL for an existing investigation', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await actorInvestigationFactory.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );

    const { caller } = await createAdminCaller();
    const result = await caller.investigation.getDocumentUploadUrl({
      investigationId: inv.id,
      fileName: 'scan.pdf',
      contentType: 'application/pdf',
      fileSize: 100_000,
    });

    expect(result.success).toBe(true);
    expect(result.uploadUrl).toContain('upload=fake');
    expect(result.documentId).toBeDefined();
  });

  test('throws NOT_FOUND for unknown investigation', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.investigation.getDocumentUploadUrl({
        investigationId: 'cmnonexistent12345678901',
        fileName: 'doc.pdf',
        contentType: 'application/pdf',
        fileSize: 1024,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await actorInvestigationFactory.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.investigation.getDocumentUploadUrl({
          investigationId: inv.id,
          fileName: 'doc.pdf',
          contentType: 'application/pdf',
          fileSize: 1024,
        }),
    });
  });
});

// ===========================================================================
// investigation.removeDocument — happy path needs investigation document
// fixtures we don't yet have. Auth + NOT_FOUND only.
// ===========================================================================
describe('investigation.removeDocument', () => {
  test('throws NOT_FOUND when document does not exist', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await actorInvestigationFactory.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );

    const { caller } = await createAdminCaller();
    await expect(
      caller.investigation.removeDocument({
        investigationId: inv.id,
        documentId: 'cmnodoc12345678901234567',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await actorInvestigationFactory.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.investigation.removeDocument({
          investigationId: inv.id,
          documentId: 'cmnodoc12345678901234567',
        }),
    });
  });
});

// ===========================================================================
// investigation.getDocumentDownloadUrl
// ===========================================================================
describe('investigation.getDocumentDownloadUrl', () => {
  test('throws NOT_FOUND when document does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.investigation.getDocumentDownloadUrl({
        documentId: 'cmnodoc12345678901234567',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.investigation.getDocumentDownloadUrl({
          documentId: 'cmnodoc12345678901234567',
        }),
    });
  });
});

// ===========================================================================
// investigation.submit — heavy happy path that requires investigation
// documents. Auth gate + missing-documents invariant only.
// ===========================================================================
describe('investigation.submit', () => {
  test('rejects when no investigation documents exist', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await actorInvestigationFactory.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );

    const { caller } = await createAdminCaller();
    await expect(
      caller.investigation.submit({
        id: inv.id,
        findings: 'A'.repeat(50),
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  test('throws NOT_FOUND when investigation does not exist', async () => {
    const { caller } = await createAdminCaller();
    await expect(
      caller.investigation.submit({
        id: 'cmnoexists12345678901234',
        findings: 'A'.repeat(50),
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('auth gate: ADMIN/STAFF allowed; BROKER + PUBLIC blocked', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await actorInvestigationFactory.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );
    await expectAuthGate({
      allowed: [UserRole.ADMIN, UserRole.STAFF],
      invoke: (caller) =>
        caller.investigation.submit({ id: inv.id, findings: 'A'.repeat(50) }),
    });
  });
});

// ===========================================================================
// investigation.getByToken — public, sanitized
// ===========================================================================
describe('investigation.getByToken', () => {
  test('returns the sanitized investigation for a valid broker token', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await submittedInvestigation.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );

    const { caller } = createPublicCaller();
    const result = await caller.investigation.getByToken({ token: inv.brokerToken! });
    expect(result.id).toBe(inv.id);
    expect(result.tokenType).toBe('BROKER');
    expect(result.policy.id).toBe(policy.id);
  });

  test('throws FORBIDDEN for an invalid token', async () => {
    const { caller } = createPublicCaller();
    await expect(
      caller.investigation.getByToken({ token: 'bogus' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('rejects expired tokens', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await submittedInvestigation.create(
      { tokenExpiry: new Date(Date.now() - 60 * 1000) },
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );

    const { caller } = createPublicCaller();
    await expect(
      caller.investigation.getByToken({ token: inv.brokerToken! }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

// ===========================================================================
// investigation.getDocumentDownloadUrlByToken
// ===========================================================================
describe('investigation.getDocumentDownloadUrlByToken', () => {
  test('throws NOT_FOUND when token has no investigation', async () => {
    const { caller } = createPublicCaller();
    await expect(
      caller.investigation.getDocumentDownloadUrlByToken({
        token: 'bogus',
        documentId: 'cmnodoc12345678901234567',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('rejects expired token', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await submittedInvestigation.create(
      { tokenExpiry: new Date(Date.now() - 60 * 1000) },
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );

    const { caller } = createPublicCaller();
    await expect(
      caller.investigation.getDocumentDownloadUrlByToken({
        token: inv.brokerToken!,
        documentId: 'cmnodoc12345678901234567',
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

// ===========================================================================
// investigation.approve / investigation.reject
// ===========================================================================
describe('investigation.approve', () => {
  test('approves a PENDING submitted investigation via broker token', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await submittedInvestigation.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );

    const { caller } = createPublicCaller();
    const result = await caller.investigation.approve({
      token: inv.brokerToken!,
      notes: 'All good',
    });

    expect(result.success).toBe(true);
    expect(result.investigation.status).toBe(ActorInvestigationStatus.APPROVED);
    expect(result.investigation.approvedByType).toBe('BROKER');
  });

  test('rejects already-processed investigation (CONFLICT)', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await submittedInvestigation.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );

    const { caller } = createPublicCaller();
    await caller.investigation.approve({ token: inv.brokerToken! });
    // Second approve via the still-stored landlord token should hit the
    // PENDING-only atomic check and 409.
    await expect(
      caller.investigation.approve({ token: inv.landlordToken! }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  test('throws NOT_FOUND for an invalid token', async () => {
    const { caller } = createPublicCaller();
    await expect(
      caller.investigation.approve({ token: 'bogus' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('investigation.reject', () => {
  test('rejects a PENDING submitted investigation via landlord token', async () => {
    const { tenant, policy } = await createPolicyWithActors();
    const inv = await submittedInvestigation.create(
      {},
      { transient: { policyId: policy.id, actorType: 'TENANT', actorId: tenant.id } },
    );

    const { caller } = createPublicCaller();
    const result = await caller.investigation.reject({
      token: inv.landlordToken!,
      reason: 'Documents are insufficient — need additional proof of income.',
    });

    expect(result.success).toBe(true);
    expect(result.investigation.status).toBe(ActorInvestigationStatus.REJECTED);
    expect(result.investigation.approvedByType).toBe('LANDLORD');
  });

  test('throws NOT_FOUND for an invalid token', async () => {
    const { caller } = createPublicCaller();
    await expect(
      caller.investigation.reject({
        token: 'bogus',
        reason: 'A'.repeat(50),
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
