import prisma from '@/lib/prisma';
import { TenantType, PolicyStatus } from '@/prisma/generated/prisma-client/enums';
import { renewToken } from '@/lib/services/actorTokenService';
import { logPolicyActivity } from './index';
import {
  sendTenantReplacementNotification,
  sendIncompleteActorInfoNotification,
} from '@/lib/services/notificationService';
import {
  archiveAndCleanupTenant,
  archiveAndCleanupJointObligor,
  archiveAndCleanupAval,
} from './actorArchive';
import { TENANT_REPLACEMENT_RESET } from './copyLists';

export { TENANT_REPLACEMENT_RESET, TENANT_REPLACEMENT_INPUT_FIELDS } from './copyLists';

// Statuses that allow tenant replacement
export const REPLACEABLE_STATUSES: PolicyStatus[] = [
  'COLLECTING_INFO',
  'PENDING_APPROVAL',
];

export interface ReplaceTenantInput {
  policyId: string;
  replacementReason: string;
  newTenant: {
    tenantType: TenantType;
    email: string;
    phone: string;
    firstName?: string;
    companyName?: string;
  };
  replaceGuarantors: boolean;
  performedById: string;
}

export interface ReplaceTenantResult {
  success: boolean;
  error?: string;
}

/**
 * Replace tenant (and optionally guarantors) on a policy.
 * Archives old actor data to history tables, resets actor records,
 * and sends notifications.
 */
export async function replaceTenantOnPolicy(
  input: ReplaceTenantInput
): Promise<ReplaceTenantResult> {
  // The archive helper refetches each actor in full (row + relations) inside
  // the transaction; here we only need ids plus the tenant name fields used
  // for payment stamping and the activity log.
  const policy = await prisma.policy.findUnique({
    where: { id: input.policyId },
    select: {
      id: true,
      status: true,
      policyNumber: true,
      guarantorType: true,
      managedById: true,
      tenant: {
        select: {
          id: true,
          tenantType: true,
          firstName: true,
          paternalLastName: true,
          companyName: true,
          email: true,
        },
      },
      jointObligors: { select: { id: true } },
      avals: { select: { id: true } },
    },
  });

  if (!policy) {
    return { success: false, error: 'Policy not found' };
  }

  // Check if policy status allows replacement
  if (!REPLACEABLE_STATUSES.includes(policy.status)) {
    return {
      success: false,
      error: `Cannot replace tenant on policy with status ${policy.status}`,
    };
  }

  if (!policy.tenant) {
    return { success: false, error: 'No tenant found to replace' };
  }

  const currentTenant = policy.tenant;

  const archiveMeta = {
    policyId: input.policyId,
    replacedById: input.performedById,
    replacementReason: input.replacementReason,
  };

  // Use transaction for atomicity
  await prisma.$transaction(async (tx) => {
    // 1. Archive current tenant (summary + full snapshot) and clean up its
    //    documents/references/validations/investigations/addresses.
    await archiveAndCleanupTenant(tx, currentTenant.id, archiveMeta);

    // 2. Reset tenant record with new data. TENANT_REPLACEMENT_RESET carries
    //    the blank slate for every other column (drift-tested).
    await tx.tenant.update({
      where: { id: currentTenant.id },
      data: {
        ...TENANT_REPLACEMENT_RESET,
        tenantType: input.newTenant.tenantType,
        email: input.newTenant.email,
        phone: input.newTenant.phone,
        firstName: input.newTenant.firstName || null,
        companyName:
          input.newTenant.tenantType === 'COMPANY'
            ? input.newTenant.companyName
            : null,
      },
    });

    // 3. If replaceGuarantors, archive (summary + snapshot) and delete all guarantors
    if (input.replaceGuarantors) {
      for (const jo of policy.jointObligors) {
        await archiveAndCleanupJointObligor(tx, jo.id, archiveMeta);
      }
      await tx.jointObligor.deleteMany({
        where: { policyId: input.policyId },
      });

      for (const aval of policy.avals) {
        await archiveAndCleanupAval(tx, aval.id, archiveMeta);
      }
      await tx.aval.deleteMany({
        where: { policyId: input.policyId },
      });

      // Reset guarantorType to NONE so user can choose new type
      await tx.policy.update({
        where: { id: input.policyId },
        data: { guarantorType: 'NONE' },
      });
    }

    // 4. Handle TENANT payments
    // Get tenant name for historical payments
    const tenantName = currentTenant.tenantType === 'COMPANY'
      ? currentTenant.companyName || 'Empresa'
      : `${currentTenant.firstName || ''} ${currentTenant.paternalLastName || ''}`.trim() || 'Inquilino';

    // Mark COMPLETED tenant payments with tenant name (for historical display)
    await tx.payment.updateMany({
      where: {
        policyId: input.policyId,
        paidBy: 'TENANT',
        status: 'COMPLETED',
        paidByTenantName: null,
      },
      data: { paidByTenantName: tenantName },
    });

    // Cancel ALL non-completed tenant payments
    await tx.payment.updateMany({
      where: {
        policyId: input.policyId,
        paidBy: 'TENANT',
        status: { in: ['PENDING', 'PROCESSING', 'PENDING_VERIFICATION'] },
      },
      data: { status: 'CANCELLED' },
    });

    // Revert policy status to COLLECTING_INFO if past that (e.g., PENDING_APPROVAL)
    if (policy.status !== 'COLLECTING_INFO') {
      await tx.policy.update({
        where: { id: input.policyId },
        data: {
          status: 'COLLECTING_INFO',
          submittedAt: null,
          activatedAt: null,
          expiresAt: null,
        },
      });
    }
  });

  // Regenerate access token for tenant
  await renewToken('tenant', currentTenant.id);

  // Log activity
  await logPolicyActivity({
    policyId: input.policyId,
    action: 'tenant_replaced',
    description: `Tenant replaced${input.replaceGuarantors ? ' (including guarantors)' : ''}: ${input.replacementReason}`,
    details: {
      previousTenantEmail: currentTenant.email,
      newTenantEmail: input.newTenant.email,
      replaceGuarantors: input.replaceGuarantors,
      reason: input.replacementReason,
    },
    performedById: input.performedById,
    performedByType: 'user',
  });

  // Send notification to manager and admins
  await sendTenantReplacementNotification(input.policyId, policy.managedById);

  // Send access link email to the new tenant
  await sendIncompleteActorInfoNotification({
    policyId: input.policyId,
    actors: ['tenant'],
    resend: false,
    initiatorName: 'Sistema',
    initiatorId: input.performedById,
    ipAddress: 'system',
  });

  return { success: true };
}
