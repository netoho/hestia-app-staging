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

  // Cannot cancel already cancelled or expired policies
  if (policy.status === 'CANCELLED' || policy.status === 'EXPIRED') {
    return {
      success: false,
      error: `Cannot cancel a policy with status ${policy.status}`,
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
    },
  });

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
