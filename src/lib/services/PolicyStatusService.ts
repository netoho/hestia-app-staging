import prisma from '@/lib/prisma';
import { PolicyStatus } from "@/prisma/generated/prisma-client/enums";
import { transitionPolicyStatus, checkAllInvestigationsApproved } from './policyWorkflowService';
import { logPolicyActivity } from './policyService';
import { ServiceError, ErrorCode } from './types/errors';

/**
 * Service for managing policy status transitions
 */
export class PolicyStatusService {
  /**
   * Check if all actors have completed their information
   */
  async checkAllActorsComplete(policyId: string): Promise<{
    allComplete: boolean;
    pendingActors: string[];
    completedActors: string[];
  }> {
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        tenant: { select: { id: true, informationComplete: true, firstName: true, companyName: true } },
        landlords: { select: { id: true, informationComplete: true, firstName: true, companyName: true } },
        jointObligors: { select: { id: true, informationComplete: true, firstName: true, companyName: true } },
        avals: { select: { id: true, informationComplete: true, firstName: true, companyName: true } }
      }
    });

    if (!policy) {
      throw new ServiceError(ErrorCode.POLICY_NOT_FOUND, 'Policy not found', 404, { policyId });
    }

    const pendingActors: string[] = [];
    const completedActors: string[] = [];

    if (policy.tenant) {
      const name = policy.tenant.companyName || policy.tenant.firstName || 'Tenant';
      if (policy.tenant.informationComplete) {
        completedActors.push(`Tenant: ${name}`);
      } else {
        pendingActors.push(`Tenant: ${name}`);
      }
    }

    for (const landlord of policy.landlords) {
      const name = landlord.companyName || landlord.firstName || 'Landlord';
      if (landlord.informationComplete) {
        completedActors.push(`Landlord: ${name}`);
      } else {
        pendingActors.push(`Landlord: ${name}`);
      }
    }

    for (const jo of policy.jointObligors) {
      const name = jo.companyName || jo.firstName || 'Joint Obligor';
      if (jo.informationComplete) {
        completedActors.push(`Joint Obligor: ${name}`);
      } else {
        pendingActors.push(`Joint Obligor: ${name}`);
      }
    }

    for (const aval of policy.avals) {
      const name = aval.companyName || aval.firstName || 'Aval';
      if (aval.informationComplete) {
        completedActors.push(`Aval: ${name}`);
      } else {
        pendingActors.push(`Aval: ${name}`);
      }
    }

    return {
      allComplete: pendingActors.length === 0,
      pendingActors,
      completedActors
    };
  }

  /**
   * Check if all investigations are approved and auto-transition to PENDING_APPROVAL
   */
  async checkAndTransition(
    policyId: string,
    performedBy: string = 'system',
    performedById?: string
  ): Promise<boolean> {
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      select: { status: true }
    });

    if (!policy) {
      throw new ServiceError(ErrorCode.POLICY_NOT_FOUND, 'Policy not found', 404, { policyId });
    }

    // Only transition if currently in COLLECTING_INFO
    if (policy.status !== PolicyStatus.COLLECTING_INFO) {
      return false;
    }

    const allApproved = await checkAllInvestigationsApproved(policyId);
    if (!allApproved) {
      return false;
    }

    await transitionPolicyStatus(
      policyId,
      PolicyStatus.PENDING_APPROVAL,
      performedBy,
      'All actor investigations approved',
    );

    await logPolicyActivity({
      policyId,
      action: 'status_transition',
      description: 'Policy transitioned to pending approval',
      details: {
        fromStatus: PolicyStatus.COLLECTING_INFO,
        toStatus: PolicyStatus.PENDING_APPROVAL,
        reason: 'All actor investigations approved',
      },
      performedByType: performedBy,
      performedById,
    });

    return true;
  }

  /**
   * Get policy progress information
   */
  async getPolicyProgress(policyId: string) {
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        tenant: true,
        landlords: true,
        jointObligors: true,
        avals: true,
      }
    });

    if (!policy) {
      throw new ServiceError(ErrorCode.POLICY_NOT_FOUND, 'Policy not found', 404, { policyId });
    }

    const actorStatus = await this.checkAllActorsComplete(policyId);
    const allInvestigationsApproved = await checkAllInvestigationsApproved(policyId);

    return {
      status: policy.status,
      actorsComplete: actorStatus.allComplete,
      pendingActors: actorStatus.pendingActors,
      completedActors: actorStatus.completedActors,
      allInvestigationsApproved,
      progress: {
        collectingInfo: actorStatus.allComplete ? 100 :
          Math.round((actorStatus.completedActors.length /
          (actorStatus.completedActors.length + actorStatus.pendingActors.length)) * 100),
      }
    };
  }

  /**
   * Force status transition (admin only)
   */
  async forceTransition(
    policyId: string,
    newStatus: PolicyStatus,
    reason: string,
    performedById: string
  ): Promise<void> {
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      select: { status: true }
    });

    if (!policy) {
      throw new ServiceError(ErrorCode.POLICY_NOT_FOUND, 'Policy not found', 404, { policyId });
    }

    await transitionPolicyStatus(
      policyId,
      newStatus,
      'admin',
      reason
    );

    await logPolicyActivity({
      policyId,
      action: 'force_status_transition',
      description: `Status manually changed to ${newStatus}`,
      details: {
        fromStatus: policy.status,
        toStatus: newStatus,
        reason,
        forcedBy: 'admin'
      },
      performedByType: 'admin',
      performedById
    });
  }
}

// Export singleton instance
export const policyStatusService = new PolicyStatusService();
