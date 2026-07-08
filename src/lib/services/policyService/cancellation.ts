import prisma from '@/lib/prisma';
import { PolicyCancellationReason } from '@/prisma/generated/prisma-client/enums';
import { logPolicyActivity } from './index';
import { sendPolicyCancellationNotification } from '@/lib/services/notificationService';

export interface CancelPolicyInput {
  policyId: string;
  reason: PolicyCancellationReason;
  comment: string;
  cancelledById: string;
}

export interface CancelPolicyResult {
  success: boolean;
  error?: string;
}

/**
 * Cancel a policy with a reason and comment.
 * Updates policy status, logs activity, and sends notifications.
 *
 * Note: Intentionally bypasses PolicyWorkflowService.transitionPolicyStatus()
 * because cancellation is allowed from any non-CANCELLED state and requires
 * additional fields (reason, comment, cancelledById) beyond a standard transition.
 */
export async function cancelPolicy(
  input: CancelPolicyInput
): Promise<CancelPolicyResult> {
  const policy = await prisma.policy.findUnique({
    where: { id: input.policyId },
    select: { id: true, status: true, policyNumber: true },
  });

  if (!policy) {
    return { success: false, error: 'Policy not found' };
  }

  // Cannot cancel already cancelled policies
  if (policy.status === 'CANCELLED') {
    return {
      success: false,
      error: 'Cannot cancel a policy that is already cancelled',
    };
  }

  // Update policy with cancellation details
  await prisma.policy.update({
    where: { id: input.policyId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: input.reason,
      cancellationComment: input.comment,
      cancelledById: input.cancelledById,
      activatedAt: null,
      expiresAt: null,
    },
  });

  // Kill every actor portal token (#165): a cancelled protección must not
  // remain reachable through emailed links — tenant, all landlords, joint
  // obligors and avals lose access immediately (the receipt portal rides
  // the tenant token, so it dies with it).
  const expireNow = { accessToken: null, tokenExpiry: null };
  await prisma.$transaction([
    prisma.tenant.updateMany({ where: { policyId: input.policyId }, data: expireNow }),
    prisma.landlord.updateMany({ where: { policyId: input.policyId }, data: expireNow }),
    prisma.jointObligor.updateMany({ where: { policyId: input.policyId }, data: expireNow }),
    prisma.aval.updateMany({ where: { policyId: input.policyId }, data: expireNow }),
  ]);

  // Log activity
  await logPolicyActivity({
    policyId: input.policyId,
    action: 'policy_cancelled',
    description: `Policy cancelled: ${input.reason}`,
    details: { reason: input.reason, comment: input.comment },
    performedById: input.cancelledById,
    performedByType: 'user',
  });

  // Notify admins
  await sendPolicyCancellationNotification(input.policyId);

  return { success: true };
}
